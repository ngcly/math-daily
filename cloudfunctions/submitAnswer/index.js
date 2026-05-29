/**
 * 云函数：submitAnswer
 * 判题、写入记录、更新题目统计
 * answer 字段只在此函数内读取，绝不返回给前端
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db    = cloud.database()
const _     = db.command

// ── 答案标准化（与前端 utils/answer.ts 保持一致）──
function normalizeAnswer(raw = '') {
  let s = String(raw).trim().toLowerCase()
  s = s.replace(/[个天元米秒年月日次步人只条块]$/, '').trim()

  if (s.endsWith('%')) {
    const n = parseFloat(s)
    if (!isNaN(n)) return String(n / 100)
  }

  const frac = s.match(/^(-?\d+)\s*[/／]\s*(\d+)$/)
  if (frac) {
    const denom = parseInt(frac[2])
    if (denom === 0) return s
    const val = parseInt(frac[1]) / denom
    return String(Math.round(val * 1e6) / 1e6)
  }

  const n = parseFloat(s)
  if (!isNaN(n)) return String(n)

  return s
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { question_id, date, selected, fill_answer, time_spent, user_thought } = event

  // 0. 基本参数校验
  if (!question_id || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { code: 400, message: '参数错误', data: null }
  }

  // 1. 防重复提交
  const existing = await db.collection('user_records')
    .where({ openid: OPENID, date })
    .count()
  if (existing.total > 0) {
    return { code: 409, message: '今日已作答', data: null }
  }

  // 2. 读取题目（含 answer）
  const qRes = await db.collection('questions').doc(question_id).get()
  const q = qRes.data

  // 日期与题目必须匹配，防止跳过补签机制提交任意历史日期
  if (q.date !== date) {
    return { code: 400, message: '日期与题目不匹配', data: null }
  }

  // 3. 判题
  let is_correct = false
  if (q.type === 'choice') {
    is_correct = selected === q.answer
  } else {
    // fill_number / fill_expr
    const variants = q.answer_variants || []
    const allAnswers = [q.answer, ...variants].map(normalizeAnswer)
    is_correct = allAnswers.includes(normalizeAnswer(fill_answer || ''))
  }

  // 4. 写入答题记录
  await db.collection('user_records').add({
    data: {
      openid:       OPENID,
      question_id,
      date,
      title:        q.title,
      category:     q.category,
      type:         q.type,
      selected:     selected || null,
      fill_answer:  fill_answer || null,
      is_correct,
      time_spent:   time_spent || 0,
      user_thought: user_thought || '',   // 终极形态预留
      ai_feedback:  '',                   // 终极形态预留
      created_at:   db.serverDate(),
    }
  })

  // 5. 更新题目全局统计（原子操作）
  const statsUpdate = {
    'stats.total':      _.inc(1),
    'stats.total_time': _.inc(time_spent || 0),  // 累计用时，用于计算平均用时
  }
  if (is_correct) statsUpdate['stats.correct'] = _.inc(1)
  await db.collection('questions').doc(question_id).update({ data: statsUpdate })

  // 6. 读取最新统计（用于返回正确率）
  const updatedQ = await db.collection('questions').doc(question_id)
    .field({ stats: true, solution: true, aha_moment: true, alt_solution: true })
    .get()

  return {
    code: 0,
    data: {
      is_correct,
      correct_answer: q.answer,
      solution:       q.solution,
      aha_moment:     q.aha_moment,
      alt_solution:   q.alt_solution || null,
      trap:           q.trap || null,
      stats:          updatedQ.data.stats,
      ai_feedback:    null,  // 终极形态预留
    }
  }
}
