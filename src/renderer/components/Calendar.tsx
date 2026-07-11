import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Clock, CalendarDays } from 'lucide-react'
import type { CalendarDay, HistoryEvent } from '../../shared/types'
import ProgressBar from './ProgressBar'
import Modal from './Modal'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]

const TYPE_CN: Record<string, string> = { event: '事件', birth: '诞辰', death: '逝世' }

const TYPE_STYLE: Record<string, string> = {
  birth: 'text-emerald-600 bg-emerald-50',
  death: 'text-rose-600 bg-rose-50',
  event: 'text-blue-600 bg-blue-50',
}

export default function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState<CalendarDay[]>([])
  const [animating, setAnimating] = useState<'left' | 'right' | null>(null)
  const [historyDay, setHistoryDay] = useState<{ month: number; day: number } | null>(null)
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const loadMonth = useCallback(async () => {
    const res = await window.electronAPI.calendar.getMonth(year, month)
    if (res.ok) setDays(res.data)
  }, [year, month])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const goMonth = (dir: number) => {
    setAnimating(dir < 0 ? 'right' : 'left')
    setTimeout(() => setAnimating(null), 200)
    if (dir < 0) {
      if (month === 1) { setYear((y) => y - 1); setMonth(12) }
      else setMonth((m) => m - 1)
    } else {
      if (month === 12) { setYear((y) => y + 1); setMonth(1) }
      else setMonth((m) => m + 1)
    }
  }

  const goToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  const openHistory = async (d: CalendarDay) => {
    if (d.month !== month) return
    setHistoryDay({ month: d.month, day: d.day })
    setLoadingHistory(true)
    setHistoryError('')
    const res = await window.electronAPI.calendar.getHistory(d.month, d.day)
    setLoadingHistory(false)
    if (res.ok) {
      setHistoryEvents(res.data)
      if (res.data.length === 0) setHistoryError('该日期暂无历史事件')
    } else {
      setHistoryError(res.error || '获取失败')
    }
  }

  const isToday = (d: CalendarDay) =>
    d.year === now.getFullYear() && d.month === now.getMonth() + 1 && d.day === now.getDate()

  const isWeekend = (i: number) => i % 7 === 0 || i % 7 === 6

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 flex items-center justify-center">
            <CalendarDays size={18} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">万年历</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToday}
            className="px-3.5 py-1.5 text-xs font-medium text-primary bg-primary/5 border border-primary/20 rounded-2xl hover:bg-primary-light transition-colors"
          >
            今天
          </button>
          <button
            onClick={() => goMonth(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold text-gray-800 w-[130px] text-center select-none tracking-wide">
            {year}年 {MONTHS[month - 1]}
          </span>
          <button
            onClick={() => goMonth(1)}
            className="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500 hover:text-gray-700"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {/* Calendar grid */}
      <div
        className={`bg-white border border-gray-200 shadow-card overflow-hidden transition-all duration-200 ${
          animating === 'left'
            ? 'opacity-0 translate-x-2'
            : animating === 'right'
              ? 'opacity-0 -translate-x-2'
              : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2.5 text-center text-xs font-semibold tracking-wide ${
                i === 0 || i === 6
                  ? 'text-gray-400 bg-gray-50'
                  : 'text-gray-500'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const otherMonth = d.month !== month
            const today = isToday(d)
            const weekend = isWeekend(i)
            const lastInRow = i % 7 === 6

            return (
              <div
                key={i}
                onDoubleClick={() => openHistory(d)}
                className={`relative p-1.5 border-b border-r border-gray-100 min-h-[88px] transition-colors duration-150 cursor-pointer ${
                  lastInRow ? 'border-r-0' : ''
                } ${
                  otherMonth ? 'bg-gray-50/60' : 'hover:bg-gray-50'
                }`}
              >
                {/* Day number */}
                <div className="flex justify-center mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold transition-colors ${
                      today
                        ? 'bg-primary text-white shadow shadow-primary/20 rounded-full'
                        : otherMonth
                          ? 'text-gray-300'
                          : weekend
                            ? 'text-gray-500'
                            : 'text-gray-800'
                    }`}
                  >
                    {d.day}
                  </span>
                </div>

                {/* Lunar / solar term / festival */}
                {!otherMonth && (
                  <div className="flex flex-col items-center gap-0.5">
                    {d.solarTerm ? (
                      <span className="text-2xs font-bold text-primary bg-primary/10 px-1 py-px leading-tight">
                        {d.solarTerm}
                      </span>
                    ) : (
                      <span className="text-2xs text-gray-400 leading-tight">
                        {d.lunarDay}
                      </span>
                    )}
                    {d.festival && (
                      <span className="text-[9px] font-semibold text-rose-500 truncate max-w-full leading-tight">
                        {d.festival}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Today hint at bottom */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
        <span className="inline-block w-1.5 h-1.5 bg-primary" />
        双击日期查看历史上的今天
      </div>

      </div>
      {/* History modal */}
      {historyDay && (
        <Modal open={true} onClose={() => { setHistoryDay(null); setHistoryEvents([]) }} width="w-[520px] max-h-[75vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Clock size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 leading-tight">
                  {historyDay.month}月{historyDay.day}日
                </h3>
                <p className="text-xs text-gray-400">历史上的今天</p>
              </div>
            </div>
            <button
              onClick={() => { setHistoryDay(null); setHistoryEvents([]) }}
              className="p-1.5 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loadingHistory ? (
              <div className="flex justify-center py-10">
                <ProgressBar label="加载历史事件..." />
              </div>
            ) : historyEvents.length > 0 ? (
              <div className="space-y-1">
                {historyEvents.map((e, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-3.5 hover:bg-gray-50 transition-colors group/item"
                  >
                    {/* Year badge */}
                    <div className="shrink-0 flex flex-col items-center min-w-[3rem]">
                      <span className="text-sm font-bold text-primary tabular-nums">{e.year}</span>
                      {e.type && (
                        <span className={`text-[10px] font-medium mt-1 px-1.5 py-0.5 ${TYPE_STYLE[e.type] || 'text-gray-500 bg-gray-100'}`}>
                          {TYPE_CN[e.type] || e.type}
                        </span>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm font-semibold text-gray-800 leading-snug group-hover/item:text-primary transition-colors">
                        {e.title}
                      </div>
                      {e.desc && (
                        <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                          {e.desc}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm py-10">
                {historyError || '暂无历史事件记录'}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
