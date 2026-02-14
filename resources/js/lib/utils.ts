import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getCookieValue(name: string): string | undefined {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift();
    }
    return undefined;
}

export function isEnumValue<T extends Record<string, string>>(
    enumObj: T,
    value: any,
): value is T[keyof T] {
    return Object.values(enumObj).includes(value as T[keyof T]);
}

export function toEnumValue<T extends Record<string, string>>(
    enumObj: T,
    value: any,
    otherwise: T[keyof T] | null = null,
): T[keyof T] | null {
    return isEnumValue(enumObj, value) ? value : otherwise;
}

export function toEnumOrFail<T extends Record<string, string>>(
    enumObj: T,
    value: unknown,
): T[keyof T] {
    if (isEnumValue(enumObj, value)) {
        return value;
    }

    throw new Error(
        `Could not cast "${value}" to enum value. Valid options are ${JSON.stringify(enumObj)}`,
    );
}
