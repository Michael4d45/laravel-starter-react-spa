import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router';
import Header from './components/Header';
import { ModalRenderer } from './components/ModalRenderer';
import { OfflineBanner } from './components/offline/OfflineBanner';
import { GlobalRealtimeListener } from './components/realtime/GlobalRealtimeListener';
import Sidebar from './components/Sidebar';
import { AuthGuard } from './features/auth/AuthContext';
import { useSidebarMode } from './hooks/useSidebarMode';
import './lib/echo';
import { cn } from './lib/utils';

export function App() {
    const { isCompact } = useSidebarMode();

    return (
        <div className="bg-primary flex h-dvh flex-col">
            <OfflineBanner />
            <GlobalRealtimeListener />

            {/* Desktop sidebar */}
            <Sidebar />

            {/* Mobile header */}
            <div className="md:hidden">
                <Header />
            </div>

            {/* Main content */}
            <main
                className={cn(
                    'min-h-0 flex-1',
                    isCompact ? 'md:pl-20' : 'md:pl-64',
                )}
            >
                <AuthGuard>
                    <Outlet />
                </AuthGuard>
            </main>

            <ModalRenderer />
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
        </div>
    );
}
