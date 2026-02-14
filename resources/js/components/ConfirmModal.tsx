import Modal from '@/components/Modal';
import { Button } from '@/components/ui/Button';
import { ReactNode } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: ReactNode;
    confirmText?: string;
    cancelText?: string;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm',
    message,
    confirmText = 'Yes',
    cancelText = 'No',
}: ConfirmModalProps) {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <p className="text-secondary">{message}</p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        data-test="confirm-cancel-button"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleConfirm}
                        data-test="confirm-confirm-button"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
