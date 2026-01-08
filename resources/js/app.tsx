import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import { GlobalRealtimeListener } from './components/realtime/GlobalRealtimeListener';
import { OfflineBanner } from './components/offline/OfflineBanner';
import { AuthGuard } from './contexts/AuthContext';
import { useAppearance } from './hooks/useAppearance';
import './lib/echo';

export function App() {
    const { resolvedTheme } = useAppearance();

    return (
        <div className="bg-primary min-h-screen">
            <OfflineBanner />
            <GlobalRealtimeListener />
            <main className="container mx-auto px-4 py-8">
                <AuthGuard>
                    <Outlet />
                </AuthGuard>
            </main>
            <Toaster
                position="top-right"
                toastOptions={{
                    style:
                        resolvedTheme === 'dark'
                            ? {
                                  background: '#1f2937', // bg-gray-800
                                  color: '#f9fafb', // text-gray-50
                                  border: '1px solid #374151', // border-gray-700
                              }
                            : {
                                  background: '#ffffff',
                                  color: '#111827', // text-gray-900
                                  border: '1px solid #e5e7eb', // border-gray-200
                              },
                }}
            />
        </div>
    );
}
