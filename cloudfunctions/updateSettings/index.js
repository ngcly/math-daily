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
  'streak',
  'streak_rescue',
  'remind_time',
  'subscribed',
  'pref_categories',
  'pref_difficulty',
]

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  // 只保留白名单字段
  const update = {}
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(event, key)) {
      update[key] = event[key]
    }
  }

  if (Object.keys(update).length === 0) {
    return { code: 0, data: null }
  }

  try {
    await db.collection('user_profiles').doc(OPENID).update({ data: update })
    return { code: 0, data: null }
  } catch (e) {
    return { code: 500, message: e.message, data: null }
  }
}
