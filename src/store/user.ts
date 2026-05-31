import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile, Category, Difficulty } from '@/types'
import { initUser, updateSettings } from '@/api/cloud'
import { today, isConsecutiveDay, dateToStr } from '@/utils/date'

function dayBefore(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return dateToStr(d)
}

export const useUserStore = defineStore('user', () => {
  // ── State ──
  const profile = ref<UserProfile | null>(null)
  const lastActiveDate      = ref<string>('')   // 持久化：最后一次完成题目的日期
  const lastCheckDate       = ref<string>('')   // 持久化：最后一次执行断签检测的日期
  const lastRescueResetMonth = ref<string>('')  // 持久化："YYYY-MM"，已重置过补签的月份

  // ── Getters ──
  const streak = computed(() => profile.value?.streak ?? 0)
  const isLoggedIn = computed(() => !!profile.value)

  /**
   * 可补签的日期：恰好漏了昨天（lastActiveDate + 1 = 昨天）且有补签机会
   * 返回空字符串表示不可补签
   */
  const pendingRescueDate = computed((): string => {
    if (!profile.value || !lastActiveDate.value) return ''
    if (profile.value.streak_rescue <= 0) return ''
    const todayStr = today()
    if (lastActiveDate.value === todayStr) return ''
    if (isConsecutiveDay(lastActiveDate.value, todayStr)) return ''
    const yesterdayStr = dayBefore(todayStr)
    return isConsecutiveDay(lastActiveDate.value, yesterdayStr) ? yesterdayStr : ''
  })

  // ── Actions ──

  /** 首次启动时初始化用户（静默登录，无需注册） */
  async function init() {
    try {
      profile.value = await initUser()
      // onShow 触发时 profile 尚未加载，须在加载完成后补跑一次
      checkStreak()
    } catch (e) {
      console.error('[UserStore] init failed', e)
    }
  }

  /**
   * 每次 App onShow 时检查是否跨天
   * 若跨了一天以上且没有补签，streak 归零；同时处理补签机会每月重置
   */
  function checkStreak() {
    if (!profile.value) return
    const todayStr = today()
    if (lastCheckDate.value === todayStr) return
    lastCheckDate.value = todayStr

    // 每月重置一次补签机会（"YYYY-MM" 对比）
    const currentMonth = todayStr.slice(0, 7)
    if (lastRescueResetMonth.value !== currentMonth) {
      lastRescueResetMonth.value = currentMonth
      if (profile.value.streak_rescue < 1) {
        profile.value.streak_rescue = 1
        syncProfile()
      }
    }

    if (!lastActiveDate.value) return
    if (isConsecutiveDay(lastActiveDate.value, todayStr)) return

    if (profile.value.streak > 0) {
      const yesterdayStr = dayBefore(todayStr)
      // 恰好漏了昨天 + 有补签机会 → 保留 streak，等用户主动补签
      const canRescue = isConsecutiveDay(lastActiveDate.value, yesterdayStr)
        && profile.value.streak_rescue > 0
      if (!canRescue) {
        profile.value.streak = 0
        syncProfile()
      }
    }
  }

  /** 补签成功后调用：修复 streak、消耗补签机会 */
  function useRescue(rescuedDate: string) {
    if (!profile.value) return
    profile.value.streak += 1
    profile.value.streak_rescue -= 1
    lastActiveDate.value = rescuedDate
    syncProfile()
  }

  /** 答题成功后更新 streak */
  function onCompleted() {
    if (!profile.value) return
    const todayStr = today()

    if (lastActiveDate.value !== todayStr) {
      // 今天第一次完成
      const consecutive = !lastActiveDate.value
        || isConsecutiveDay(lastActiveDate.value, todayStr)

      profile.value.streak = consecutive ? profile.value.streak + 1 : 1
      lastActiveDate.value = todayStr
      syncProfile()
    }
  }

  /** 更新设置 */
  async function updatePrefs(prefs: {
    nickname?: string
    avatar_url?: string
    remind_time?: string
    pref_categories?: Category[]
    pref_difficulty?: Difficulty | null
    subscribed?: boolean
  }) {
    if (!profile.value) return
    Object.assign(profile.value, prefs)
    await updateSettings(prefs)
  }

  /** 同步 profile 到云端（防抖，避免频繁写） */
  let syncTimer: ReturnType<typeof setTimeout> | null = null
  function syncProfile() {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      if (profile.value) {
        updateSettings({
          streak: profile.value.streak,
          streak_rescue: profile.value.streak_rescue,
        }).catch(console.error)
      }
    }, 1000)
  }

  return {
    profile,
    streak,
    isLoggedIn,
    pendingRescueDate,
    init,
    checkStreak,
    onCompleted,
    useRescue,
    updatePrefs,
  }
}, {
  unistorage: {
    paths: [
      'profile',
      'lastActiveDate',
      'lastCheckDate',
      'lastRescueResetMonth',
    ],
  },
})
