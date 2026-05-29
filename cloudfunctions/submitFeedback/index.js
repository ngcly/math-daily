/**
 * 云函数：submitFeedback
 * 将用户反馈写入 feedback 集合
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const VALID_CATEGORIES = ['bug', 'content', 'feature', 'other']
const MAX_LENGTH = 500

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { category, content } = event

  if (!VALID_CATEGORIES.includes(category)) {
    return { code: 400, message: '分类参数错误', data: null }
  }

  const text = (content || '').trim()
  if (!text) {
    return { code: 400, message: '反馈内容不能为空', data: null }
  }
  if (text.length > MAX_LENGTH) {
    return { code: 400, message: '内容过长', data: null }
  }

  await db.collection('feedback').add({
    data: {
      openid:     OPENID,
      category,
      content:    text,
      created_at: db.serverDate(),
    },
  })

  return { code: 0, data: null }
}
