interface ProgressBarProps {
  label?: string
  className?: string
}

export default function ProgressBar({ label, className = '' }: ProgressBarProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-gray-400 font-medium">{label}</span>}
      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary/80 via-primary to-indigo-500 rounded-full animate-progress" />
      </div>
    </div>
  )
}
