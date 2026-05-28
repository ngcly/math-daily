/**
 * 云函数：getTodayQuestion
 * 返回今日题目，answer 字段不返回给前端
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  // 今日日期
  const now  = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  try {
    const res = await db.collection('questions')
      .where({ date })
      .field({
        // 明确排除 answer 字段，防止前端通过抓包获取
        answer: false,
        answer_variants: false,
        ai_grading_rubric: false,
      })
      .get()

    if (!res.data.length) {
      return { code: 404, message: '今日暂无题目', data: null }
    }

    return { code: 0, data: res.data[0] }
  } catch (e) {
    return { code: 500, message: e.message, data: null }
  }
}
