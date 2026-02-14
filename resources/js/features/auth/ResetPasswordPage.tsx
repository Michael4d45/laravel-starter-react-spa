import { Button } from '@/components/ui/Button';
import { Form, FormField } from '@/components/ui/Form';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { resetPassword } from '@/lib/apiClient';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

export function ResetPasswordPage() {
    const { email, token } = useParams<{ email: string; token: string }>();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { isBlocked, blockReason } = useOfflineBlock();

    const handleSubmit = async (formData: FormData) => {
        if (!email || !token) {
            throw new Error('Invalid reset link');
        }

        const password = formData.get('password') as string;
        const password_confirmation = formData.get(
            'password_confirmation',
        ) as string;

        return await resetPassword({
            token,
            email,
            password,
            password_confirmation,
        });
    };

    const handleSuccess = () => {
        toast.success('Password reset successfully!');
        setIsSubmitted(true);
    };

    const handleError = (result: any) => {
        // Check if this is a token validation error
        if (
            result._tag === 'ValidationError' &&
            (result.errors.token || result.errors.email)
        ) {
            toast.error(result.message || 'Invalid or expired reset link');
        } else {
            // For other errors, let the Form component handle them
            throw result;
        }
    };

    if (isSubmitted) {
        return (
            <div className="mx-auto max-w-md">
                <div className="bg-card rounded-lg p-8 shadow-md">
                    <h1 className="mb-6 text-center text-2xl font-bold">
                        Password Reset Successful
                    </h1>
                    <p className="text-secondary mb-6 text-center">
                        Your password has been reset successfully. You can now
                        log in with your new password.
                    </p>
                    <div className="text-center">
                        <Link
                            to="/login"
                            className="text-primary hover:text-primary-hover font-medium"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!email || !token) {
        return (
            <div className="mx-auto max-w-md">
                <div className="bg-card rounded-lg p-8 shadow-md">
                    <h1 className="mb-6 text-center text-2xl font-bold">
                        Invalid Reset Link
                    </h1>
                    <p className="text-secondary mb-6 text-center">
                        The reset link is invalid or expired. Please request a
                        new password reset.
                    </p>
                    <div className="text-center">
                        <Link
                            to="/forgot-password"
                            className="text-primary hover:text-primary-hover font-medium"
                        >
                            Request New Reset Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md">
            <div className="bg-card rounded-lg p-8 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">
                    Reset Password
                </h1>

                {isBlocked && (
                    <div className="border-danger bg-danger-light mb-6 rounded-lg border p-4">
                        <p className="text-danger">{blockReason}</p>
                    </div>
                )}

                <Form
                    onSubmit={handleSubmit}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    offlineBlock={{ isBlocked, blockReason }}
                    className="space-y-4"
                >
                    <FormField
                        type="password"
                        id="password"
                        name="password"
                        label="New Password"
                        required
                    />

                    <FormField
                        type="password"
                        id="password_confirmation"
                        name="password_confirmation"
                        label="Confirm New Password"
                        required
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        data-test="reset-password"
                    >
                        Reset Password
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
