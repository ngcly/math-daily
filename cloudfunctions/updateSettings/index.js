/**
 * 云函数：updateSettings
 * 更新当前用户的 profile 字段（streak、remind_time、偏好等）
 * 只更新调用方传入的字段，不覆盖其他字段
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 允许前端写入的白名单字段，防止意外覆盖 _id / created_at
const ALLOWED_FIELDS = [
  'nickname',
  'avatar_url',
  'streak',
  'streak_rescue',
  'remind_time',
  'subscribed',
  'pref_categories',
  'pref_difficulty',
]

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  console.log('[updateSettings] OPENID:', OPENID, 'event:', JSON.stringify(event))

  // 只保留白名单字段
  const update = {}
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(event, key)) {
      update[key] = event[key]
    }
  }

  if (Object.keys(update).length === 0) {
    console.log('[updateSettings] 无白名单字段可更新')
    return { code: 0, data: null }
  }

  const collection = db.collection('user_profiles')

  try {
    // 先确认文档是否存在，不存在则用 initUser 相同的结构创建
    const existRes = await collection.where({ _id: OPENID }).count()
    console.log('[updateSettings] 文档计数:', existRes.total)
    if (existRes.total === 0) {
      const newProfile = {
        _id:              OPENID,
        nickname:         update.nickname ?? '',
        avatar_url:       update.avatar_url ?? '',
        remind_time:      update.remind_time ?? '08:00',
        subscribed:       update.subscribed ?? false,
        streak:           update.streak ?? 0,
        streak_rescue:    update.streak_rescue ?? 1,
        pref_categories:  update.pref_categories ?? [],
        pref_difficulty:  update.pref_difficulty ?? null,
        created_at:       db.serverDate(),
      }
      const addRes = await collection.add({ data: newProfile })
      console.log('[updateSettings] 文档不存在，已重建, _id:', addRes._id)
      return { code: 0, data: null }
    }

    // 文档存在，执行更新
    const updateRes = await collection.doc(OPENID).update({ data: update })
    console.log('[updateSettings] 更新结果:', JSON.stringify(updateRes))

    // wx-server-sdk update 返回 { stats: { updated: 1 } } 表示修改了数据
    // updated: 0 是正常的——说明新旧数据完全一致，无需实际写入
    if (updateRes.stats && updateRes.stats.updated >= 0) {
      return { code: 0, data: null }
    }

    console.error('[updateSettings] 更新异常：stats 缺失, OPENID:', OPENID, 'res:', JSON.stringify(updateRes))
    return { code: 500, message: '更新结果异常', data: null }
  } catch (e) {
    console.error('[updateSettings] 写入失败:', e.message, 'OPENID:', OPENID)
    return { code: 500, message: e.message, data: null }
  }
}
