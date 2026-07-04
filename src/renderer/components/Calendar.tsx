import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react'
import type { CalendarDay, HistoryEvent } from '../../shared/types'
import ProgressBar from './ProgressBar'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
]

const TYPE_CN: Record<string, string> = { event: '事件', birth: '诞辰', death: '逝世' }

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
      if (month === 1) {
        setYear((y) => y - 1)
        setMonth(12)
      } else setMonth((m) => m - 1)
    } else {
      if (month === 12) {
        setYear((y) => y + 1)
        setMonth(1)
      } else setMonth((m) => m + 1)
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">万年历</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs text-primary border border-primary/30 rounded-lg hover:bg-primary-light transition-colors"
          >
            今天
          </button>
          <button
            onClick={() => goMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold text-gray-700 w-[120px] text-center select-none">
            {year}年 {MONTHS[month - 1]}
          </span>
          <button
            onClick={() => goMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        className={`bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden transition-all duration-200 ${
          animating === 'left'
            ? 'opacity-0 translate-x-2'
            : animating === 'right'
              ? 'opacity-0 -translate-x-2'
              : 'opacity-100 translate-x-0'
        }`}
      >
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                i === 0 || i === 6 ? 'text-rose-600' : 'text-gray-600'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const otherMonth = d.month !== month
            const today = isToday(d)
            const weekend = isWeekend(i)

            return (
              <div
                key={i}
                onDoubleClick={() => openHistory(d)}
                className={`relative p-2 border-b border-r border-gray-200 min-h-[88px] group transition-colors duration-150 ${
                  otherMonth ? 'bg-gray-50' : 'hover:bg-primary-light/30 cursor-pointer'
                } ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className="flex items-center justify-center mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
                      today
                        ? 'bg-primary text-white shadow-md shadow-primary/30 scale-110'
                        : otherMonth
                          ? 'text-gray-400'
                          : weekend
                            ? 'text-rose-600'
                            : 'text-gray-800'
                    }`}
                  >
                    {d.day}
                  </span>
                </div>

                {!otherMonth && (
                  <div className="flex flex-col items-center gap-0.5">
                    {d.solarTerm ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded leading-tight">
                        {d.solarTerm}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-600 font-medium leading-tight">
                        {d.lunarDay}
                      </span>
                    )}
                    {d.festival && (
                      <span className="text-[9px] font-semibold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded leading-tight truncate max-w-full">
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

      {historyDay && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={() => {
            setHistoryDay(null)
            setHistoryEvents([])
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-modal w-[520px] max-h-[75vh] flex flex-col animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-primary" />
                <h3 className="font-semibold text-gray-800 text-lg">
                  {historyDay.month}月{historyDay.day}日 · 历史上的今天
                </h3>
              </div>
              <button
                onClick={() => {
                  setHistoryDay(null)
                  setHistoryEvents([])
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingHistory ? (
                <div className="flex justify-center py-10">
                  <ProgressBar label="加载历史事件..." />
                </div>
              ) : historyEvents.length > 0 ? (
                <div className="space-y-4">
                  {historyEvents.map((e, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-right shrink-0 w-14">
                        <span className="text-sm font-bold text-primary">{e.year}</span>
                        {e.type && (
                          <div
                            className={`text-[10px] font-semibold mt-1 ${
                              e.type === 'birth'
                                ? 'text-emerald-600'
                                : e.type === 'death'
                                  ? 'text-rose-600'
                                  : 'text-gray-500'
                            }`}
                          >
                            {TYPE_CN[e.type] || e.type}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 leading-snug">
                          {e.title}
                        </div>
                        {e.desc && (
                          <div className="text-sm text-gray-500 mt-1.5 leading-relaxed">
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
          </div>
        </div>
      )}
    </div>
  )
}
