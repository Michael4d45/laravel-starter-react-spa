import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsChannel } from '@/hooks/useNotificationsChannel';
import { RealtimeMessageDataSchema } from '@/schemas/App/Data/Events';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Global component that listens for real-time notifications
 * and displays them as toasts.
 */
export function GlobalRealtimeListener() {
    const { authState } = useAuth();
    const { messages } = useNotificationsChannel(
        authState,
        authState.user ? `App.Models.User.${authState.user.id}` : '',
        RealtimeMessageDataSchema,
        'GlobalRealtimeListener',
    );
    const lastCountRef = useRef(0);

    useEffect(() => {
        const lastCount = lastCountRef.current;

        if (messages.length > lastCount) {
            messages.slice(lastCount).forEach((message) => {
                toast.success(message.message, {
                    duration: 5000,
                    icon: '🔔',
                });
            });
        }

        if (messages.length < lastCount) {
            // Messages were cleared
        }

        lastCountRef.current = messages.length;
    }, [messages]);

    return null;
}
