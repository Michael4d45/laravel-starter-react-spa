import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { ApiClient } from './apiClient';

// Echo instance type for Reverb broadcaster
type ReverbEcho = InstanceType<typeof Echo<'reverb'>>;

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: ReverbEcho;
    }
}

window.Pusher = Pusher;

/**
 * Initialize Laravel Echo with Reverb configuration
 */
export const initEcho = (): ReverbEcho => {
    return new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel, options) => {
            return {
                authorize: async (
                    socketId: string,
                    callback: (error: Error | null, data?: any) => void,
                ) => {
                    try {
                        const result = await ApiClient.authenticateBroadcasting(
                            socketId,
                            channel.name,
                        );
                        if (result._tag === 'Success') {
                            callback(null, result.data);
                        } else {
                            callback(
                                new Error(
                                    result._tag === 'ValidationError'
                                        ? 'Validation failed'
                                        : 'Authentication failed',
                                ),
                                result,
                            );
                        }
                    } catch (error) {
                        callback(error as Error, null);
                    }
                },
            };
        },
    });
};

// Initialize Echo
export const echo = initEcho();

// Expose to window for debugging and legacy support
window.Echo = echo;
