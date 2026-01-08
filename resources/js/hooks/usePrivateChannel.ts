import { echo } from '@/lib/echo';
import { useEffect, useState, useSyncExternalStore } from 'react';

interface RealtimeMessage {
    message: string;
    timestamp: string;
}

/**
 * Hook to subscribe to pusher connection state using useSyncExternalStore
 */
function usePusherConnectionState(): boolean {
    const subscribe = (callback: () => void) => {
        const pusher = echo.connector.pusher;
        const handleStateChange = () => {
            callback();
        };
        pusher.connection.bind('state_change', handleStateChange);
        return () => {
            pusher.connection.unbind('state_change', handleStateChange);
        };
    };

    const getSnapshot = () => {
        return echo.connector.pusher.connection.state === 'connected';
    };

    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Hook to subscribe to a private channel and listen for events
 */
export function usePrivateChannel(
    channelName: string | null,
    eventName: string,
) {
    const [messages, setMessages] = useState<RealtimeMessage[]>([]);
    const pusherConnected = usePusherConnectionState();

    useEffect(() => {
        if (!channelName) {
            return;
        }

        console.log(
            `[Echo] Subscribing to ${channelName} for event ${eventName}`,
        );
        const channel = echo.private(channelName);

        // Listen for the specified event
        channel.listen(eventName, (data: RealtimeMessage) => {
            console.log(
                `[Echo] Event ${eventName} received on ${channelName}:`,
                data,
            );
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            console.log(`[Echo] Leaving channel ${channelName}`);
            echo.leave(channelName);
        };
    }, [channelName, eventName]);

    // Derive isConnected: must have a channel AND be connected to pusher
    const isConnected = Boolean(channelName) && pusherConnected;

    const clearMessages = () => setMessages([]);

    return { messages, isConnected, clearMessages };
}
