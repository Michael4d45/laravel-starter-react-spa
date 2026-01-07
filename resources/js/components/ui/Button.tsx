import React from 'react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    disabledWhenOffline?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, disabledWhenOffline = false, disabled, variant = 'primary', size = 'md', children, ...props }, ref) => {
        const isOnline = useOnlineStatus();
        const isDisabled = disabled || (disabledWhenOffline && !isOnline);

        const variantClasses = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            danger: 'btn-danger',
            outline: 'btn-outline',
        };

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                className={cn(
                    'rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                    variantClasses[variant],
                    sizeClasses[size],
                    className,
                )}
                ref={ref}
                disabled={isDisabled}
                {...props}
            >
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';
