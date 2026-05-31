/**
 * 云函数：sendDailyPush
 * 触发方式：定时触发器（见 config.json），每小时整点执行
 * 找出该小时应该收到提醒的用户，批量发送订阅消息
 *
 * ⚠️ 部署方式：使用微信开发者工具上传云函数，config.json 中的
 *    permissions.openapi 会自动声明 subscribeMessage.send 权限。
 *    上传后约 10 分钟缓存生效，如返回 -604101 请稍后再试。
 *
 * 模板 ID 对应的微信公众平台模板：
 *   标题：打卡提醒 | 编号 76018 | 类目：教育信息展示
 *   ┌──────────────────────────────────┐
 *   │ 打卡活动    {{thing1.DATA}}       │
 *   │ 打卡进度    {{character_string2.DATA}} │
 *   │ 备注        {{thing3.DATA}}       │
 *   └──────────────────────────────────┘
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _  = db.command

// 订阅消息模板 ID（在微信公众平台申请后替换）
const TEMPLATE_ID = 'KiJLSpuOmVhQ5RJh5LqkQfbFVCQGcoaMkcV2WbOIcuU'

// 用户取消订阅/订阅过期时 WeChat API 返回的错误码
const ERR_USER_REFUSE = 43101      // 用户拒绝接收
const ERR_USER_SUB_EXPIRE = 43120  // 订阅时间到期（长期订阅专用）

exports.main = async () => {
  const now  = new Date()
  const hour = String(now.getHours()).padStart(2, '0')
  const currentTime = `${hour}:00`   // 匹配用户设置的整点时间

  // 查找该时间点应该推送的已订阅用户（分页取全部，最多 2000 人）
  let allUsers = []
  let offset = 0
  const PAGE_SIZE = 100
  while (true) {
    const res = await db.collection('user_profiles')
      .where({
        subscribed:   true,
        remind_time:  currentTime,
      })
      .skip(offset)
      .limit(PAGE_SIZE)
      .get()

    allUsers = allUsers.concat(res.data)
    if (res.data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    if (offset >= 2000) {
      console.warn('[sendDailyPush] 超过 2000 人分页上限，只取前 2000 人')
      break
    }
  }

  if (!allUsers.length) return { sent: 0 }

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
  let unsubscribed = []   // 需要清除 subscribed 标记的用户（openId 列表）
  for (const user of allUsers) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser:     user._id,
        templateId: TEMPLATE_ID,
        page:       'pages/index/index',
        data: {
          thing1:          { value: qTitle },                    // 打卡活动 → 今日题目标题
          character_string2: { value: category },                // 打卡进度 → 题目类型
          thing3:          { value: '来「别让你的脑生锈」挑战' }, // 备注 → 固定引导文案
        },
      })
      sent++
    } catch (e) {
      // 用户已取消订阅 → 标记清理，后续不再发送
      if (e.errCode === ERR_USER_REFUSE || e.errCode === ERR_USER_SUB_EXPIRE) {
        unsubscribed.push(user._id)
        console.warn(`[sendDailyPush] user ${user._id} 已取消订阅，清除标记`)
      } else {
        // 其他错误（模板ID无效、频率限制等）仅记录日志
        console.warn(`[sendDailyPush] push failed for ${user._id}:`, e.errCode, e.message)
      }
    }
  }

  // 批量清除已取消订阅用户的 subscribed 标记
  if (unsubscribed.length > 0) {
    try {
      await db.collection('user_profiles')
        .where({ _id: _.in(unsubscribed) })
        .update({ data: { subscribed: false } })
    } catch (e) {
      console.error('[sendDailyPush] 批量清除 subscribed 失败:', e.message)
    }
  }

  return { sent, total: allUsers.length, unsubscribed: unsubscribed.length }
}
