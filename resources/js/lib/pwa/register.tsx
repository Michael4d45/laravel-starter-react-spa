import toast from 'react-hot-toast';
import { Workbox } from 'workbox-window';

export const registerSW = () => {
    if ('serviceWorker' in navigator) {
        const wb = new Workbox('/sw.js');

        wb.addEventListener('installed', (event) => {
            if (event.isUpdate) {
                toast.success('New content available! Refresh to update.', { duration: 5000 });
            } else {
                toast.success('App is now available offline!', { duration: 3000 });
            }
        });

        wb.addEventListener('activated', (event) => {
            if (!event.isUpdate) {
                console.log('Service worker activated for the first time!');
            }
        });

        wb.addEventListener('waiting', () => {
            toast(
                (t) => (
                    <div className="flex items-center gap-2">
                        <span>New version available!</span>
                        <button
                            className="rounded-md bg-blue-500 px-3 py-1 text-white"
                            onClick={() => {
                                wb.messageSkipWaiting();
                                toast.dismiss(t.id);
                            }}
                        >
                            Update
                        </button>
                    </div>
                ),
                { duration: Infinity },
            );
        });

        wb.register();

        window.addEventListener('online', () => toast.success('You are back online!', { duration: 2000 }));
        window.addEventListener('offline', () => toast.error('You are now offline.', { duration: 3000 }));
    }
};
