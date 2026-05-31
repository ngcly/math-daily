import type { Question, SubmitPayload, SubmitResult, UserRecord, UserProfile, HistoryDetail } from '@/types'
import { today } from '@/utils/date'

/** 重试配置 */
const RETRY_MAX = 2
const RETRY_BASE_MS = 1000

/** 简易 sleep */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 云函数业务错误（非网络异常，不重试） */
class CloudBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CloudBusinessError'
  }
}

/**
 * 通用云函数调用封装，网络异常时自动指数退避重试
 * - 仅对网络/超时类异常重试，业务错误（result.code !== 0）直接抛出
 * - 指数退避 + 随机 jitter，最大 2 次重试
 */
async function callCloud<T>(name: string, data: Record<string, any> = {}): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const res = await wx.cloud.callFunction({ name, data })
      const result = res.result as { code: number; data: T; message?: string }

      if (result.code !== 0) {
        // 业务错误直接抛出，不重试（注意此处用自定义类与网络异常区分）
        throw new CloudBusinessError(result.message || `云函数 ${name} 调用失败`)
      }
      return result.data
    } catch (e) {
      // 业务错误直接透传
      if (e instanceof CloudBusinessError) throw e

      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < RETRY_MAX) {
        const jitter = Math.random() * 0.3 + 0.85          // 0.85～1.15
        const delay = Math.round(RETRY_BASE_MS * Math.pow(2, attempt) * jitter)
        console.warn(`[callCloud] ${name} 失败，${delay}ms 后重试 (${attempt + 1}/${RETRY_MAX})`, lastError.message)
        await sleep(delay)
      }
    }
  }

  throw lastError ?? new Error(`云函数 ${name} 调用失败（已重试 ${RETRY_MAX} 次）`)
}

// ─────────────────────────────────────
// 题目相关
// ─────────────────────────────────────

/** 获取今日题目（不含答案字段）
 *  由客户端计算"今天"的日期（用户设备时区），传给云函数
 *  避免云函数运行在 UTC 时区导致的日期错位 */
export const getTodayQuestion = () =>
  callCloud<Question>('getTodayQuestion', { date: today() })

/** 按日期获取题目（补签用，不含答案字段） */
export const getQuestionByDate = (date: string) =>
  callCloud<Question>('getQuestionByDate', { date })

/** 提交答案，返回判题结果和解析 */
export const submitAnswer = (payload: SubmitPayload) =>
  callCloud<SubmitResult>('submitAnswer', payload)

// ─────────────────────────────────────
// 用户相关
// ─────────────────────────────────────

/** 获取或初始化用户 Profile */
export const initUser = () =>
  callCloud<UserProfile>('initUser')

/** 获取用户历史记录 */
export const getUserHistory = (params: { year: number; month: number }) =>
  callCloud<UserRecord[]>('getUserHistory', params)

/** 获取历史回顾详情（含题目解析，仅已答题日期可调用） */
export const getHistoryDetail = (date: string) =>
  callCloud<HistoryDetail>('getHistoryDetail', { date })

/** 更新用户设置 */
export const updateSettings = (settings: Partial<UserProfile>) =>
  callCloud<void>('updateSettings', settings)

// ─────────────────────────────────────
// 埋点
// ─────────────────────────────────────

/** 行为事件埋点（fire-and-forget，失败静默丢弃） */
export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  callCloud<void>('logEvent', { event, data }).catch(() => {})
}

// ─────────────────────────────────────
// 用户反馈
// ─────────────────────────────────────

export type FeedbackCategory = 'bug' | 'content' | 'feature' | 'other'

/** 提交用户反馈 */
export const submitFeedback = (category: FeedbackCategory, content: string) =>
  callCloud<void>('submitFeedback', { category, content })
