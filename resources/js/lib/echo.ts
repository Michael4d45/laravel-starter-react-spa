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

let echoInstance: ReverbEcho | null = null;

/**
 * Initialize Laravel Echo with Reverb configuration
 */
export const initEcho = (): ReverbEcho => {
    if (echoInstance) {
        return echoInstance;
    }

    const rawHost = String(
        import.meta.env.VITE_REVERB_HOST ?? window.location.hostname,
    );
    // Firefox often prefers IPv6 for `localhost` (i.e. ::1). Our Reverb dev
    // server is typically bound on IPv4 (0.0.0.0), so normalize `localhost`
    // to the current page hostname (127.0.0.1 in local dev).
    const wsHost = rawHost === 'localhost' ? window.location.hostname : rawHost;

    const configuredPort = Number.parseInt(
        String(import.meta.env.VITE_REVERB_PORT ?? ''),
        10,
    );
    const port = Number.isFinite(configuredPort) ? configuredPort : undefined;

    echoInstance = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost,
        wsPort: port ?? 80,
        wssPort: port ?? 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel, options) => {
            return {
                authorize: async (
                    socketId: string,
                    callback: (error: Error | null, data?: any) => void,
                ) => {
                    try {
                        console.log('calling echo auth');
                        // Backend automatically disconnects previous connections
                        // for the same user+channel when authenticating a new one
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

    // Expose to window for debugging and legacy support
    window.Echo = echoInstance;

    return echoInstance;
};

// Lazy-initialized Echo instance
export const echo = new Proxy({} as ReverbEcho, {
    get(target, prop) {
        const instance = initEcho();
        return (instance as any)[prop];
    },
});
