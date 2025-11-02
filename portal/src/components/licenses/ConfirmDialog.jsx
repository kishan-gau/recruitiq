import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger' // 'danger' | 'warning' | 'primary'
}) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const variantStyles = {
    danger: 'bg-danger-600 hover:bg-danger-700',
    warning: 'bg-warning-600 hover:bg-warning-700',
    primary: 'bg-primary-600 hover:bg-primary-700'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${
            variant === 'danger' ? 'bg-danger-100' : 
            variant === 'warning' ? 'bg-warning-100' : 
            'bg-primary-100'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${
              variant === 'danger' ? 'text-danger-600' : 
              variant === 'warning' ? 'text-warning-600' : 
              'text-primary-600'
            }`} />
          </div>
          <p className="text-gray-700 flex-1">{message}</p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`btn text-white ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
