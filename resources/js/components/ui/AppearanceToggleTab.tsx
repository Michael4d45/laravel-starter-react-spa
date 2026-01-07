import { Appearance, useAppearance } from '@/hooks/useAppearance';
import { cn } from '@/lib/utils';
import { LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function AppearanceToggleTab({ className = '', showText = true, ...props }: HTMLAttributes<HTMLDivElement> & { showText?: boolean }) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <div className={cn('inline-flex gap-1.5 rounded-lg bg-neutral-100 p-1.5 md:gap-1 md:p-1 dark:bg-neutral-800', className)} {...props}>
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'flex flex-1 items-center justify-center rounded-md px-4 py-2 transition-colors md:px-3.5 md:py-1.5',
                        appearance === value
                            ? 'bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
                            : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60',
                    )}
                >
                    <Icon className={cn('h-6 w-6 shrink-0 md:h-5 md:w-5', appearance === value ? 'text-primary' : 'text-neutral-500')} />
                    {showText && <span className="ml-1.5 text-base md:text-sm">{label}</span>}
                </button>
            ))}
        </div>
    );
}
