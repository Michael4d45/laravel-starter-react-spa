import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider } from 'react-router-dom';
import { ErrorFallback } from './Errors';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './router';
import './styles/globals.css';

// Service worker is automatically registered by VitePWA plugin

const container = document.getElementById('app');
if (!container) {
    throw new Error('Root element with id "app" not found');
}

const root = createRoot(container);
root.render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ErrorBoundary>
    </StrictMode>,
);
