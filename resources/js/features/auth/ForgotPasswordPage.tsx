import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { ApiClient } from '@/lib/apiClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';

type ValidationErrors = Record<string, readonly string[]>;

export function ForgotPasswordPage() {
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
        {},
    );
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { isLoading } = useAuth();

    const { isBlocked, blockReason } = useOfflineBlock();

    const getFieldError = (fieldName: string): string | null => {
        return validationErrors[fieldName]?.[0] || null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isBlocked) {
            alert(blockReason || 'Cannot send reset link while offline');
            return;
        }

        setValidationErrors({}); // Clear previous errors

        // Read values directly from form elements (works with browser automation)
        const formData = new FormData(e.target as HTMLFormElement);
        const emailValue = formData.get('email') as string;

        const result = await ApiClient.sendPasswordResetLink(emailValue);
        if (result._tag === 'Success') {
            setIsSubmitted(true);
        } else if (result._tag === 'ValidationError') {
            setValidationErrors(result.errors);
        } else {
            alert(result.message);
        }
    };

    if (isSubmitted) {
        return (
            <div className="mx-auto max-w-md">
                <div className="bg-card rounded-lg p-8 shadow-md">
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
        <div className="mx-auto max-w-md">
            <div className="bg-card rounded-lg p-8 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">
                    Forgot Password
                </h1>

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

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
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
