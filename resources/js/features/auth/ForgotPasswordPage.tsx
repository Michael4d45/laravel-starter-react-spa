import { Button } from '@/components/ui/Button';
import { Form, FormField } from '@/components/ui/Form';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { sendPasswordResetLink } from '@/lib/apiClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { isLoading } = useAuth();
    const { isBlocked, blockReason } = useOfflineBlock();

    const handleSubmit = async (formData: FormData) => {
        const email = formData.get('email') as string;
        return await sendPasswordResetLink(email);
    };

    const handleSuccess = () => {
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div className="mx-auto flex h-full max-w-md items-center justify-center">
                <div className="bg-card w-full rounded-lg p-8 shadow-md">
                    <h1 className="mb-6 text-center text-2xl font-bold">
                        Check Your Email
                    </h1>
                    <p className="text-secondary mb-6 text-center">
                        If an account exists with that email, a password reset
                        link has been sent.
                    </p>
                    <div className="text-center">
                        <Link
                            to="/login"
                            className="text-primary hover:text-primary-hover font-medium"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex h-full max-w-md items-center justify-center">
            <div className="bg-card w-full rounded-lg p-8 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">
                    Forgot Password
                </h1>

                {isBlocked && (
                    <div className="border-danger bg-danger-light mb-6 rounded-lg border p-4">
                        <p className="text-danger">{blockReason}</p>
                    </div>
                )}

                <Form
                    onSubmit={handleSubmit}
                    onSuccess={handleSuccess}
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

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                        data-test="send-reset-link"
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                </Form>

                <div className="mt-6 text-center">
                    <p className="text-secondary text-sm">
                        Remember your password?{' '}
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
