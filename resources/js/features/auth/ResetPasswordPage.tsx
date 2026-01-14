import { Button } from '@/components/ui/Button';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { ApiClient } from '@/lib/apiClient';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

type ValidationErrors = Record<string, readonly string[]>;

export function ResetPasswordPage() {
    const { email, token } = useParams<{ email: string; token: string }>();
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
        {},
    );
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { isBlocked, blockReason } = useOfflineBlock();

    const getFieldError = (fieldName: string): string | null => {
        return validationErrors[fieldName]?.[0] || null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isBlocked) {
            alert(blockReason || 'Cannot reset password while offline');
            return;
        }

        if (!email || !token) {
            alert('Invalid reset link');
            return;
        }

        setIsLoading(true);
        setValidationErrors({}); // Clear previous errors

        // Read values directly from form elements (works with browser automation)
        const formData = new FormData(e.target as HTMLFormElement);
        const passwordValue = formData.get('password') as string;
        const passwordConfirmationValue = formData.get(
            'password_confirmation',
        ) as string;

        try {
            const result = await ApiClient.resetPassword({
                token,
                email,
                password: passwordValue,
                password_confirmation: passwordConfirmationValue,
            });
            if (result._tag === 'Success') {
                toast.success('Password reset successfully!');
                setIsSubmitted(true);
            } else if (result._tag === 'ValidationError') {
                // Check if this is a token validation error
                if (result.errors.token || result.errors.email) {
                    toast.error(
                        result.message || 'Invalid or expired reset link',
                    );
                } else {
                    // For other validation errors (password, etc.), show them in the form
                    setValidationErrors(result.errors);
                }
            } else {
                toast.error(result.message);
            }
        } finally {
            setIsLoading(false);
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="password"
                            className="text-secondary mb-1 block text-sm font-medium"
                        >
                            New Password
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

                    <div>
                        <label
                            htmlFor="password_confirmation"
                            className="text-secondary mb-1 block text-sm font-medium"
                        >
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            id="password_confirmation"
                            name="password_confirmation"
                            defaultValue=""
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                                getFieldError('password_confirmation')
                                    ? 'border-danger focus:ring-danger'
                                    : 'focus:ring-primary border-gray-300'
                            }`}
                            required
                            disabled={isBlocked}
                        />
                        {getFieldError('password_confirmation') && (
                            <p className="text-danger mt-1 text-sm">
                                {getFieldError('password_confirmation')}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                    >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </form>

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
