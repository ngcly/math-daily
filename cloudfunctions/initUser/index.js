/**
 * 云函数：initUser
 * 静默登录：用 openId 查找用户，不存在则创建
 * 前端无需任何注册流程
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 查找已有用户
    const res = await db.collection('user_profiles').doc(OPENID).get()
    return { code: 0, data: res.data }
  } catch {
    // 用户不存在，首次创建
    const newProfile = {
      _id:              OPENID,
      remind_time:      '08:00',
      subscribed:       false,
      streak:           0,
      streak_rescue:    1,    // 每月一次补签机会
      pref_categories:  [],
      pref_difficulty:  null,
      created_at:       db.serverDate(),
    }

    await db.collection('user_profiles').add({ data: newProfile })
    return { code: 0, data: newProfile }
  }
}
