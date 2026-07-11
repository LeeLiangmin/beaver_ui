import type { ComponentType } from 'react'

interface EmptyStateProps {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-gray-200 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center bg-primary-light">
        <Icon size={18} className="text-primary/50" />
      </div>
      <p className="text-xs text-gray-400">{title}</p>
      {description && <p className="text-2xs text-gray-400 -mt-1">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-primary hover:text-primary-hover transition-colors mt-1"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
