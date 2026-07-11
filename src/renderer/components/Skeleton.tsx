interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

export function SkeletonRow({ cols = 3, className = '' }: { cols?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 h-11 border-b border-gray-100 ${className}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === 0 ? 'w-44 h-3' : i === cols - 1 ? 'w-24 h-3' : 'flex-1 h-3'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-200 animate-pulse ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="w-24 h-4" />
      </div>
      <Skeleton className="w-full h-3 mb-1" />
      <Skeleton className="w-2/3 h-3" />
    </div>
  )
}
