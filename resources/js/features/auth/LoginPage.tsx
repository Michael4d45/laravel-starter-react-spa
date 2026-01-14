import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type ValidationErrors = Record<string, readonly string[]>;

export function LoginPage() {
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
        {},
    );

    const { login, googleLogin, isLoading } = useAuth();

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

        // Read values directly from form elements (works with browser automation)
        const formData = new FormData(e.target as HTMLFormElement);
        const emailValue = formData.get('email') as string;
        const passwordValue = formData.get('password') as string;
        const rememberValue = formData.get('remember') === 'on';

        const result = await login({
            email: emailValue,
            password: passwordValue,
            remember: rememberValue,
        });
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
            <div className="bg-card rounded-lg p-8 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">Login</h1>

                {isBlocked && (
                    <div className="border-danger bg-danger-light mb-6 rounded-lg border p-4">
                        <p className="text-danger">{blockReason}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="email"
                            className="text-secondary mb-1 block text-sm font-medium"
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            defaultValue=""
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                                getFieldError('email')
                                    ? 'border-danger focus:ring-danger'
                                    : 'focus:ring-primary border-gray-300'
                            }`}
                            required
                            disabled={isBlocked}
                        />
                        {getFieldError('email') && (
                            <p className="text-danger mt-1 text-sm">
                                {getFieldError('email')}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="text-secondary mb-1 block text-sm font-medium"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            defaultValue=""
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                                getFieldError('password')
                                    ? 'border-danger focus:ring-danger'
                                    : 'focus:ring-primary border-gray-300'
                            }`}
                            required
                            disabled={isBlocked}
                        />
                        {getFieldError('password') && (
                            <p className="text-danger mt-1 text-sm">
                                {getFieldError('password')}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="remember"
                            name="remember"
                            defaultChecked={false}
                            className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                            disabled={isBlocked}
                        />
                        <label
                            htmlFor="remember"
                            className="text-secondary ml-2 block text-sm"
                        >
                            Remember me
                        </label>
                    </div>

                    <div className="text-right">
                        <Link
                            to="/forgot-password"
                            className="text-primary hover:text-primary-hover text-sm font-medium"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-card text-secondary px-2">
                                Or
                            </span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => googleLogin()}
                            className="flex w-full items-center justify-center gap-2"
                            disabled={isLoading || isBlocked}
                        >
                            <GoogleIcon />
                            Continue with Google
                        </Button>
                    </div>
                </div>

                <div className="mt-6 space-y-2 text-center">
                    <p className="text-secondary text-sm">
                        Don't have an account?{' '}
                        <Link
                            to="/register"
                            className="text-primary hover:text-primary-hover font-medium"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
