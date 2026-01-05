import { Outlet } from 'react-router-dom';
import { OfflineBanner } from './components/offline/OfflineBanner';
import { Toaster } from 'react-hot-toast';

export function App() {
    return (
        <div className="min-h-screen bg-gray-50">
            <OfflineBanner />
            <main className="container mx-auto px-4 py-8">
                <Outlet />
            </main>
            <Toaster position="top-right" />
        </div>
    );
}
