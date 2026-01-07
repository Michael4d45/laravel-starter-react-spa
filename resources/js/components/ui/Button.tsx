import React from 'react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    disabledWhenOffline?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, disabledWhenOffline = false, disabled, variant = 'primary', children, ...props }, ref) => {
        const isOnline = useOnlineStatus();
        const isDisabled = disabled || (disabledWhenOffline && !isOnline);

        const variantClasses = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            danger: 'btn-danger',
        };

        return (
            <button
                className={cn(
                    'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                    variantClasses[variant],
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
