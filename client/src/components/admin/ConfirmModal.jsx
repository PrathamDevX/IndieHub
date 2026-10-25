import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            {danger && <span className="modal-danger-icon"><AlertTriangle size={18} /></span>}
            <h3>{title}</h3>
          </div>
          <button className="modal-close" onClick={onCancel} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="button-secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button
            className={danger ? 'button-danger' : 'button-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
