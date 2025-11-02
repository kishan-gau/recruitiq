import React from 'react'
import Modal from './Modal'

export default function ConfirmDialog({open, title='Confirm', description='', confirmLabel='OK', cancelLabel='Cancel', onConfirm, onCancel}){
  if(!open) return null
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="p-2">
        <div className="text-sm text-slate-700 mb-4">{description}</div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={onCancel}>{cancelLabel}</button>
          <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
