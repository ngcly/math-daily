/**
 * 云函数：sendDailyPush
 * 触发方式：定时触发器，每小时整点执行
 * 找出该小时应该收到提醒的用户，批量发送订阅消息
 *
 * 定时触发器配置（在微信云开发控制台设置）：
 * 0 * * * * * （每小时第0分触发）
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 订阅消息模板 ID（在微信公众平台申请后替换）
const TEMPLATE_ID = 'KiJLSpuOmVhQ5RJh5LqkQbMrfWYqkUVIHj2C1Dy4k78'

exports.main = async () => {
  const now  = new Date()
  const hour = String(now.getHours()).padStart(2, '0')
  const currentTime = `${hour}:00`   // 匹配用户设置的整点时间

  // 查找该时间点应该推送的已订阅用户
  const res = await db.collection('user_profiles')
    .where({
      subscribed:   true,
      remind_time:  currentTime,
    })
    .limit(100)  // 每次最多100个，云函数单次执行时间有限制
    .get()

  if (!res.data.length) return { sent: 0 }

  // 今日题目摘要（用于推送文案）
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const qRes  = await db.collection('questions')
    .where({ date: today })
    .field({ title: true, category: true })
    .get()

  const question = qRes.data[0]
  const qTitle   = question?.title    || '今天的题目已出炉'
  const category = question?.category || '思维训练'

  // 批量发送
  let sent = 0
  for (const user of res.data) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser:     user._id,   // _id = openId
        templateId: TEMPLATE_ID,
        page:       'pages/index/index',
        data: {
          thing1:  { value: qTitle },          // 今日题目
          thing2:  { value: category },         // 题目类型
          phrase3: { value: '待完成' },          // 状态
        },
      })
      sent++
    } catch (e) {
      // 单个用户失败不影响其他人，记录日志即可
      console.warn(`push failed for ${user._id}:`, e.message)
    }
  }

  return { sent, total: res.data.length }
}
