import React from 'react'
import Modal from './Modal'

export default function ConfirmationModal({open, title, message, onConfirm, onCancel}){
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="space-y-4">
        <div>{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-2 bg-red-600 text-white rounded">Confirm</button>
        </div>
      </div>
    </Modal>
  )
}
