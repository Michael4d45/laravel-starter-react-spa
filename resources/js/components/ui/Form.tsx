import { modal } from '@/lib/modal';
import { useState } from 'react';
import { createContext, useContext } from 'react';

type ValidationErrors = Record<string, readonly string[]>;

interface FormContextValue {
    getFieldError: (fieldName: string) => string | null;
    isSubmitting: boolean;
}

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext() {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error('useFormContext must be used within a Form component');
    }
    return context;
}

interface FormProps {
    onSubmit: (formData: FormData) => Promise<any>;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    children: React.ReactNode;
    className?: string;
    offlineBlock?: { isBlocked: boolean; blockReason?: string | null };
    clientValidation?: (formData: FormData) => ValidationErrors;
}

export function Form({
    onSubmit,
    onSuccess,
    onError,
    children,
    className,
    offlineBlock,
    clientValidation
}: FormProps) {
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getFieldError = (fieldName: string): string | null => {
        return validationErrors[fieldName]?.[0] || null;
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (offlineBlock?.isBlocked) {
            modal.alert({
                message: offlineBlock.blockReason || 'Cannot submit while offline',
            });
            return;
        }

        setValidationErrors({});
        setIsSubmitting(true);

        const formData = new FormData(e.target as HTMLFormElement);

        // Client-side validation
        if (clientValidation) {
            const errors = clientValidation(formData);
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const result = await onSubmit(formData);
            if (result._tag === 'Success') {
                onSuccess?.(result.data);
            } else if (result._tag === 'ValidationError') {
                setValidationErrors(result.errors);
            } else {
                onError?.(result);
                if (!onError) {
                    modal.alert({ message: result.message });
                }
            }
        } catch (error) {
            onError?.(error);
            if (!onError) {
                modal.alert({ message: 'An unexpected error occurred' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormContext.Provider value={{ getFieldError, isSubmitting }}>
            <form onSubmit={handleSubmit} className={className}>
                {children}
            </form>
        </FormContext.Provider>
    );
}

export { FormField } from './FormField';