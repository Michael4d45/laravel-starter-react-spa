import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    name?: string;
    id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
    checked,
    onChange,
    label,
    disabled = false,
    className = '',
    name,
    id,
}) => {
    return (
        <label
            className={`inline-flex cursor-pointer items-center ${
                disabled ? 'cursor-not-allowed opacity-50' : ''
            } ${className}`}
        >
            <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                name={name}
                id={id}
            />
            <div
                className={`relative inline-block h-6 w-10 rounded-full transition-colors duration-200 ${
                    checked
                        ? 'bg-primary-light'
                        : 'bg-gray-300 dark:bg-gray-600'
                }`}
            >
                <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg-card shadow-md transition-transform duration-200 ${
                        checked ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                ></div>
            </div>
            {label && (
                <span className="text-secondary ml-3 text-sm font-medium">
                    {label}
                </span>
            )}
        </label>
    );
};
