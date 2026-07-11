import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import Modal from './Modal'

interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: Command[]
}

export default function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const kw = query.toLowerCase()
    return commands.filter(
      (c) => c.label.toLowerCase().includes(kw) || c.description?.toLowerCase().includes(kw),
    )
  }, [commands, query])

  useEffect(() => {
    setSelectedIdx(0)
  }, [filtered.length])

  const execute = useCallback(
    (idx: number) => {
      const cmd = filtered[idx]
      if (cmd) {
        cmd.action()
        onClose()
      }
    },
    [filtered, onClose],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => (prev + 1) % Math.max(filtered.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      execute(selectedIdx)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width="w-[32rem] p-0" closeOnBackdrop={true}>
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索命令…"
            className="w-full border-0 rounded-2xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light bg-gray-50 placeholder:text-gray-400"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">未找到匹配的命令</div>
        ) : (
          filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              onClick={() => execute(idx)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${
                idx === selectedIdx ? 'bg-primary-light text-primary' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{cmd.label}</div>
                {cmd.description && (
                  <div className="text-xs text-gray-400 truncate">{cmd.description}</div>
                )}
              </div>
              {cmd.shortcut && (
                <span className="text-2xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {cmd.shortcut}
                </span>
              )}
              {idx === selectedIdx && <ArrowRight size={14} className="text-primary shrink-0" />}
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}
