import { Toggle } from '@/components/Toggle';
import { Button } from '@/components/ui/Button';
import { Form, FormField } from '@/components/ui/Form';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuth } from '@/features/auth/AuthContext';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function LoginPage() {
    const { login, googleLogin, isLoading } = useAuth();
    const { isBlocked, blockReason } = useOfflineBlock();
    const [remember, setRemember] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const remember = formData.get('remember') === 'on';

        return await login({
            email,
            password,
            remember,
        });
    };

    return (
        <div className="mx-auto flex h-full max-w-md items-center justify-center">
            <div className="bg-card w-full rounded-lg p-8 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">Login</h1>

                {isBlocked && (
                    <div className="border-danger bg-danger-light mb-6 rounded-lg border p-4">
                        <p className="text-danger">{blockReason}</p>
                    </div>
                )}

                <Form
                    onSubmit={handleSubmit}
                    offlineBlock={{ isBlocked, blockReason }}
                    className="space-y-4"
                >
                    <FormField
                        type="email"
                        id="email"
                        name="email"
                        label="Email"
                        required
                    />

                    <FormField
                        type="password"
                        id="password"
                        name="password"
                        label="Password"
                        required
                    />

                    <Toggle
                        checked={remember}
                        onChange={setRemember}
                        label="Remember me"
                        name="remember"
                        id="remember"
                        disabled={isBlocked}
                    />

                    <div className="text-right">
                        <Link
                            to="/forgot-password"
                            className="text-primary hover:text-primary-hover text-sm font-medium"
                            data-test="forgot-password-link"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <Button
                        data-test="login"
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </Form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="border-secondary w-full border-t" />
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
                            onClick={() => googleLogin(false, remember)}
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
