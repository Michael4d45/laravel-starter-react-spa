import { useFormContext } from './Form';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    errorClassName?: string;
    labelClassName?: string;
    containerClassName?: string;
}

export function FormField({
    label,
    errorClassName = 'border-danger focus:ring-danger',
    labelClassName = 'text-secondary mb-1 block text-sm font-medium',
    containerClassName = '',
    className = '',
    ...props
}: FormFieldProps) {
    const { getFieldError } = useFormContext();
    const fieldName = props.name || '';
    const error = getFieldError(fieldName);

    const inputClassName = `w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
        error
            ? errorClassName
            : 'focus:ring-primary border-secondary'
    } ${className}`;

    return (
        <div className={containerClassName}>
            {label && (
                <label
                    htmlFor={props.id}
                    className={labelClassName}
                >
                    {label}
                </label>
            )}
            <input
                {...props}
                className={inputClassName}
            />
            {error && (
                <p className="text-danger mt-1 text-sm">
                    {error}
                </p>
            )}
        </div>
    );
}