import { describe, it, expect } from 'vitest'
import { isConsecutiveDay, formatDisplayDate, formatDuration, daysInMonth, firstDayOfMonth, dateToStr } from '../date'

describe('dateToStr', () => {
  it('格式化为 YYYY-MM-DD', () => {
    expect(dateToStr(new Date('2026-05-26'))).toBe('2026-05-26')
    expect(dateToStr(new Date('2026-01-01'))).toBe('2026-01-01')
    expect(dateToStr(new Date('2026-12-31'))).toBe('2026-12-31')
  })
})

describe('formatDisplayDate', () => {
  it('格式化为中文日期 + 星期', () => {
    expect(formatDisplayDate('2026-05-26')).toMatch(/2026年5月26日/)
    expect(formatDisplayDate('2026-05-26')).toMatch(/星期[二二三四五六日]/)
  })

  it('一月一日正确显示', () => {
    const result = formatDisplayDate('2026-01-01')
    expect(result).toContain('2026年1月1日')
  })
})

describe('isConsecutiveDay', () => {
  it('连续两天返回 true', () => {
    expect(isConsecutiveDay('2026-05-25', '2026-05-26')).toBe(true)
  })

  it('同一天返回 false', () => {
    expect(isConsecutiveDay('2026-05-26', '2026-05-26')).toBe(false)
  })

  it('间隔一天返回 false', () => {
    expect(isConsecutiveDay('2026-05-24', '2026-05-26')).toBe(false)
  })

  it('跨月连续', () => {
    expect(isConsecutiveDay('2026-05-31', '2026-06-01')).toBe(true)
  })

  it('跨年连续', () => {
    expect(isConsecutiveDay('2025-12-31', '2026-01-01')).toBe(true)
  })
})

describe('formatDuration', () => {
  it('少于60秒返回秒', () => {
    expect(formatDuration(30)).toBe('30秒')
    expect(formatDuration(59)).toBe('59秒')
  })

  it('整分钟', () => {
    expect(formatDuration(120)).toBe('2分钟')
    expect(formatDuration(60)).toBe('1分钟')
  })

  it('分钟 + 秒', () => {
    expect(formatDuration(90)).toBe('1分30秒')
    expect(formatDuration(185)).toBe('3分5秒')
  })
})

describe('firstDayOfMonth', () => {
  it('返回当月第一天', () => {
    const d = firstDayOfMonth(2026, 5)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4) // 0-indexed
    expect(d.getDate()).toBe(1)
  })
})

describe('daysInMonth', () => {
  it('大月31天', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 5)).toBe(31)
    expect(daysInMonth(2026, 12)).toBe(31)
  })

  it('小月30天', () => {
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 9)).toBe(30)
  })

  it('二月平年28天', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
  })

  it('二月闰年29天', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2000, 2)).toBe(29)
  })
})
