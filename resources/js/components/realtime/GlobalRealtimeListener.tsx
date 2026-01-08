import { useAuth } from '@/contexts/AuthContext';
import { echo } from '@/lib/echo';
import {
    RealtimeMessageData,
    RealtimeMessageDataSchema,
} from '@/types/effect-schemas';
import { Schema } from 'effect';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

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

    useEffect(() => {
        if (!user) return;

        const channelName = `App.Models.User.${user.id}`;
        console.log(
            `[Realtime] Subscribing to private channel: ${channelName}`,
        );
        const channel = echo.private(channelName);

        const handleEvent = (data: unknown) => {
            console.log('[Realtime] Raw event received:', data);
            const message = decodeRealtimeMessage(data);
            if (message) {
                console.log('[Realtime] Decoded message:', message);
                toast.success(message.message, {
                    duration: 5000,
                    icon: '🔔',
                });
            }
        };

        // Listen for both with and without dot to be safe
        channel
            .listen('.TestRealtimeEvent', handleEvent)
            .listen('TestRealtimeEvent', handleEvent);

        return () => {
            console.log(
                `[Realtime] Unsubscribing from channel: ${channelName}`,
            );
            echo.leave(channelName);
        };
    }, [user]);

    return null;
}
