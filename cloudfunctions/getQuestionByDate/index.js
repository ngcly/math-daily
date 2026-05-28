/**
 * 云函数：getQuestionByDate
 * 按日期获取题目（补签场景），answer 字段同样不返回
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { date } = event

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { code: 400, message: '日期格式错误', data: null }
  }

  try {
    const res = await db.collection('questions')
      .where({ date })
      .field({
        answer:            false,
        answer_variants:   false,
        ai_grading_rubric: false,
      })
      .get()

    if (!res.data.length) {
      return { code: 404, message: '该日暂无题目', data: null }
    }

    return { code: 0, data: res.data[0] }
  } catch (e) {
    return { code: 500, message: e.message, data: null }
  }
}
