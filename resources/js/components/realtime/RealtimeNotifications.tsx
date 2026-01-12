import { useAuth } from '@/contexts/AuthContext';
import { echo } from '@/lib/echo';
import { RealtimeMessageData } from '@/schemas/App/Data/Events';
import { Bell, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    addRealtimeMessageListener,
    clearRealtimeMessages,
} from './GlobalRealtimeListener';

export function RealtimeNotifications() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<RealtimeMessageData[]>([]);
    const [isConnected, setIsConnected] = useState(() => {
        // Initialize with current connection state
        return echo.connector.pusher.connection.state === 'connected';
    });

    // Monitor Pusher connection state
    useEffect(() => {
        const pusher = echo.connector.pusher;
        const handleStateChange = () => {
            setIsConnected(pusher.connection.state === 'connected');
        };

        pusher.connection.bind('state_change', handleStateChange);
        return () => {
            pusher.connection.unbind('state_change', handleStateChange);
        };
    }, []);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = addRealtimeMessageListener((newMessages) => {
            setMessages(newMessages);
        });

        return unsubscribe;
    }, [user]);

    const handleClearMessages = () => {
        setMessages([]);
        clearRealtimeMessages();
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
                    {isConnected ? (
                        <span
                            className="flex items-center gap-1 text-sm text-green-600"
                            data-testid="connection-status-connected"
                        >
                            <Wifi className="h-4 w-4" />
                            Connected
                        </span>
                    ) : (
                        <span
                            className="flex items-center gap-1 text-sm text-red-600"
                            data-testid="connection-status-disconnected"
                        >
                            <WifiOff className="h-4 w-4" />
                            Disconnected
                        </span>
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
