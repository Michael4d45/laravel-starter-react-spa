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
        <div className="bg-primary flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md text-center">
                <div className="mb-8">
                    <h1 className="text-secondary mb-4 text-6xl font-bold">
                        404
                    </h1>
                    <h2 className="text-secondary mb-4 text-2xl font-semibold">
                        Page Not Found
                    </h2>
                    <p className="text-secondary">
                        Sorry, the page you are looking for could not be found.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link to="/" className="block">
                        <Button className="w-full">Go Home</Button>
                    </Link>

                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleGoBack}
                    >
                        Go Back
                    </Button>
                </div>
            </div>
        </div>
    );
}
