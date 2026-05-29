import type { Question, SubmitPayload, SubmitResult, UserRecord, UserProfile, HistoryDetail } from '@/types'

/**
 * 通用云函数调用封装，统一处理错误
 */
async function callCloud<T>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  const res = await wx.cloud.callFunction({ name, data })
  const result = res.result as { code: number; data: T; message?: string }

  if (result.code !== 0) {
    throw new Error(result.message || `云函数 ${name} 调用失败`)
  }
  return result.data
}

// ─────────────────────────────────────
// 题目相关
// ─────────────────────────────────────

/** 获取今日题目（不含答案字段） */
export const getTodayQuestion = () =>
  callCloud<Question>('getTodayQuestion')

/** 按日期获取题目（补签用，不含答案字段） */
export const getQuestionByDate = (date: string) =>
  callCloud<Question>('getQuestionByDate', { date })

/** 提交答案，返回判题结果和解析 */
export const submitAnswer = (payload: SubmitPayload) =>
  callCloud<SubmitResult>('submitAnswer', payload as unknown as Record<string, unknown>)

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
  callCloud<void>('updateSettings', settings as unknown as Record<string, unknown>)

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
