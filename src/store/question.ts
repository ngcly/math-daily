import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Question, SubmitPayload, SubmitResult } from '@/types'
import { getTodayQuestion, submitAnswer, getQuestionByDate } from '@/api/cloud'
import { useUserStore } from './user'
import { today } from '@/utils/date'

export const useQuestionStore = defineStore('question', () => {
  // ── State ──
  const todayQuestion = ref<Question | null>(null)
  const submitResult  = ref<SubmitResult | null>(null)
  const loading        = ref(false)
  const submitting     = ref(false)
  const hasSubmitted   = ref(false)   // 今天是否已作答（持久化）
  const submittedDate  = ref('')      // 已作答的日期，防止跨天误判
  const rescueQuestion = ref<Question | null>(null)   // 补签题目（临时）

  // ── Getters ──
  const isAnswered = computed(() => {
    // 跨天后重置
    return hasSubmitted.value && submittedDate.value === today()
  })

  const correctRate = computed(() => {
    const s = submitResult.value?.stats
    if (!s || s.total === 0) return 0
    return Math.round((s.correct / s.total) * 100)
  })

  // ── Actions ──

  // ── 本地缓存 key ──
  const QUESTION_CACHE_KEY = 'cache_today_question'

  /** 读取今日题目本地缓存，过期或无缓存返回 null */
  function readCache(): Question | null {
    try {
      const raw = uni.getStorageSync(QUESTION_CACHE_KEY) as { date: string; data: Question } | null
      return raw?.date === today() ? raw.data : null
    } catch {
      return null
    }
  }

  /** 写入今日题目本地缓存 */
  function writeCache(q: Question) {
    try {
      uni.setStorageSync(QUESTION_CACHE_KEY, { date: today(), data: q })
    } catch {
      // storage 写失败不影响主流程
    }
  }

  /**
   * 加载今日题目
   * 策略：stale-while-revalidate
   *   - 命中缓存 → 立即展示缓存内容，同时后台静默刷新
   *   - 未命中  → 显示 loading，等待云函数返回
   */
  async function loadToday() {
    if (loading.value) return

    const cached = readCache()
    if (cached) {
      // 有缓存：立即渲染，后台静默更新
      todayQuestion.value = cached
      getTodayQuestion()
        .then(fresh => {
          todayQuestion.value = fresh
          writeCache(fresh)
        })
        .catch(() => {/* 后台刷新失败，保留缓存数据，不弹 toast */})
      return
    }

    // 无缓存：正常 loading 流程
    loading.value = true
    try {
      const q = await getTodayQuestion()
      todayQuestion.value = q
      writeCache(q)
    } catch (e) {
      console.error('[QuestionStore] loadToday failed', e)
      uni.showToast({ title: '加载失败，请检查网络', icon: 'none' })
    } finally {
      loading.value = false
    }
  }

  /** 提交答案 */
  async function submit(payload: Omit<SubmitPayload, 'question_id' | 'date'>) {
    if (!todayQuestion.value || submitting.value) return
    submitting.value = true

    try {
      const fullPayload: SubmitPayload = {
        ...payload,
        question_id: todayQuestion.value._id,
        date: today(),
      }

      submitResult.value = await submitAnswer(fullPayload)
      hasSubmitted.value = true
      submittedDate.value = today()

      // 记录本周答题结果，供首页周历条展示
      try {
        const key = 'weekly_results'
        const prev: { date: string; is_correct: boolean }[] = uni.getStorageSync(key) || []
        const filtered = prev.filter(d => d.date !== today())
        filtered.unshift({ date: today(), is_correct: submitResult.value!.is_correct })
        uni.setStorageSync(key, filtered.slice(0, 30))
      } catch {}

      // 持久化用时，供 result 页显示（跨页面、跨进程均有效）
      try { uni.setStorageSync('last_time_spent', payload.time_spent ?? 0) } catch {}

      // 记录本次训练维度，供首页"最近训练的能力维度"展示
      try {
        const key  = 'recent_trained_dims'
        const prev: { date: string; category: string }[] =
          uni.getStorageSync(key) || []
        // 去重同一天的条目（一天只记一次），最多保留 30 条
        const filtered = prev.filter(d => d.date !== today())
        filtered.unshift({ date: today(), category: todayQuestion.value!.category })
        uni.setStorageSync(key, filtered.slice(0, 30))
      } catch {}

      // 通知 userStore 更新 streak
      const userStore = useUserStore()
      userStore.onCompleted()

      return submitResult.value
    } catch (e) {
      console.error('[QuestionStore] submit failed', e)
      uni.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      submitting.value = false
    }
  }

  /** 加载补签题目 */
  async function loadRescueQuestion(date: string) {
    rescueQuestion.value = null
    try {
      rescueQuestion.value = await getQuestionByDate(date)
    } catch (e) {
      console.error('[QuestionStore] loadRescueQuestion failed', e)
      uni.showToast({ title: '该日暂无题目', icon: 'none' })
    }
  }

  /** 提交补签答案，成功后由调用方修复 streak */
  async function submitRescue(
    payload: Omit<SubmitPayload, 'question_id' | 'date'>,
    rescueDate: string,
  ): Promise<boolean> {
    const q = rescueQuestion.value
    if (!q || submitting.value) return false
    submitting.value = true
    try {
      const fullPayload: SubmitPayload = {
        ...payload,
        question_id: q._id,
        date: rescueDate,
      }
      const result = await submitAnswer(fullPayload)
      return result.is_correct !== undefined  // 提交成功
    } catch (e) {
      console.error('[QuestionStore] submitRescue failed', e)
      uni.showToast({ title: '提交失败，请重试', icon: 'none' })
      return false
    } finally {
      submitting.value = false
    }
  }

  /** 刷新（强制清缓存重新加载） */
  async function refresh() {
    todayQuestion.value = null
    submitResult.value = null
    try { uni.removeStorageSync(QUESTION_CACHE_KEY) } catch { /* ignore */ }
    await loadToday()
  }

  return {
    todayQuestion,
    rescueQuestion,
    submitResult,
    loading,
    submitting,
    hasSubmitted,
    submittedDate,
    isAnswered,
    correctRate,
    loadToday,
    loadRescueQuestion,
    submit,
    submitRescue,
    refresh,
  }
}, {
  unistorage: {
    // submitResult 也持久化：重启 app 后 result 页仍可展示解析
    paths: ['hasSubmitted', 'submittedDate', 'submitResult'],
  },
})
