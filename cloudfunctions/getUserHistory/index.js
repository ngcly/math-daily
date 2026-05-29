/**
 * 云函数：getUserHistory
 * 返回指定月份的答题记录，用于日历和历史列表
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { year, month } = event

  const mm    = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const start = `${year}-${mm}-01`
  const end   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

  try {
    const res = await db.collection('user_records')
      .where({
        openid: OPENID,
        date: db.command.gte(start).and(db.command.lte(end)),
      })
      .orderBy('date', 'desc')
      .limit(50)
      .get()

    return { code: 0, data: res.data }
  } catch (e) {
    return { code: 500, message: e.message, data: [] }
  }
}
