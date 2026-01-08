import { useEffect, useState } from 'react';
import { echo } from '@/lib/echo';

interface RealtimeMessage {
    message: string;
    timestamp: string;
}

/**
 * Hook to subscribe to a private channel and listen for events
 */
export function usePrivateChannel(
    channelName: string | null,
    eventName: string,
) {
    const [messages, setMessages] = useState<RealtimeMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!channelName) {
            setIsConnected(false);
            return;
        }

        console.log(`[Echo] Subscribing to ${channelName} for event ${eventName}`);
        const channel = echo.private(channelName);

        // Listen for the specified event
        channel.listen(eventName, (data: RealtimeMessage) => {
            console.log(`[Echo] Event ${eventName} received on ${channelName}:`, data);
            setMessages((prev) => [...prev, data]);
        });

        // Track connection state
        const pusher = echo.connector.pusher;
        const handleStateChange = (states: {
            current: string;
            previous: string;
        }) => {
            console.log(`[Echo] Connection state changed: ${states.previous} -> ${states.current}`);
            setIsConnected(states.current === 'connected');
        };

        pusher.connection.bind('state_change', handleStateChange);
        setIsConnected(pusher.connection.state === 'connected');

        return () => {
            console.log(`[Echo] Leaving channel ${channelName}`);
            echo.leave(channelName);
            pusher.connection.unbind('state_change', handleStateChange);
        };
    }, [channelName, eventName]);

    const clearMessages = () => setMessages([]);

    return { messages, isConnected, clearMessages };
}
