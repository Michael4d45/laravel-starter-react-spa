import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { authManager } from './auth';

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
    const token = authManager.getToken();

    return new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
                Accept: 'application/json',
            },
        },
    });
};

// Initialize Echo
export const echo = initEcho();

// Expose to window for debugging and legacy support
window.Echo = echo;

/**
 * Update the Authorization header used for private channels
 */
export const updateEchoToken = (token: string | null) => {
    if (window.Echo) {
        (window.Echo.options as { auth: { headers: { Authorization: string } } }).auth.headers.Authorization = token
            ? `Bearer ${token}`
            : '';
    }
};
