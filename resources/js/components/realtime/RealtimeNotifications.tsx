import { useAuth } from '@/contexts/AuthContext';
import { usePusherConnectionState } from '@/hooks/usePusherConnectionState';
import { echo } from '@/lib/echo';
import {
    clearRealtimeMessages,
    subscribePresenceUsers,
    subscribeRealtimeMessages,
} from '@/lib/realtimeClient';
import { RealtimeMessageData } from '@/schemas/App/Data/Events';
import { Bell, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function RealtimeNotifications() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<RealtimeMessageData[]>([]);
    const [isPresenceConnected, setIsPresenceConnected] = useState(false);
    const { isConnecting: isPusherConnecting } = usePusherConnectionState();

    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeRealtimeMessages((newMessages) => {
            setMessages(newMessages);
        });

        return unsubscribe;
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribePresenceUsers((users) => {
            const isMember = users.some((presenceUser) => {
                return presenceUser.id === user.id;
            });
            setIsPresenceConnected(isMember);
        });

        return unsubscribe;
    }, [user]);

    const handleClearMessages = () => {
        setMessages([]);
        clearRealtimeMessages();
    };

    const handleReconnect = () => {
        console.info('[RealtimeNotifications] Manual reconnect requested');
        const pusher = echo.connector?.pusher;
        if (pusher && pusher.connection.state !== 'connected') {
            echo.connect();
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div
            className="bg-card rounded-lg p-4 shadow-md"
            data-testid="realtime-notifications"
        >
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <h3 className="font-semibold">Real-time Updates</h3>
                </div>
                <div className="flex items-center gap-2">
                    {isPresenceConnected ? (
                        <span
                            className="flex items-center gap-1 text-sm text-green-600"
                            data-testid="connection-status-connected"
                        >
                            <Wifi className="h-4 w-4" />
                            Connected
                        </span>
                    ) : isPusherConnecting ? (
                        <span
                            className="flex items-center gap-1 text-sm text-amber-600"
                            data-testid="connection-status-connecting"
                        >
                            <Wifi className="h-4 w-4" />
                            Connecting
                        </span>
                    ) : (
                        <>
                            <span
                                className="flex items-center gap-1 text-sm text-red-600"
                                data-testid="connection-status-disconnected"
                            >
                                <WifiOff className="h-4 w-4" />
                                Disconnected
                            </span>
                            <button
                                onClick={handleReconnect}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2 py-1 text-xs"
                                data-testid="reconnect-button"
                            >
                                Reconnect
                            </button>
                        </>
                    )}
                </div>
            </div>

            {messages.length > 0 ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-secondary text-sm">
                            {messages.length} message(s)
                        </span>
                        <button
                            onClick={handleClearMessages}
                            className="text-secondary hover:text-primary text-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <ul className="space-y-1" data-testid="realtime-messages">
                        {messages.map((msg, idx) => (
                            <li
                                key={idx}
                                className="bg-primary/5 rounded p-2 text-sm"
                                data-testid="realtime-message"
                            >
                                <span className="font-medium">
                                    {msg.message}
                                </span>
                                <span className="text-secondary ml-2 text-xs">
                                    {new Date(
                                        msg.timestamp,
                                    ).toLocaleTimeString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="text-secondary text-sm" data-testid="no-messages">
                    No real-time messages yet.
                </p>
            )}
        </div>
    );
}
