/**
 * 云函数：logEvent
 * 轻量级行为事件记录，供产品分析使用
 *
 * 目前支持的事件类型：
 *   app_open  — 用户打开 app（前端去重，每用户每天最多一条）
 *              data: { scene: number, ref?: string }
 *   share     — 用户点击分享
 *              data: { question_id: string, type: 'friend' | 'timeline' }
 *
 * events 集合安全规则：write: auth，read: admin（云函数内查询）
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/** 获取按指定时区格式化的日期 YYYY-MM-DD */
function formatDateInTimezone(timeZone = 'Asia/Shanghai') {
  const f = new Intl.DateTimeFormat('zh-CN', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  return f.format(new Date()).replace(/\//g, '-')
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { event: eventName, data = {} } = event

  if (!eventName) return { code: 400, message: '缺少 event 参数', data: null }

  const date = formatDateInTimezone()

  await db.collection('events').add({
    data: {
      openid: OPENID,
      event:  eventName,
      date,
      ts:     db.serverDate(),
      data,
    },
  })

  return { code: 0, data: null }
}
