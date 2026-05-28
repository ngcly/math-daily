/**
 * 获取今天的日期字符串 "2026-05-26"
 */
export function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 格式化显示日期 "2026年5月26日 · 星期二"
 */
export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr)
  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 · 星期${weeks[d.getDay()]}`
}

/**
 * 判断两个日期字符串是否是连续的两天
 */
export function isConsecutiveDay(prev: string, curr: string): boolean {
  const p = new Date(prev)
  const c = new Date(curr)
  p.setDate(p.getDate() + 1)
  return p.toDateString() === c.toDateString()
}

/**
 * 格式化秒数为 "3分42秒"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
}

/**
 * 获取本月第一天
 */
export function firstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1)
}

/**
 * 获取某月天数
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
