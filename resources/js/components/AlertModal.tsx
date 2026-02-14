import Modal from '@/components/Modal';
import { Button } from '@/components/ui/Button';
import { ReactNode } from 'react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: ReactNode;
}

export default function AlertModal({
    isOpen,
    onClose,
    title = 'Alert',
    message,
}: AlertModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <p className="text-secondary">{message}</p>
                <div className="flex justify-end">
                    <Button onClick={onClose}>OK</Button>
                </div>
            </div>
        </Modal>
    );
}
