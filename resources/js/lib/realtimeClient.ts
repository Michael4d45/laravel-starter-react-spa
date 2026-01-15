import {
    getRealtimeConnectionSnapshot,
    subscribeRealtimeConnection,
} from '@/lib/realtimeConnectionState';
import {
    RealtimeMessageData,
    RealtimeMessageDataSchema,
} from '@/schemas/App/Data/Events';
import { Schema } from 'effect';
import { echo } from './echo';

type MessageListener = (messages: RealtimeMessageData[]) => void;

export interface PresenceUser {
    id: string;
    name: string;
}

type PresenceListener = (users: PresenceUser[]) => void;

type ConnectionListener = () => void;

let currentUserId: string | null = null;
let channelName: string | null = null;
let channel: any = null;
let listenerAttached = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
let connectionUnsubscribe: (() => void) | null = null;

let presenceChannelName: string | null = null;
let presenceChannel: any = null;
let presenceListenerAttached = false;
let presenceFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let presenceConnectionUnsubscribe: (() => void) | null = null;

let messages: RealtimeMessageData[] = [];
const messageListeners = new Set<MessageListener>();

let presenceUsers: PresenceUser[] = [];
const presenceListeners = new Set<PresenceListener>();

function notifyMessages(): void {
    const snapshot = [...messages];
    messageListeners.forEach((listener) => listener(snapshot));
}

function notifyPresence(): void {
    const snapshot = [...presenceUsers];
    presenceListeners.forEach((listener) => listener(snapshot));
}

function upsertPresenceUser(user: PresenceUser): void {
    const existingIndex = presenceUsers.findIndex(
        (existing) => existing.id === user.id,
    );
    if (existingIndex >= 0) {
        presenceUsers = presenceUsers.map((existing) =>
            existing.id === user.id ? user : existing,
        );
        return;
    }
    presenceUsers = [...presenceUsers, user];
}

function decodeRealtimeMessage(data: unknown): RealtimeMessageData | null {
    const result = Schema.decodeUnknownEither(RealtimeMessageDataSchema)(data);
    if (result._tag === 'Right') {
        return result.right;
    }
    console.warn('[RealtimeClient] Failed to decode message:', result.left);
    return null;
}

function clearSubscription(): void {
    if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
    }

    if (connectionUnsubscribe) {
        connectionUnsubscribe();
        connectionUnsubscribe = null;
    }

    if (presenceFallbackTimer) {
        clearTimeout(presenceFallbackTimer);
        presenceFallbackTimer = null;
    }

    if (presenceConnectionUnsubscribe) {
        presenceConnectionUnsubscribe();
        presenceConnectionUnsubscribe = null;
    }

    if (channel && listenerAttached) {
        channel.stopListening('.TestRealtimeEvent');
        listenerAttached = false;
    }

    if (channelName) {
        echo.leave(channelName);
    }

    channel = null;

    if (presenceChannelName) {
        echo.leave(presenceChannelName);
    }

    presenceChannel = null;
    presenceListenerAttached = false;
    presenceUsers = [];
    notifyPresence();
}

function performSubscription(): void {
    if (!channelName || (channel && listenerAttached)) {
        return;
    }

    console.info(`[RealtimeClient] Subscribing to ${channelName}`);
    channel = echo.private(channelName);

    channel.listen('.TestRealtimeEvent', (data: unknown) => {
        const message = decodeRealtimeMessage(data);
        if (!message) {
            return;
        }

        messages = [...messages, message];
        notifyMessages();
    });

    listenerAttached = true;
}

function performPresenceSubscription(): void {
    if (!presenceChannelName || (presenceChannel && presenceListenerAttached)) {
        return;
    }

    console.info(
        `[RealtimeClient] Joining presence channel ${presenceChannelName}`,
    );
    presenceChannel = echo.join(presenceChannelName);

    presenceChannel.here((users: PresenceUser[]) => {
        presenceUsers = Array.isArray(users) ? [...users] : [];
        notifyPresence();
    });

    presenceChannel.joining((user: PresenceUser) => {
        if (!user) {
            return;
        }
        upsertPresenceUser(user);
        notifyPresence();
    });

    presenceChannel.leaving((user: PresenceUser) => {
        if (!user) {
            return;
        }
        presenceUsers = presenceUsers.filter((u) => u.id !== user.id);
        notifyPresence();
    });

    presenceListenerAttached = true;
}

function ensureSubscription(): void {
    if (!channelName) {
        return;
    }

    const snapshot = getRealtimeConnectionSnapshot();
    const pusher = echo.connector?.pusher;

    if (pusher && snapshot.isConnected && document.readyState === 'complete') {
        performSubscription();
        return;
    }

    if (!connectionUnsubscribe) {
        const handleConnectionChange: ConnectionListener = () => {
            const updated = getRealtimeConnectionSnapshot();
            if (updated.isConnected) {
                performSubscription();
            }
        };
        connectionUnsubscribe = subscribeRealtimeConnection(
            handleConnectionChange,
        );
    }

    if (!fallbackTimer) {
        fallbackTimer = setTimeout(() => {
            performSubscription();
        }, 5000);
    }
}

function ensurePresenceSubscription(): void {
    if (!presenceChannelName) {
        return;
    }

    const snapshot = getRealtimeConnectionSnapshot();
    const pusher = echo.connector?.pusher;

    if (pusher && snapshot.isConnected && document.readyState === 'complete') {
        performPresenceSubscription();
        return;
    }

    if (!presenceConnectionUnsubscribe) {
        const handleConnectionChange: ConnectionListener = () => {
            const updated = getRealtimeConnectionSnapshot();
            if (updated.isConnected) {
                performPresenceSubscription();
            }
        };
        presenceConnectionUnsubscribe = subscribeRealtimeConnection(
            handleConnectionChange,
        );
    }

    if (!presenceFallbackTimer) {
        presenceFallbackTimer = setTimeout(() => {
            performPresenceSubscription();
        }, 5000);
    }
}

export function setRealtimeUser(userId: string | null): void {
    if (currentUserId === userId) {
        return;
    }

    clearSubscription();
    currentUserId = userId;

    if (!userId) {
        channelName = null;
        messages = [];
        notifyMessages();
        presenceChannelName = null;
        presenceUsers = [];
        notifyPresence();
        return;
    }

    channelName = `App.Models.User.${userId}`;
    presenceChannelName = 'online';
    messages = [];
    notifyMessages();
    ensureSubscription();
    ensurePresenceSubscription();
}

export function subscribeRealtimeMessages(
    listener: MessageListener,
): () => void {
    messageListeners.add(listener);
    listener([...messages]);
    return () => {
        messageListeners.delete(listener);
    };
}

export function clearRealtimeMessages(): void {
    messages = [];
    notifyMessages();
}

export function subscribePresenceUsers(listener: PresenceListener): () => void {
    presenceListeners.add(listener);
    listener([...presenceUsers]);
    return () => {
        presenceListeners.delete(listener);
    };
}

export function clearPresenceUsers(): void {
    presenceUsers = [];
    notifyPresence();
}
