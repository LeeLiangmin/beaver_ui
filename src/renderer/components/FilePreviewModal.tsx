import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { FileViewer } from '../viewers'

interface FilePreviewModalProps {
  filePath: string
  onClose: () => void
}

export default function FilePreviewModal({ filePath, onClose }: FilePreviewModalProps) {
  const [allowed, setAllowed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setAllowed(false)
    window.electronAPI.fileViewer.allowFile(filePath).then((res) => {
      if (cancelled) return
      if (res.ok) {
        setAllowed(true)
      } else {
        setError(res.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [filePath])

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-[85vw] h-[85vh] shadow-modal animate-modal-in flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-semibold text-gray-700 truncate max-w-[80%]" title={filePath}>
            {filePath.split(/[/\\]/).pop()}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-2xl hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">加载中…</div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
          ) : allowed ? (
            <FileViewer filePath={filePath} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
