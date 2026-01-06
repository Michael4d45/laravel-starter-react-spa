import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type ValidationErrors = Record<string, readonly string[]>;

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
        {},
    );

    const { login, isLoading } = useAuth();

    const { isBlocked, blockReason } = useOfflineBlock();
    const navigate = useNavigate();

    const getFieldError = (fieldName: string): string | null => {
        return validationErrors[fieldName]?.[0] || null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isBlocked) {
            alert(blockReason || 'Cannot login while offline');
            return;
        }

        setValidationErrors({}); // Clear previous errors

        console.log(email, password, remember);
        const result = await login({ email, password, remember });
        if (result._tag === 'Success') {
            navigate('/');
        } else if (result._tag === 'ValidationError') {
            setValidationErrors(result.errors);
        } else {
            alert(result.message);
        }
    };

    return (
        <div className="mx-auto max-w-md">
            <div className="rounded-lg bg-white p-8 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">Login</h1>

                {isBlocked && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-red-800">{blockReason}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                                getFieldError('email')
                                    ? 'border-red-500 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            required
                            disabled={isBlocked}
                        />
                        {getFieldError('email') && (
                            <p className="mt-1 text-sm text-red-600">
                                {getFieldError('email')}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                                getFieldError('password')
                                    ? 'border-red-500 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            required
                            disabled={isBlocked}
                        />
                        {getFieldError('password') && (
                            <p className="mt-1 text-sm text-red-600">
                                {getFieldError('password')}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="remember"
                            name="remember"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={isBlocked}
                        />
                        <label
                            htmlFor="remember"
                            className="ml-2 block text-sm text-gray-900"
                        >
                            Remember me
                        </label>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </form>

                <div className="mt-6 space-y-2 text-center">
                    <p className="text-sm text-gray-600">
                        Demo credentials: any email/password combination will
                        work
                    </p>
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link
                            to="/register"
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
