import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDay } from '../../shared/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState<CalendarDay[]>([])

  const loadMonth = useCallback(async () => {
    const res = await window.electronAPI.calendar.getMonth(year, month)
    if (res.ok) setDays(res.data)
  }, [year, month])

  useEffect(() => { loadMonth() }, [loadMonth])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">万年历</h2>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium min-w-[100px] text-center">
            {year}年{month}月
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-3 py-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const isOtherMonth = d.month !== month
            return (
              <div
                key={i}
                className={`min-h-[80px] p-2 border-b border-r border-gray-100 text-sm ${
                  isOtherMonth ? 'bg-gray-50/50 text-gray-300' : ''
                } ${d.isToday ? 'bg-blue-50' : ''}`}
              >
                <div className={`flex items-center gap-1 ${d.isToday ? 'text-blue-600 font-bold' : ''}`}>
                  <span>{d.day}</span>
                </div>
                {!isOtherMonth && (
                  <div className="mt-1">
                    <div className={`text-xs ${d.solarTerm ? 'text-orange-500 font-medium' : 'text-gray-500'}`}>
                      {d.solarTerm || d.lunarDay}
                    </div>
                    {d.festival && (
                      <div className="text-xs text-red-500 truncate mt-0.5">{d.festival}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
