import { Button } from '@/components/ui/Button';
import { Form, FormField } from '@/components/ui/Form';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuth } from '@/features/auth/AuthContext';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { Link } from 'react-router';

export function RegisterPage() {
    const { register, googleLogin, isLoading } = useAuth();
    const { isBlocked, blockReason } = useOfflineBlock();

    const handleSubmit = async (formData: FormData) => {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const password_confirmation = formData.get(
            'password_confirmation',
        ) as string;

        return await register({
            name,
            email,
            password,
            password_confirmation,
        });
    };

    const clientValidation = (
        formData: FormData,
    ): Record<string, readonly string[]> => {
        const password = formData.get('password') as string;
        const password_confirmation = formData.get(
            'password_confirmation',
        ) as string;

        const errors: Record<string, readonly string[]> = {};

        if (password.length < 8) {
            errors['password'] = ['Password must be at least 8 characters'];
        }

        if (password !== password_confirmation) {
            errors['password_confirmation'] = ['Passwords do not match'];
        }

        return errors;
    };

    return (
        <div className="mx-auto flex h-full max-w-md items-center justify-center">
            <div className="bg-card w-full rounded-lg p-8 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">
                    Create Account
                </h1>

                {isBlocked && (
                    <div className="border-danger bg-danger-light mb-6 rounded-lg border p-4">
                        <p className="text-danger">{blockReason}</p>
                    </div>
                )}

                <Form
                    onSubmit={handleSubmit}
                    offlineBlock={{ isBlocked, blockReason }}
                    clientValidation={clientValidation}
                    className="space-y-4"
                >
                    <FormField
                        type="text"
                        id="name"
                        name="name"
                        label="Full Name"
                        required
                    />

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
                        minLength={8}
                    />

                    <FormField
                        type="password"
                        id="password_confirmation"
                        name="password_confirmation"
                        label="Confirm Password"
                        required
                    />

                    <Button
                        data-test="create-account"
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
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
                            onClick={() => googleLogin()}
                            className="flex w-full items-center justify-center gap-2"
                            disabled={isLoading || isBlocked}
                        >
                            <GoogleIcon />
                            Continue with Google
                        </Button>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-secondary text-sm">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-primary hover:text-primary-hover font-medium"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
