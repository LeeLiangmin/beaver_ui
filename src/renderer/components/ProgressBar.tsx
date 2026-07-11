interface ProgressBarProps {
  label?: string
  className?: string
  variant?: 'bar' | 'spinner'
}

export default function ProgressBar({ label, className = '', variant = 'bar' }: ProgressBarProps) {
  if (variant === 'spinner') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {label && <span className="text-xs text-gray-400 font-medium">{label}</span>}
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-gray-400 font-medium">{label}</span>}
      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary/80 via-primary to-indigo-500 rounded-full animate-progress" />
      </div>
    </div>
  )
}
