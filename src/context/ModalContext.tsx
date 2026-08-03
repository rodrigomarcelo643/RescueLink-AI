import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import Modal from '@/components/shared/Modal'

interface ModalOptions {
  title: string
  description?: string
  icon?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  danger?: boolean
}

interface ModalContextValue {
  openModal: (opts: ModalOptions) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ModalOptions | null>(null)
  const [loading, setLoading] = useState(false)

  const openModal = useCallback((options: ModalOptions) => {
    setOpts(options)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    if (loading) return
    setOpen(false)
  }, [loading])

  const handleConfirm = async () => {
    if (!opts) return
    setLoading(true)
    await opts.onConfirm()
    setLoading(false)
    setOpen(false)
  }

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {opts && (
        <Modal open={open} onClose={closeModal} title={opts.title} description={opts.description} icon={opts.icon}>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full py-2.5 text-sm font-extrabold text-white transition-colors disabled:opacity-60"
              style={{
                borderRadius: 5,
                background: opts.danger ? '#b91c1c' : '#111827',
              }}
            >
              {loading ? 'Please wait…' : (opts.confirmLabel ?? 'Confirm')}
            </button>
            <button
              onClick={closeModal}
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-60"
              style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            >
              {opts.cancelLabel ?? 'Cancel'}
            </button>
          </div>
        </Modal>
      )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used inside ModalProvider')
  return ctx
}
