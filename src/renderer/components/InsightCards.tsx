import { Sparkles, ArrowRight } from 'lucide-react'
import type { AiInsights } from '../../shared/types'
import { formatSize } from './useDiskCleaner'

interface Props {
  insights: AiInsights | null
  loading: boolean
  onApplyCard: (ruleIds: string[]) => void
  onQuickAction: (ruleIds: string[]) => void
}

const URGENCY_STYLE: Record<string, { border: string; bg: string; badgeBg: string; badgeText: string; label: string }> = {
  high: { border: 'border-red-200', bg: 'from-red-50 to-orange-50', badgeBg: 'bg-red-100', badgeText: 'text-red-600', label: '强烈推荐' },
  medium: { border: 'border-amber-200', bg: 'from-amber-50 to-yellow-50', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700', label: '建议清理' },
  low: { border: 'border-blue-200', bg: 'from-blue-50 to-cyan-50', badgeBg: 'bg-blue-100', badgeText: 'text-blue-600', label: '可选清理' },
}

export default function InsightCards({ insights, loading, onApplyCard, onQuickAction }: Props) {
  if (loading && !insights) {
    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gray-200 rounded" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
            </div>
            <div className="w-full h-3 bg-gray-200 rounded mb-1" />
            <div className="w-2/3 h-3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!insights) return null

  return (
    <div className="mt-4">
      {/* Quick action pills */}
      {insights.quickActions.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold text-gray-500 shrink-0">快捷方案</span>
          <div className="flex flex-wrap gap-1.5">
            {insights.quickActions.map((qa, i) => (
              <button
                key={i}
                onClick={() => onQuickAction(qa.ruleIds)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 hover:border-primary hover:text-primary hover:shadow-sm transition-all"
              >
                <span>{qa.emoji}</span>
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {insights.cards.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-purple-500" />
            <span className="text-[11px] font-semibold text-gray-500">智能建议</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {insights.cards.map((card) => {
              const style = URGENCY_STYLE[card.urgency] || URGENCY_STYLE.medium
              return (
                <div
                  key={card.id}
                  className={`bg-gradient-to-br ${style.bg} rounded-xl p-4 border ${style.border} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">{card.emoji}</span>
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{card.title}</h3>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.badgeBg} ${style.badgeText} shrink-0`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mb-3 min-h-[3rem]">{card.narrative}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-500">
                      <span className="font-bold text-gray-800">{formatSize(card.reclaimableBytes)}</span>
                      <span className="mx-1">·</span>
                      <span>{card.fileCount.toLocaleString()} 文件</span>
                    </div>
                    <button
                      onClick={() => onApplyCard(card.ruleIds)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 hover:text-primary hover:shadow-sm border border-gray-200 transition-all"
                    >
                      {card.actionLabel}
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}