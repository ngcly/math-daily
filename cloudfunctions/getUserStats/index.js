/**
 * 云函数：getUserStats
 * 返回当前用户的全局累计统计数据（总题数、总正确率、按分类细分）
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const res = await db.collection('user_records')
      .where({ openid: OPENID })
      .field({ category: true, is_correct: true })
      .limit(1000)
      .get()

    const records = res.data
    const total   = records.length
    const correct = records.filter(r => r.is_correct).length

    // 按分类汇总
    const map = {}
    for (const r of records) {
      if (!map[r.category]) map[r.category] = { total: 0, correct: 0 }
      map[r.category].total++
      if (r.is_correct) map[r.category].correct++
    }

    const by_category = Object.entries(map)
      .map(([category, s]) => ({ category, total: s.total, correct: s.correct }))
      .sort((a, b) => b.total - a.total)

    return { code: 0, data: { total, correct, by_category } }
  } catch (e) {
    return { code: 500, message: e.message, data: null }
  }
}
