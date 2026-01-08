import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import { OfflineBanner } from './components/offline/OfflineBanner';
import { AuthGuard } from './contexts/AuthContext';

export function App() {
    return (
        <div className="bg-primary min-h-screen">
            <OfflineBanner />
            <main className="container mx-auto px-4 py-8">
                <AuthGuard>
                    <Outlet />
                </AuthGuard>
            </main>
            <Toaster position="top-right" />
        </div>
    );
}
