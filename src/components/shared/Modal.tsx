import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  icon?: ReactNode
}

export default function Modal({ open, onClose, title, description, children, icon }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white p-6"
        style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex size-7 items-center justify-center text-gray-400 transition-colors hover:text-gray-700"
          style={{ borderRadius: 5 }}
        >
          <X size={15} />
        </button>

        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          {icon && (
            <div className="flex size-11 items-center justify-center" style={{ background: '#fef2f2', borderRadius: 5 }}>
              {icon}
            </div>
          )}
          <div>
            <p className="text-base font-extrabold tracking-tight text-gray-900">{title}</p>
            {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
