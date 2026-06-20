const { Lunar, Solar } = require('lunar-javascript')

export interface CalendarDay {
  year: number
  month: number
  day: number
  lunarYear: string
  lunarMonth: string
  lunarDay: string
  festival: string
  solarTerm: string
  isToday: boolean
}

export function getMonthData(y: number, m: number): CalendarDay[] {
  const days: CalendarDay[] = []
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`

  const firstDay = new Date(y, m - 1, 1)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = new Date(y, m, 0).getDate()

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(y, m - 1, -i)
    days.push(buildDay(d, todayStr))
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(buildDay(new Date(y, m - 1, d), todayStr))
  }

  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push(buildDay(new Date(y, m, d), todayStr))
  }

  return days
}

function buildDay(date: Date, todayStr: string): CalendarDay {
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    lunarYear: lunar.getYearInChinese(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    festival: lunar.getFestivals().join('、') || '',
    solarTerm: lunar.getJie() || lunar.getQi() || '',
    isToday: dateStr === todayStr,
  }
}
