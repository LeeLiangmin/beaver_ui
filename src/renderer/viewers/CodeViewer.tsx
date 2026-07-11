import { useEffect, useState } from 'react'
import type { ViewerProps } from './registry'

export default function CodeViewer({ src }: ViewerProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((t) => {
        if (!cancelled) setText(t)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [src])

  if (error) {
    return <div className="p-4 text-red-500 text-sm">无法读取文件：{error}</div>
  }

  return (
    <pre className="p-4 overflow-auto h-full text-sm font-mono text-gray-800 bg-gray-50 m-0">
      <code>{text}</code>
    </pre>
  )
}
