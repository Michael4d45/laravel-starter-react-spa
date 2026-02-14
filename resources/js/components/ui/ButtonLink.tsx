import React from 'react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Link } from 'react-router-dom';
import { buttonBaseClasses, buttonSizeClasses, ButtonSize, buttonVariantClasses, ButtonVariant } from '@/components/ui/Button';

interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string;
    disabledWhenOffline?: boolean;
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
    ({ className, disabledWhenOffline = false, variant = 'primary', size = 'md', to, children, ...props }, ref) => {
        const isOnline = useOnlineStatus();
        const isDisabled = disabledWhenOffline && !isOnline;

        return (
            <Link
                to={to}
                className={cn(
                    'button',
                    buttonBaseClasses,
                    buttonVariantClasses[variant],
                    buttonSizeClasses[size],
                    isDisabled && 'pointer-events-none opacity-50',
                    className,
                )}
                ref={ref}
                {...props}
            >
                {children}
            </Link>
        );
    },
);

ButtonLink.displayName = 'ButtonLink';
