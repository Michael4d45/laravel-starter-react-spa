import React from 'react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { buttonBaseClasses, ButtonVariant, buttonVariantClasses } from '@/components/ui/Button';

type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    disabledWhenOffline?: boolean;
    variant?: ButtonVariant;
    size?: IconButtonSize;
}

const iconButtonSizeClasses: Record<IconButtonSize, string> = {
    sm: 'h-8 w-8 p-1.5',
    md: 'h-10 w-10 p-2',
    lg: 'h-12 w-12 p-2.5',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className, disabledWhenOffline = false, disabled, variant = 'primary', size = 'md', children, ...props }, ref) => {
        const isOnline = useOnlineStatus();
        const isDisabled = disabled || (disabledWhenOffline && !isOnline);

        return (
            <button
                className={cn(
                    buttonBaseClasses,
                    'inline-flex items-center justify-center rounded-md',
                    buttonVariantClasses[variant],
                    iconButtonSizeClasses[size],
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

IconButton.displayName = 'IconButton';
