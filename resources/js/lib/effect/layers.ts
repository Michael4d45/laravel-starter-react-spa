import { Layer } from 'effect';
import { ApiClientLive } from '../api/client';

// Main application layer that combines all services
export const AppLayer = Layer.mergeAll(
    ApiClientLive,
    // Add more layers here as you create additional services
    // Example: AuthLive, CacheLive, NotificationLive, etc.
);

// Export the live layer for use in the application
export const AppLive = AppLayer;
