import { Button } from '@/components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';

export function NotFoundPage() {
    const navigate = useNavigate();

    const handleGoBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md text-center">
                <div className="mb-8">
                    <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
                    <h2 className="mb-4 text-2xl font-semibold text-gray-700">Page Not Found</h2>
                    <p className="text-gray-600">Sorry, the page you are looking for could not be found.</p>
                </div>

                <div className="space-y-4">
                    <Link to="/">
                        <Button className="w-full">Go Home</Button>
                    </Link>

                    <Button variant="secondary" className="w-full" onClick={handleGoBack}>
                        Go Back
                    </Button>
                </div>
            </div>
        </div>
    );
}
