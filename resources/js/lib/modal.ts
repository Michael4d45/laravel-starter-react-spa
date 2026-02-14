import { ReactNode, useEffect, useState } from 'react';

export interface AlertOptions {
    title?: string;
    message: ReactNode;
}

export interface ConfirmOptions {
    title?: string;
    message: ReactNode;
    confirmText?: string;
    cancelText?: string;
}

export type ModalState =
    | { type: 'alert'; options: AlertOptions }
    | {
          type: 'confirm';
          options: ConfirmOptions;
          resolve: (value: boolean) => void;
      }
    | null;

let currentModal: ModalState = null;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

function setModal(modal: ModalState) {
    currentModal = modal;
    emit();
}

export { setModal };

export const modal = {
    alert: (opts: AlertOptions) => {
        if (currentModal) return;

        const normalized = {
            title: 'Alert',
            ...opts,
        };

        setModal({ type: 'alert', options: normalized });
    },

    confirm: (opts: ConfirmOptions): Promise<boolean> => {
        if (currentModal) {
            return Promise.reject(new Error('Modal already open'));
        }

        const normalized = {
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            ...opts,
        };

        return new Promise((resolve) => {
            setModal({ type: 'confirm', options: normalized, resolve });
        });
    },
};

export function useModal() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(Math.random());
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    return currentModal;
}
