export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

const listeners = new Set<(toast: Toast) => void>()

export const toast = {
  show: (message: string, type: ToastType = 'info', duration = 3500) => {
    const nextToast: Toast = {
      id: Math.random().toString(36).slice(2),
      message,
      type,
      duration,
    }

    listeners.forEach((listener) => listener(nextToast))
  },
  success: (message: string) => toast.show(message, 'success'),
  error: (message: string) => toast.show(message, 'error'),
  info: (message: string) => toast.show(message, 'info'),
  warning: (message: string) => toast.show(message, 'warning'),
  subscribe: (listener: (nextToast: Toast) => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
