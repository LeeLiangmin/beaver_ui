import { useRef, useState, useCallback, useEffect, useMemo, memo, type ReactNode } from 'react'

interface VirtualListProps<T> {
  items: T[]
  rowHeight: number
  overscan?: number
  renderRow: (item: T, index: number) => ReactNode
  header?: ReactNode
  className?: string
}

function VirtualListInner<T>({
  items,
  rowHeight,
  overscan = 10,
  renderRow,
  header,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const onScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    obs.observe(el)
    setContainerHeight(el.clientHeight)
    return () => obs.disconnect()
  }, [])

  const totalHeight = items.length * rowHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan,
  )

  const visibleItems = useMemo(() => {
    const result: ReactNode[] = []
    for (let i = startIndex; i < endIndex; i++) {
      result.push(renderRow(items[i], i))
    }
    return result
  }, [items, startIndex, endIndex, renderRow])

  const offsetY = startIndex * rowHeight

  return (
    <div ref={containerRef} onScroll={onScroll} className={`overflow-auto ${className}`}>
      {header && <div className="sticky top-0 z-10">{header}</div>}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>{visibleItems}</div>
      </div>
    </div>
  )
}

const VirtualList = memo(VirtualListInner) as typeof VirtualListInner
export default VirtualList
