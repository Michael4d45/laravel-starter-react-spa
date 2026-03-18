import { IconButton } from '@/components/ui/IconButton';
import { type Appearance, useAppearance } from '@/hooks/useAppearance';
import { cn } from '@/lib/utils';
import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { type HTMLAttributes } from 'react';

export default function AppearanceToggleTab({
    className = '',
    showText = true,
    ...props
}: HTMLAttributes<HTMLDivElement> & { showText?: boolean }) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <div
            className={cn(
                'bg-secondary-bg inline-flex gap-1.5 rounded-lg p-1.5 md:gap-1 md:p-1',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <IconButton
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    variant="outline"
                    className={cn(
                        'rounded-md transition-colors',
                        showText
                            ? 'h-auto w-auto flex-1 px-4 py-2 md:px-3.5 md:py-1.5'
                            : 'h-10 w-10 shrink-0 p-2',
                        appearance === value
                            ? 'bg-card text-secondary shadow-xs'
                            : 'hover-bg-secondary text-muted hover:text-secondary',
                    )}
                >
                    <Icon
                        className={cn(
                            'shrink-0',
                            showText
                                ? 'h-6 w-6 md:h-5 md:w-5'
                                : 'h-6 w-6',
                            appearance === value
                                ? 'text-(--primary)'
                                : 'text-muted',
                        )}
                    />
                    {showText && (
                        <span className="ml-1.5 text-base md:text-sm">
                            {label}
                        </span>
                    )}
                </IconButton>
            ))}
        </div>
    );
}
