import { useState, useEffect, useRef } from 'react'
import { Clock, Timer, TimerReset, Play, Pause, RotateCcw, Flag } from 'lucide-react'

const fmt = (n: number) => String(Math.floor(n)).padStart(2, '0')

export default function ClockTimer() {
  const [now, setNow] = useState(new Date())
  const [timezone, setTimezone] = useState('')
  const [cdSecs, setCdSecs] = useState(0)
  const [cdRunning, setCdRunning] = useState(false)
  const cdRef = useRef(0)
  const cdIntervalRef = useRef<ReturnType<typeof setInterval>>()

  const [swMillis, setSwMillis] = useState(0)
  const [swRunning, setSwRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const swStartRef = useRef(0)
  const swElapsedRef = useRef(0)
  const swIntervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    window.electronAPI.clock.getTimezone().then((res) => {
      if (res.ok) setTimezone(res.data)
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (cdRunning) {
      cdIntervalRef.current = setInterval(() => {
        cdRef.current -= 1
        setCdSecs(cdRef.current)
        if (cdRef.current <= 0) setCdRunning(false)
      }, 1000)
    }
    return () => { if (cdIntervalRef.current) { clearInterval(cdIntervalRef.current); cdIntervalRef.current = undefined } }
  }, [cdRunning])

  useEffect(() => {
    if (swRunning) {
      swStartRef.current = performance.now() - swElapsedRef.current
      swIntervalRef.current = setInterval(() => {
        swElapsedRef.current = performance.now() - swStartRef.current
        setSwMillis(swElapsedRef.current)
      }, 50)
    }
    return () => { if (swIntervalRef.current) { clearInterval(swIntervalRef.current); swIntervalRef.current = undefined } }
  }, [swRunning])

  const cdStart = () => {
    const input = document.getElementById('cd-input') as HTMLInputElement
    const s = parseInt(input?.value || '0')
    if (s > 0) { cdRef.current = s; setCdSecs(s); setCdRunning(true) }
  }

  const swToggle = () => {
    if (swRunning) {
      swElapsedRef.current = performance.now() - swStartRef.current
      setSwRunning(false)
    } else {
      setSwRunning(true)
    }
  }

  const swReset = () => {
    setSwRunning(false)
    swElapsedRef.current = 0
    setSwMillis(0)
    setLaps([])
  }

  const swLap = () => {
    setLaps((prev) => [...prev, swElapsedRef.current])
  }

  const time = `${fmt(now.getHours())}:${fmt(now.getMinutes())}:${fmt(now.getSeconds())}`
  const date = `${now.getFullYear()}/${fmt(now.getMonth() + 1)}/${fmt(now.getDate())}`
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

  const cdH = Math.floor(cdSecs / 3600)
  const cdM = Math.floor((cdSecs % 3600) / 60)
  const cdS = cdSecs % 60

  const totalMs = swMillis
  const swMin = Math.floor(totalMs / 60000)
  const swSec = Math.floor((totalMs % 60000) / 1000)
  const swMs = Math.floor((totalMs % 1000) / 10)

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">时钟计时</h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <Clock size={20} />
            <span className="text-sm font-medium">当前时间</span>
          </div>
          <div className="text-3xl font-mono font-bold text-gray-800 mb-2">{time}</div>
          <div className="text-sm text-gray-500">{date} {weekdays[now.getDay()]}</div>
          <div className="mt-3 text-xs text-gray-400">时区: {timezone || '--'}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <Timer size={20} />
            <span className="text-sm font-medium">倒计时</span>
          </div>
          <div className={`text-4xl font-mono font-bold mb-4 ${cdRunning ? 'text-primary' : 'text-gray-800'}`}>
            {fmt(cdH)}:{fmt(cdM)}:{fmt(cdS)}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cd-input"
              type="number"
              defaultValue="60"
              placeholder="秒"
              disabled={cdRunning}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && cdStart()}
            />
            <button onClick={cdRunning ? () => setCdRunning(false) : cdStart}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white transition-colors shadow-sm ${cdRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary-hover'}`}>
              {cdRunning ? <Pause size={14} /> : <Play size={14} />}
              {cdRunning ? '暂停' : '开始'}
            </button>
            <button onClick={() => { setCdRunning(false); setCdSecs(0) }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              <RotateCcw size={14} />
              重置
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 flex flex-col">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <TimerReset size={20} />
            <span className="text-sm font-medium">秒表</span>
          </div>
          <div className={`text-4xl font-mono font-bold mb-4 ${swRunning ? 'text-emerald-600' : 'text-gray-800'}`}>
            {fmt(swMin)}:{fmt(swSec)}.{fmt(swMs)}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={swToggle}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white transition-colors shadow-sm ${swRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
              {swRunning ? <Pause size={14} /> : <Play size={14} />}
              {swRunning ? '暂停' : '开始'}
            </button>
            <button onClick={swLap} disabled={!swRunning}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              <Flag size={14} />
              计次
            </button>
            <button onClick={swReset}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              <RotateCcw size={14} />
              重置
            </button>
          </div>
          {laps.length > 0 && (
            <div className="flex-1 overflow-y-auto mt-2 space-y-1 max-h-32">
              {laps.map((lap, i) => {
                const m = Math.floor(lap / 60000)
                const s = Math.floor((lap % 60000) / 1000)
                const ms = Math.floor((lap % 1000) / 10)
                return (
                  <div key={i} className="flex items-center justify-between text-xs font-mono text-gray-500 px-2 py-1 bg-gray-50 rounded">
                    <span>#{laps.length - i}</span>
                    <span>{fmt(m)}:{fmt(s)}.{fmt(ms)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}