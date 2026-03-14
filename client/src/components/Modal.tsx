import { useEffect } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <button type="button" aria-label="Close modal" className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-paw-border-strong bg-paw-surface shadow-xl animate-slide-up">
        <div className="flex items-center justify-between border-b border-paw-border px-6 py-4">
          <h2 className="text-lg font-semibold text-paw-text">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost h-9 w-9 justify-center p-0" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  )
}
