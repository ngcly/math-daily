/**
 * 云函数：getHistoryDetail
 * 用于"历史回顾"：验证用户已答过该日题目后，返回完整题目解析 + 答题记录
 * 因用户已提交过答案，此处允许返回 correct_answer 和解析字段
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { date } = event

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { code: 400, message: '日期格式错误', data: null }
  }

  try {
    // 1. 验证用户确实答过这道题（安全门禁）
    const recordRes = await db.collection('user_records')
      .where({ openid: OPENID, date })
      .limit(1)
      .get()

    if (!recordRes.data.length) {
      return { code: 404, message: '该日无答题记录', data: null }
    }

    const record = recordRes.data[0]

    // 2. 读取完整题目（已答题，可返回解析；仍排除原始答案和内部字段）
    const qRes = await db.collection('questions')
      .doc(record.question_id)
      .field({ answer_variants: false, ai_grading_rubric: false })
      .get()

    const q = qRes.data

    // answer 字段单独返回，不混入 question 对象（保持类型一致）
    const { answer, ...questionWithoutAnswer } = q

    return {
      code: 0,
      data: {
        record,
        question: questionWithoutAnswer,
        correct_answer: answer,
      },
    }
  } catch (e) {
    return { code: 500, message: e.message, data: null }
  }
}
