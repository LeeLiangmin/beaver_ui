import { useState, useEffect, useRef } from 'react'
import { Clock, Timer, Play, Pause, RotateCcw } from 'lucide-react'

export default function ClockTimer() {
  const [timeStr, setTimeStr] = useState('')
  const [timezone, setTimezone] = useState('')
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [inputSeconds, setInputSeconds] = useState('')
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    window.electronAPI.clock.getTimezone().then((res) => {
      if (res.ok) setTimezone(res.data)
    })
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTimeStr(
        now.toLocaleTimeString('zh-CN', { hour12: false }) +
        ' ' +
        now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
      )
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (running && countdownSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            setRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const startCountdown = () => {
    const secs = parseInt(inputSeconds)
    if (secs > 0) {
      setCountdownSeconds(secs)
      setRunning(true)
    }
  }

  const formatCountdown = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-6">时钟计时</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <Clock size={20} />
            <span className="text-sm font-medium">当前时间</span>
          </div>
          <div className="text-3xl font-mono font-bold text-gray-800 mb-2">{timeStr.split(' ')[0] || '--:--:--'}</div>
          <div className="text-sm text-gray-500">{timeStr.split(' ').slice(1).join(' ') || ''}</div>
          <div className="mt-3 text-xs text-gray-400">时区: {timezone || '--'}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <Timer size={20} />
            <span className="text-sm font-medium">倒计时</span>
          </div>
          <div className="text-4xl font-mono font-bold text-gray-800 mb-4">
            {formatCountdown(countdownSeconds)}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={inputSeconds}
              onChange={(e) => setInputSeconds(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startCountdown()}
              placeholder="秒数"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:border-blue-400"
              disabled={running}
            />
            <button
              onClick={running ? () => setRunning(false) : startCountdown}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white transition-colors ${
                running ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? '暂停' : '开始'}
            </button>
            <button
              onClick={() => { setRunning(false); setCountdownSeconds(0); setInputSeconds('') }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={14} />
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
