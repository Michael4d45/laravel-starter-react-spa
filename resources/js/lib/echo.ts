import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { ApiClient } from './apiClient';
import { authManager } from './auth';
import {
    setRealtimeConnectionState,
    type RealtimeConnectionState,
} from './realtimeConnectionState';

// Echo instance type for Reverb broadcaster
type ReverbEcho = InstanceType<typeof Echo<'reverb'>>;

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: ReverbEcho;
    }
}

window.Pusher = Pusher;

let connectTimer: ReturnType<typeof setTimeout> | null = null;
let connectLoadListener: (() => void) | null = null;
let pusherStateBound = false;
let pusherBindInterval: ReturnType<typeof setInterval> | null = null;
let connectWatchdog: ReturnType<typeof setTimeout> | null = null;

function mapPusherState(state: string | undefined): RealtimeConnectionState {
    switch (state) {
        case 'initialized':
            return 'initialized';
        case 'connecting':
            return 'connecting';
        case 'connected':
            return 'connected';
        case 'unavailable':
            return 'unavailable';
        case 'failed':
            return 'failed';
        case 'disconnected':
        default:
            return 'disconnected';
    }
}

function bindPusherConnectionState(): void {
    if (pusherStateBound) {
        return;
    }

    const pusher = echo.connector?.pusher;
    if (!pusher) {
        return;
    }

    pusherStateBound = true;
    const initialState = mapPusherState(pusher.connection.state);
    setRealtimeConnectionState(initialState);

    if (connectWatchdog && initialState !== 'connecting') {
        clearTimeout(connectWatchdog);
        connectWatchdog = null;
    }

    pusher.connection.bind('state_change', (states: any) => {
        setRealtimeConnectionState(mapPusherState(states.current));
        if (connectWatchdog && states.current !== 'connecting') {
            clearTimeout(connectWatchdog);
            connectWatchdog = null;
        }
    });

    pusher.connection.bind('connected', () => {
        setRealtimeConnectionState('connected');
        if (connectWatchdog) {
            clearTimeout(connectWatchdog);
            connectWatchdog = null;
        }
    });

    pusher.connection.bind('connecting', () => {
        setRealtimeConnectionState('connecting');
    });

    pusher.connection.bind('disconnected', () => {
        setRealtimeConnectionState('disconnected');
        if (connectWatchdog) {
            clearTimeout(connectWatchdog);
            connectWatchdog = null;
        }
    });

    pusher.connection.bind('unavailable', () => {
        setRealtimeConnectionState('unavailable');
        if (connectWatchdog) {
            clearTimeout(connectWatchdog);
            connectWatchdog = null;
        }
    });

    pusher.connection.bind('failed', () => {
        setRealtimeConnectionState('failed');
        if (connectWatchdog) {
            clearTimeout(connectWatchdog);
            connectWatchdog = null;
        }
    });

    if (pusherBindInterval) {
        window.clearInterval(pusherBindInterval);
        pusherBindInterval = null;
    }
}

function clearScheduledConnect(): void {
    if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
    }

    if (connectLoadListener) {
        window.removeEventListener('load', connectLoadListener);
        connectLoadListener = null;
    }

    if (connectWatchdog) {
        clearTimeout(connectWatchdog);
        connectWatchdog = null;
    }
}

function scheduleConnect(reason: string): void {
    const token = authManager.getToken();
    if (!token) {
        setRealtimeConnectionState('disconnected');
        return;
    }

    const pusher = echo.connector?.pusher;
    const connectionState = pusher?.connection?.state;
    if (connectionState === 'connected' || connectionState === 'connecting') {
        return;
    }

    setRealtimeConnectionState('connecting');

    clearScheduledConnect();

    connectTimer = setTimeout(() => {
        connectTimer = null;
        if (!authManager.getToken()) {
            setRealtimeConnectionState('disconnected');
            return;
        }

        const connectNow = () => {
            const currentState = echo.connector?.pusher?.connection?.state;
            if (currentState === 'connected' || currentState === 'connecting') {
                return;
            }

            console.info('[Echo] Connecting Echo', { reason });
            echo.connect();

            if (!connectWatchdog) {
                connectWatchdog = setTimeout(() => {
                    connectWatchdog = null;
                    const pusherState =
                        echo.connector?.pusher?.connection?.state;
                    const mappedState = mapPusherState(pusherState);
                    if (mappedState === 'connected') {
                        setRealtimeConnectionState('connected');
                        return;
                    }

                    if (mappedState === 'connecting') {
                        setRealtimeConnectionState('unavailable');
                        return;
                    }

                    setRealtimeConnectionState(mappedState);
                }, 8000);
            }
        };

        if (document.readyState === 'complete') {
            setTimeout(connectNow, 300);
            return;
        }

        connectLoadListener = () => {
            connectLoadListener = null;
            setTimeout(connectNow, 300);
        };

        window.addEventListener('load', connectLoadListener, { once: true });
    }, 100);
}

/**
 * Refresh broadcasting connection after auth changes
 */
export function refreshBroadcasting(): void {
    // Always disconnect first to clear any stale auth
    echo.disconnect();
    setRealtimeConnectionState('disconnected');

    scheduleConnect('refresh');
}

/**
 * Initialize Laravel Echo with Reverb configuration
 */
export const initEcho = (): ReverbEcho => {
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

    return new Echo({
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
};

// Initialize Echo
export const echo = initEcho();
bindPusherConnectionState();
if (!pusherStateBound) {
    pusherBindInterval = window.setInterval(() => {
        if (pusherStateBound) {
            if (pusherBindInterval) {
                window.clearInterval(pusherBindInterval);
                pusherBindInterval = null;
            }
            return;
        }
        bindPusherConnectionState();
    }, 250);
}

// Don't auto-connect during module evaluation; let the app boot first.
echo.disconnect();

// Initial connect for already-authenticated refreshes.
if (authManager.getToken()) {
    scheduleConnect('init');
} else {
    setRealtimeConnectionState('disconnected');
}

// Expose to window for debugging and legacy support
window.Echo = echo;
