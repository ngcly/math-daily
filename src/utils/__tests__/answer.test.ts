import { describe, it, expect } from 'vitest'
import { normalizeAnswer, checkFillAnswer } from '../answer'

describe('normalizeAnswer', () => {
  it('去除首尾空格', () => {
    expect(normalizeAnswer('  42  ')).toBe('42')
  })

  it('转小写', () => {
    expect(normalizeAnswer('ABC')).toBe('abc')
  })

  it('去除常见单位后缀', () => {
    expect(normalizeAnswer('5个')).toBe('5')
    expect(normalizeAnswer('3天')).toBe('3')
    expect(normalizeAnswer('100元')).toBe('100')
    expect(normalizeAnswer('10米')).toBe('10')
    expect(normalizeAnswer('60秒')).toBe('60')
    expect(normalizeAnswer('100步')).toBe('100')
    expect(normalizeAnswer('3只')).toBe('3')
  })

  it('单位不影响中间字符', () => {
    // "三角形" 不应去掉 "形"，因为 "形" 不在单位列表末尾
    expect(normalizeAnswer('三角形')).toBe('三角形')
  })

  it('百分号转小数', () => {
    expect(normalizeAnswer('50%')).toBe('0.5')
    expect(normalizeAnswer('12.5%')).toBe('0.125')
    expect(normalizeAnswer('100%')).toBe('1')
  })

  it('分数转小数', () => {
    expect(normalizeAnswer('1/2')).toBe('0.5')
    expect(normalizeAnswer('1/8')).toBe('0.125')
    expect(normalizeAnswer('3/4')).toBe('0.75')
    expect(normalizeAnswer('1／2')).toBe('0.5') // 中文斜杠
  })

  it('分数除零返回原值', () => {
    expect(normalizeAnswer('1/0')).toBe('1/0')
  })

  it('纯数字去掉多余零', () => {
    expect(normalizeAnswer('1.0')).toBe('1')
    expect(normalizeAnswer('2.500')).toBe('2.5')
    expect(normalizeAnswer('100')).toBe('100')
  })

  it('非数字字符串原样返回', () => {
    expect(normalizeAnswer('hello')).toBe('hello')
    expect(normalizeAnswer('答案')).toBe('答案')
  })

  it('负数分数', () => {
    expect(normalizeAnswer('-1/2')).toBe('-0.5')
  })
})

describe('checkFillAnswer', () => {
  it('精确匹配', () => {
    expect(checkFillAnswer('42', '42')).toBe(true)
  })

  it('去除单位后匹配', () => {
    expect(checkFillAnswer('42个', '42')).toBe(true)
  })

  it('等价答案', () => {
    expect(checkFillAnswer('0.5', '1/2', ['0.5'])).toBe(true)
    expect(checkFillAnswer('50%', '0.5')).toBe(true)
  })

  it('不匹配', () => {
    expect(checkFillAnswer('3', '42')).toBe(false)
    expect(checkFillAnswer('错误答案', '正确答案')).toBe(false)
  })
})
