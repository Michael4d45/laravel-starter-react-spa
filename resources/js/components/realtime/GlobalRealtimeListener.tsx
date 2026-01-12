import { useAuth } from '@/contexts/AuthContext';
import { echo } from '@/lib/echo';
import {
    RealtimeMessageData,
    RealtimeMessageDataSchema,
} from '@/schemas/App/Data/Events';
import { Schema } from 'effect';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

// Global state for realtime messages that other components can subscribe to
let globalRealtimeMessages: RealtimeMessageData[] = [];
const realtimeMessageListeners: Set<(messages: RealtimeMessageData[]) => void> =
    new Set();

export function addRealtimeMessageListener(
    callback: (messages: RealtimeMessageData[]) => void,
) {
    realtimeMessageListeners.add(callback);
    callback([...globalRealtimeMessages]); // Send current messages immediately
    return () => {
        realtimeMessageListeners.delete(callback);
    };
}

export function clearRealtimeMessages() {
    globalRealtimeMessages = [];
    realtimeMessageListeners.forEach((callback) =>
        callback([...globalRealtimeMessages]),
    );
}

/**
 * Decode and validate incoming realtime message using Effect Schema.
 * Returns the decoded data or null if validation fails.
 */
function decodeRealtimeMessage(data: unknown): RealtimeMessageData | null {
    const result = Schema.decodeUnknownEither(RealtimeMessageDataSchema)(data);
    if (result._tag === 'Right') {
        return result.right;
    }
    console.error('[Realtime] Failed to decode message:', result.left);
    return null;
}

/**
 * Global component that listens for real-time notifications
 * and displays them as toasts.
 */
export function GlobalRealtimeListener() {
    const { user } = useAuth();
    const channelRef = useRef<any>(null);
    const listenerAttachedRef = useRef<boolean>(false);

    useEffect(() => {
        if (!user) {
            // Clean up if no user
            if (channelRef.current && listenerAttachedRef.current) {
                console.log(`[Realtime] Cleaning up listener for user logout`);
                channelRef.current.stopListening('.TestRealtimeEvent');
                listenerAttachedRef.current = false;
            }
            channelRef.current = null;
            return;
        }

        const channelName = `App.Models.User.${user.id}`;

        // If we already have the right channel and listener attached, skip
        if (channelRef.current && listenerAttachedRef.current) {
            console.log(
                `[Realtime] Listener already active for channel: ${channelName}`,
            );
            return;
        }

        console.log(
            `[Realtime] Subscribing to private channel: ${channelName}`,
        );
        const channel = echo.private(channelName);
        channelRef.current = channel;

        const handleEvent = (data: unknown) => {
            console.log('[Realtime] Raw event received:', data);
            const message = decodeRealtimeMessage(data);
            if (message) {
                console.log('[Realtime] Decoded message:', message);
                toast.success(message.message, {
                    duration: 5000,
                    icon: '🔔',
                });

                // Add to global state and notify listeners
                globalRealtimeMessages.push(message);
                realtimeMessageListeners.forEach((callback) =>
                    callback([...globalRealtimeMessages]),
                );
            }
        };

        // Listen for broadcast events
        channel.listen('.TestRealtimeEvent', handleEvent);
        listenerAttachedRef.current = true;

        return () => {
            if (channelRef.current && listenerAttachedRef.current) {
                console.log(
                    `[Realtime] Stopping listener for event .TestRealtimeEvent on channel: ${channelName}`,
                );
                channelRef.current.stopListening('.TestRealtimeEvent');
                listenerAttachedRef.current = false;
                // Don't leave the channel entirely - other components might be using it
                channelRef.current = null;
            }
        };
    }, [user]);

    return null;
}
