import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const icons: Record<ToastType, React.ComponentType<any>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors: Record<ToastType, string> = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  error: 'border-danger/30 bg-danger-light text-red-700',
  info: 'border-primary/30 bg-primary-light text-primary',
  warning: 'border-warning/30 bg-warning-light text-warning',
}

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-danger',
  info: 'text-primary',
  warning: 'text-warning',
}

const MAX_VISIBLE = 5

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => {
      const next = [...prev, { id, message, type }]
      if (next.length > MAX_VISIBLE) {
        const removed = next.shift()!
        const t = timers.current.get(removed.id)
        if (t) clearTimeout(t)
        timers.current.delete(removed.id)
      }
      return next
    })
    const duration =
      type === 'error' ? 4000 : type === 'warning' ? 3500 : type === 'success' ? 2500 : 3000
    const timer = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, timer)
  }, [dismiss])

  const handleMouseEnter = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
  }, [])

  const handleMouseLeave = useCallback((id: number) => {
    const timer = setTimeout(() => dismiss(id), 2000)
    timers.current.set(id, timer)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              onMouseEnter={() => handleMouseEnter(t.id)}
              onMouseLeave={() => handleMouseLeave(t.id)}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-elevated text-sm animate-slide-in min-w-[260px] max-w-[min(560px,calc(100vw-2rem))] ${colors[t.type]}`}
            >
              <Icon size={16} className={`shrink-0 ${iconColors[t.type]}`} />
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
