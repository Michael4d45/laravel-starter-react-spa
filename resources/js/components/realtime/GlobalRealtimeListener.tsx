import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { echo } from '@/lib/echo';
import toast from 'react-hot-toast';

interface RealtimeMessage {
    message: string;
    timestamp: string;
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
        console.log(`[Realtime] Subscribing to private channel: ${channelName}`);
        const channel = echo.private(channelName);

        const handleEvent = (data: RealtimeMessage) => {
            console.log('[Realtime] Event received:', data);
            toast.success(data.message, {
                duration: 5000,
                icon: '🔔',
            });
        };

        // Listen for both with and without dot to be safe
        channel.listen('.TestRealtimeEvent', handleEvent)
               .listen('TestRealtimeEvent', handleEvent);

        return () => {
            console.log(`[Realtime] Unsubscribing from channel: ${channelName}`);
            echo.leave(channelName);
        };
    }, [user]);

    return null;
}
