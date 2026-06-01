/**
 * 云函数：getAIFeedback
 * 按需生成 AI 点评，结果缓存到 user_records.ai_feedback
 * 需要微信云开发 AI+ 套餐（企业主体）
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { date } = event

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { code: 400, message: '参数错误', data: null }
  }

  try {
    // 1. 读取答题记录
    const recordRes = await db.collection('user_records')
      .where({ openid: OPENID, date })
      .limit(1)
      .get()

    if (!recordRes.data.length) {
      return { code: 404, message: '未找到答题记录', data: null }
    }
    const record = recordRes.data[0]

    // 2. 命中缓存直接返回
    if (record.ai_feedback) {
      return { code: 0, data: { feedback: record.ai_feedback } }
    }

    // 3. 读取题目（含解析）
    const qRes = await db.collection('questions').doc(record.question_id).get()
    const q = qRes.data
    if (!q) {
      return { code: 404, message: '题目不存在', data: null }
    }

    // 4. 构造提示词
    const userAnswer = record.selected
      ? `选择了选项 ${record.selected}`
      : (record.fill_answer ? `填写了 "${record.fill_answer}"` : '未记录')
    const resultLabel = record.is_correct ? '✅ 回答正确' : '❌ 回答错误'

    const userThoughtBlock = record.user_thought
      ? `用户写下的思路：\n${record.user_thought}`
      : '用户未写下思路。'

    const systemPrompt = `你是一位专注于数学与逻辑思维的训练教练，语气简洁、温暖、直接。
请根据用户在题目中的表现，给出不超过 150 字的个性化点评。
- 如果用户写了思路，评点其推理的优缺点，指出关键切入点
- 如果用户没写思路，结合其答案是否正确，给出一条最关键的学习启示
- 禁止重复题目原文，禁止过度溢美，不要废话`

    const userContent = `【题目】
${q.body}

【正确解析】
${q.solution}${q.aha_moment ? '\n\n核心洞察：' + q.aha_moment : ''}

【用户作答】
${userAnswer}（${resultLabel}）

${userThoughtBlock}

请给出点评：`

    // 5. 调用微信 AI
    const ai = cloud.extend.AI
    const model = ai.createModel('hunyuan-2.0-instruct-20251111')
    const aiRes = await model.generateText({
      data: {
        model: 'hunyuan-2.0-instruct-20251111',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent  },
        ],
      },
    })

    const feedback = aiRes?.data?.choices?.[0]?.message?.content?.trim() || ''
    if (!feedback) {
      return { code: 500, message: 'AI 返回内容为空', data: null }
    }

    // 6. 缓存到 user_records
    await db.collection('user_records')
      .where({ openid: OPENID, date })
      .update({ data: { ai_feedback: feedback } })

    return { code: 0, data: { feedback } }
  } catch (e) {
    console.error('[getAIFeedback] error:', e.message, 'OPENID:', OPENID, 'date:', date)
    return { code: 500, message: 'AI 点评生成失败，请稍后重试', data: null }
  }
}
