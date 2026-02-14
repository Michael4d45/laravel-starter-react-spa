import { setModal, useModal } from '../lib/modal';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';

export function ModalRenderer() {
    const modal = useModal();

    if (!modal) return null;

    const handleClose = () => {
        if (modal.type === 'confirm') {
            modal.resolve(false);
        }
        setModal(null);
    };

    const handleConfirm = () => {
        if (modal.type === 'confirm') {
            modal.resolve(true);
        }
        setModal(null);
    };

    if (modal.type === 'alert') {
        return (
            <AlertModal
                isOpen={true}
                onClose={handleClose}
                {...modal.options}
            />
        );
    }

    if (modal.type === 'confirm') {
        return (
            <ConfirmModal
                isOpen={true}
                onClose={handleClose}
                onConfirm={handleConfirm}
                {...modal.options}
            />
        );
    }

    return null;
}
