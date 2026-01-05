import { Button } from '@/components/ui/Button';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function ErrorPage() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                    <div className="text-center">
                        <h1 className="mb-4 text-6xl font-bold text-gray-900">{error.status}</h1>
                        <h2 className="mb-4 text-2xl font-semibold text-gray-700">{error.statusText}</h2>
                        {error.data?.message && <p className="mb-6 text-gray-600">{error.data.message}</p>}
                        <div className="space-x-4">
                            <Button onClick={() => (window.location.href = '/')}>Go Home</Button>
                            <Button variant="secondary" onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // For non-route errors (like thrown errors from loaders)
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                <div className="text-center">
                    <h1 className="mb-4 text-6xl font-bold text-gray-900">Oops!</h1>
                    <h2 className="mb-4 text-2xl font-semibold text-gray-700">Something went wrong</h2>
                    <p className="mb-6 text-gray-600">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
                    <div className="space-x-4">
                        <Button onClick={() => (window.location.href = '/')}>Go Home</Button>
                        <Button variant="secondary" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
