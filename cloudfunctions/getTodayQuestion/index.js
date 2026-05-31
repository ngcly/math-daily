/**
 * 云函数：getTodayQuestion
 * 返回今日题目，answer 字段不返回给前端
 */
/**
 * 云函数：getTodayQuestion
 * 返回今日题目，answer 字段不返回给前端。
 * 日期由客户端根据设备时区传入，避免云函数 UTC 时区导致的日期错位。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/** 服务端兜底：用 Intl 取北京时间（Asia/Shanghai） */
function serverDateFallback() {
  const f = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
  return f.format(new Date()).replace(/\//g, '-')
}

exports.main = async (event) => {
  const date = event.date || serverDateFallback()

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
