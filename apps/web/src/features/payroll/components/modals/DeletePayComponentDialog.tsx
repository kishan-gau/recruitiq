import ConfirmDialog from '@recruitiq/ui';

interface PayComponent {
  id: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction';
}

interface DeletePayComponentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  component: PayComponent | null;
  isLoading?: boolean;
}

export default function DeletePayComponentDialog({
  isOpen,
  onClose,
  onConfirm,
  component,
  isLoading = false,
}: DeletePayComponentDialogProps) {
  if (!component) return null;

  const message = `Are you sure you want to delete the ${component.type} component "${component.name}" (${component.code})? This action cannot be undone and may affect existing payroll calculations.`;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Pay Component"
      message={message}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={isLoading}
    />
  );
}
