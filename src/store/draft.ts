import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Stroke, CanvasTransform, DraftData } from '@/types'

const STORAGE_PREFIX = 'draft_'
const MAX_STORED_DRAFTS = 30 // 最多保留30天草稿

export const useDraftStore = defineStore('draft', () => {
  // ── State（运行时，不持久化到 pinia，直接用 wx.Storage）──
  const strokes      = ref<Stroke[]>([])
  const currentQId   = ref('')
  const isDirty      = ref(false)   // 是否有未保存的更改

  // ── Actions ──

  /** 加载指定题目的草稿 */
  function load(questionId: string) {
    currentQId.value = questionId
    const raw = wx.getStorageSync(`${STORAGE_PREFIX}${questionId}`)
    if (raw) {
      try {
        const data: DraftData = JSON.parse(raw)
        strokes.value = data.strokes
        return data  // 返回完整数据（包含 transform），由 SketchPad 组件处理
      } catch {
        strokes.value = []
      }
    } else {
      strokes.value = []
    }
    return null
  }

  /** 保存草稿（每笔结束时调用） */
  function save(questionId: string, data: DraftData) {
    strokes.value = data.strokes
    isDirty.value = false
    try {
      wx.setStorageSync(`${STORAGE_PREFIX}${questionId}`, JSON.stringify(data))
    } catch (e) {
      console.warn('[DraftStore] save failed', e)
    }
  }

  /** 清空当前草稿 */
  function clear(questionId: string) {
    strokes.value = []
    isDirty.value = false
    wx.removeStorageSync(`${STORAGE_PREFIX}${questionId}`)
  }

  /** 清理过期草稿（按 savedAt 保留最近 MAX_STORED_DRAFTS 条） */
  function cleanup() {
    try {
      const info = wx.getStorageInfoSync()
      const draftKeys = info.keys.filter(k => k.startsWith(STORAGE_PREFIX))

      const draftsWithTime = draftKeys.map(k => {
        try {
          const data: DraftData = JSON.parse(wx.getStorageSync(k))
          return { key: k, savedAt: data?.savedAt ?? 0 }
        } catch {
          return { key: k, savedAt: 0 }
        }
      })

      draftsWithTime
        .sort((a, b) => b.savedAt - a.savedAt)  // 最新在前
        .slice(MAX_STORED_DRAFTS)
        .forEach(({ key }) => wx.removeStorageSync(key))
    } catch {
      // 清理失败不影响主流程
    }
  }

  /** 清空所有草稿 */
  function clearAll() {
    try {
      const info = wx.getStorageInfoSync()
      info.keys
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .forEach(k => wx.removeStorageSync(k))
      strokes.value = []
      isDirty.value = false
    } catch {
      // 清空失败不影响主流程
    }
  }

  return {
    strokes,
    currentQId,
    isDirty,
    load,
    save,
    clear,
    clearAll,
    cleanup,
  }
})
