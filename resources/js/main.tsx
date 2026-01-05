import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider } from 'react-router-dom';
import { ErrorFallback } from './Errors';
import { router } from './router';
import './styles/globals.css';

// Register service worker
import { registerSW } from './lib/pwa/register';
registerSW();

const container = document.getElementById('app');
if (!container) {
    throw new Error('Root element with id "app" not found');
}

const root = createRoot(container);
root.render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <RouterProvider router={router} />
        </ErrorBoundary>
    </StrictMode>,
);
