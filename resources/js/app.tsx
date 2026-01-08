import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import { OfflineBanner } from './components/offline/OfflineBanner';
import { GlobalRealtimeListener } from './components/realtime/GlobalRealtimeListener';
import Sidebar from './components/Sidebar';
import { AuthGuard } from './contexts/AuthContext';
import { useAppearance } from './hooks/useAppearance';
import './lib/echo';

export function App() {
    const { resolvedTheme } = useAppearance();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <OfflineBanner />
            <GlobalRealtimeListener />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'var(--toast-bg, #fff)',
                        color: 'var(--toast-text, #4f46e5)',
                        border: '2px solid var(--toast-border, rgba(0, 0, 0, 0.06))',
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />

            {/* Desktop sidebar */}
            <Sidebar />

            {/* Mobile header */}
            <div className="md:hidden">
                <Header />
            </div>

            {/* Main content */}
            <main className="md:pl-64">
                <div className="px-4 py-8 sm:px-6 lg:px-8">
                    <AuthGuard>
                        <Outlet />
                    </AuthGuard>
                </div>
            </main>
        </div>
    );
}
