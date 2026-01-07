import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type ValidationErrors = Record<string, readonly string[]>;

export function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
        {},
    );

    const { register, googleLogin, isLoading } = useAuth();

    const { isBlocked, blockReason } = useOfflineBlock();
    const navigate = useNavigate();

    const getFieldError = (fieldName: string): string | null => {
        return validationErrors[fieldName]?.[0] || null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear validation error for this field when user starts typing
        if (validationErrors[name]) {
            setValidationErrors((prev) => {
                const { [name]: removed, ...newErrors } = prev;
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isBlocked) {
            alert(blockReason || 'Cannot register while offline');
            return;
        }

        // Client-side validation
        const errors: ValidationErrors = {};

        if (formData.password.length < 8) {
            errors.password = ['Password must be at least 8 characters'];
        }

        if (formData.password !== formData.password_confirmation) {
            errors.password_confirmation = ['Passwords do not match'];
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors({}); // Clear previous errors

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            password_confirmation: formData.password_confirmation,
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
                <h1 className="mb-6 text-center text-2xl font-bold">
                    Create Account
                </h1>

                {isBlocked && (
                    <div className="border-danger bg-danger-light mb-6 rounded-lg border p-4">
                        <p className="text-danger">{blockReason}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="name"
                            className="text-secondary mb-1 block text-sm font-medium"
                        >
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                                getFieldError('name')
                                    ? 'border-danger focus:ring-danger'
                                    : 'focus:ring-primary border-gray-300'
                            }`}
                            required
                            disabled={isBlocked}
                        />
                        {getFieldError('name') && (
                            <p className="text-danger mt-1 text-sm">
                                {getFieldError('name')}
                            </p>
                        )}
                    </div>

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
                            value={formData.email}
                            onChange={handleChange}
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
                            value={formData.password}
                            onChange={handleChange}
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                                getFieldError('password')
                                    ? 'border-danger focus:ring-danger'
                                    : 'focus:ring-primary border-gray-300'
                            }`}
                            required
                            minLength={8}
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
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="password_confirmation"
                            name="password_confirmation"
                            value={formData.password_confirmation}
                            onChange={handleChange}
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
                        data-test="create-account"
                        type="submit"
                        className="w-full"
                        disabled={isLoading || isBlocked}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-card text-secondary">Or</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => googleLogin()}
                            className="w-full flex items-center justify-center gap-2"
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
