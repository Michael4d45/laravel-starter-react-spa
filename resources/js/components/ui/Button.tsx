import React from 'react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    disabledWhenOffline?: boolean;
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export const buttonBaseClasses =
    'btn-focus-contained overflow-visible focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0';

export const buttonVariantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    outline: 'btn-outline',
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, disabledWhenOffline = false, disabled, variant = 'primary', size = 'md', children, ...props }, ref) => {
        const isOnline = useOnlineStatus();
        const isDisabled = disabled || (disabledWhenOffline && !isOnline);

        return (
            <button
                className={cn(
                    buttonBaseClasses,
                    buttonVariantClasses[variant],
                    buttonSizeClasses[size],
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
