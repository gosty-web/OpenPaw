import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { toast, type Toast as ToastPayload, type ToastType } from '../lib/toast'

const icons: Record<ToastType, typeof Info> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors: Record<ToastType, string> = {
  success: 'border-paw-success/30 text-paw-success',
  error: 'border-paw-danger/30 text-paw-danger',
  info: 'border-paw-info/30 text-paw-info',
  warning: 'border-paw-warning/30 text-paw-warning',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastPayload[]>([])
  const timeouts = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    return toast.subscribe((nextToast) => {
      setToasts((previous) => [...previous, nextToast])

      const timeoutId = window.setTimeout(() => {
        setToasts((previous) => previous.filter((item) => item.id !== nextToast.id))
        timeouts.current.delete(nextToast.id)
      }, nextToast.duration ?? 3500)

      timeouts.current.set(nextToast.id, timeoutId)
    })
  }, [])

  useEffect(() => {
    return () => {
      timeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeouts.current.clear()
    }
  }, [])

  const dismissToast = (id: string) => {
    const timeoutId = timeouts.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeouts.current.delete(id)
    }

    setToasts((previous) => previous.filter((item) => item.id !== id))
  }

  return (
    <div id="toast-root">
      {toasts.map((item) => {
        const Icon = icons[item.type]

        return (
          <div
            key={item.id}
            className={clsx(
              'pointer-events-auto flex min-w-[280px] max-w-[360px] items-center gap-3 rounded-xl border bg-paw-raised px-4 py-3 shadow-xl animate-slide-up',
              colors[item.type],
            )}
          >
            <Icon size={16} className="shrink-0" />
            <span className="text-sm text-paw-text">{item.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="ml-auto text-paw-faint transition-colors hover:text-paw-muted"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
