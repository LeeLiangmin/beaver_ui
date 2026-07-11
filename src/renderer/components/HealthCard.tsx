import { Scan, RefreshCw, X, Sparkles } from 'lucide-react'
import type { ScanPlan } from '../../shared/types'
import { formatSize } from './useDiskCleaner'

interface Props {
  scanning: boolean
  hasScanned: boolean
  aiEnabled: boolean
  insightsLoading: boolean
  healthScore: number | null
  headline: string
  summary: string
  totalReclaimable: number
  categoryCount: number
  scanPlan: ScanPlan | null
  narration: string[]
  onScan: () => void
  onCancelScan: () => void
}

function scoreColor(score: number): { ring: string; text: string; bg: string; label: string } {
  if (score >= 90) return { ring: 'stroke-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', label: '优秀' }
  if (score >= 70) return { ring: 'stroke-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', label: '良好' }
  if (score >= 40) return { ring: 'stroke-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: '一般' }
  return { ring: 'stroke-red-500', text: 'text-red-600', bg: 'bg-red-50', label: '偏低' }
}

export default function HealthCard({
  scanning,
  hasScanned,
  aiEnabled,
  insightsLoading,
  healthScore,
  headline,
  summary,
  totalReclaimable,
  categoryCount,
  scanPlan,
  narration,
  onScan,
  onCancelScan,
}: Props) {
  const score = healthScore ?? 0
  const colors = scoreColor(score)

  // Circumference of circle radius 50
  const circumference = 2 * Math.PI * 50
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference

  if (!hasScanned && !scanning) {
    return (
      <div className="bg-gradient-to-br from-primary/10 via-purple-50 to-blue-50 rounded-3xl p-8 border border-primary/20">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={36} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 mb-1">让 AI 帮你分析磁盘</h2>
            <p className="text-sm text-gray-600 mb-4">
              一键扫描系统临时文件、缓存、浏览器数据{aiEnabled && '，AI 智能推荐清理方案'}
            </p>
            <button
              onClick={onScan}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-medium hover:bg-primary-hover shadow-md hover:shadow-lg transition-all"
            >
              <Scan size={16} />
              开始扫描磁盘
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (scanning) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-card">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-3xl bg-primary-light flex items-center justify-center shrink-0">
            <RefreshCw size={28} className="text-primary animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              {scanPlan ? 'AI 正在引导扫描' : '正在扫描磁盘…'}
            </h2>
            {scanPlan && (
              <p className="text-sm text-purple-700 bg-purple-50 rounded-2xl px-3 py-2 mb-2 leading-relaxed">
                {scanPlan.intro}
              </p>
            )}
            {!scanPlan && (
              <p className="text-sm text-gray-500 mb-2">已发现 {categoryCount} 类可清理内容</p>
            )}

            {narration.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {narration.map((msg, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded px-2.5 py-1.5 animate-fade-in"
                  >
                    <Sparkles size={11} className="text-purple-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {!scanPlan && (
              <div className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                扫描进行中…
              </div>
            )}
          </div>
          <button
            onClick={onCancelScan}
            className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-600 rounded-2xl text-xs hover:bg-amber-100 transition-colors shrink-0"
          >
            <X size={14} />
            停止
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-card">
      <div className="flex items-center gap-6">
        {/* Score ring */}
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" strokeWidth="10" fill="none" className="stroke-gray-200" />
            <circle
              cx="60"
              cy="60"
              r="50"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={`${colors.ring} transition-all duration-1000`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-3xl font-bold ${colors.text}`}>{score}</div>
            <div className={`text-2xs font-medium ${colors.text}`}>{colors.label}</div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-lg font-bold text-gray-800">
              {insightsLoading ? '正在生成智能报告…' : headline || '磁盘健康度'}
            </h2>
            {insightsLoading && <RefreshCw size={14} className="text-purple-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">{summary}</p>

          <div className="flex items-center gap-4 text-xs">
            <div className={`px-2.5 py-1 rounded-2xl ${colors.bg}`}>
              <span className="text-gray-500">可释放</span>
              <span className={`ml-1.5 font-bold ${colors.text}`}>{formatSize(totalReclaimable)}</span>
            </div>
            <div className="px-2.5 py-1 rounded-2xl bg-gray-100">
              <span className="text-gray-500">类别</span>
              <span className="ml-1.5 font-bold text-gray-700">{categoryCount}</span>
            </div>
            <button
              onClick={onScan}
              className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors ml-auto"
              title="重新扫描"
            >
              <RefreshCw size={12} />
              重新扫描
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}