import { AuthContextState } from '@/contexts/AuthContext';
import { echoManager } from '@/lib/echoManager';
import { Schema } from 'effect';
import { useEffect, useState } from 'react';

export function useNotificationsChannel<A, R>(
    authState: AuthContextState,
    channelName: string,
    schema: Schema.Schema<A, R>,
    debugContext: string,
) {
    const [messages, setMessages] = useState<A[]>([]);

    useEffect(() => {
        if (
            !authState.hasFetchedUser ||
            !authState.isAuthenticated ||
            !channelName
        ) {
            return;
        }

        console.info(
            `[${debugContext}][useNotificationsChannel] Subscribing to ${channelName}`,
        );
        const callback = (data: unknown) => {
            const result = Schema.decodeUnknownEither(schema)(data);
            if (result._tag === 'Right') {
                console.log(
                    `[${debugContext}][useNotificationsChannel] Decoded: `,
                    result.right,
                );
                setMessages((prev) => [...prev, result.right]);
            } else {
                console.warn(
                    `[${debugContext}][useNotificationsChannel] Failed to decode message:`,
                    result.left,
                );
            }
        };

        echoManager.subscribeNotifications(channelName, callback);

        return () => {
            console.info(
                `[${debugContext}][useNotificationsChannel] Unsubscribing from ${channelName}`,
            );
            echoManager.unsubscribeNotifications(channelName, callback);
        };
    }, [authState.hasFetchedUser, authState.isAuthenticated, channelName]);

    const clearMessages = () => {
        setMessages([]);
    };

    return { messages, clearMessages };
}
