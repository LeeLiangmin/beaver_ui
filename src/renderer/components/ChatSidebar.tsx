import { useRef, useEffect } from 'react'
import { X, Sparkles, Send, Loader2, MessageCircle } from 'lucide-react'
import type { ChatMessage } from '../../shared/types'

interface Props {
  open: boolean
  messages: ChatMessage[]
  input: string
  loading: boolean
  onClose: () => void
  onInputChange: (v: string) => void
  onSend: () => void
}

const SUGGESTIONS = [
  '哪个类别最该清理？',
  '清理浏览器缓存',
  '清理开发工具缓存',
  '有什么风险？',
]

export default function ChatSidebar({ open, messages, input, loading, onClose, onInputChange, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (!open) return null

  return (
    <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 shrink-0 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <Sparkles size={14} className="text-purple-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700">Beaver 助手</div>
            <div className="text-2xs text-gray-500">AI 清理顾问</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <div className="w-14 h-14 rounded-3xl bg-purple-50 flex items-center justify-center">
              <MessageCircle size={24} className="text-purple-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">向 AI 询问清理建议</div>
              <div className="text-xs text-gray-400">用自然语言告诉我你想清理什么</div>
            </div>
            <div className="flex flex-col gap-1.5 w-full mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onInputChange(s)
                  }}
                  className="text-xs text-left px-3 py-1.5 rounded-2xl border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : m.role === 'system'
                    ? 'bg-purple-100 text-purple-700 rounded-bl-sm ring-1 ring-purple-200'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 size={14} className="text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-200 shrink-0 bg-gray-50/50">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && onSend()}
          placeholder="问我任何清理相关的问题…"
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-2xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary disabled:opacity-40 transition-colors bg-white"
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="p-1.5 rounded-2xl bg-primary text-white hover:bg-primary-hover disabled:opacity-30 transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}