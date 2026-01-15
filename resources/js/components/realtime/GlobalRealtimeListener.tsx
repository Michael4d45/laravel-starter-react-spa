import { useAuth } from '@/contexts/AuthContext';
import {
    setRealtimeUser,
    subscribeRealtimeMessages,
} from '@/lib/realtimeClient';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Global component that listens for real-time notifications
 * and displays them as toasts.
 */
export function GlobalRealtimeListener() {
    const { user } = useAuth();
    const lastCountRef = useRef(0);

    useEffect(() => {
        setRealtimeUser(user?.id ?? null);
        return () => setRealtimeUser(null);
    }, [user]);

    useEffect(() => {
        const unsubscribe = subscribeRealtimeMessages((messages) => {
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
        });

        return unsubscribe;
    }, []);

    return null;
}
