import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function ErrorPage() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                    <div className="text-center">
                        <h1 className="text-6xl font-bold text-gray-900 mb-4">
                            {error.status}
                        </h1>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                            {error.statusText}
                        </h2>
                        {error.data?.message && (
                            <p className="text-gray-600 mb-6">
                                {error.data.message}
                            </p>
                        )}
                        <div className="space-x-4">
                            <Button onClick={() => window.location.href = '/'}>
                                Go Home
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => window.location.reload()}
                            >
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">
                        Oops!
                    </h1>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                        Something went wrong
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {error instanceof Error ? error.message : 'An unexpected error occurred'}
                    </p>
                    <div className="space-x-4">
                        <Button onClick={() => window.location.href = '/'}>
                            Go Home
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
