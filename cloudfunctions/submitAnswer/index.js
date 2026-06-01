/**
 * 云函数：submitAnswer
 * 判题、写入记录、更新题目统计
 * answer 字段只在此函数内读取，绝不返回给前端
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db    = cloud.database()
const _     = db.command

// ── 答案标准化（⚠️ 与前端 src/utils/answer.ts 中各函数逻辑完全一致，修改需两端同步）──
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

/** 服务端北京时间的今日 YYYY-MM-DD */
function getServerToday() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { question_id, date, selected, fill_answer, time_spent, user_thought } = event

  try {
    // 0. 基本参数校验
    if (!question_id || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { code: 400, message: '参数错误', data: null }
    }

    const serverToday = getServerToday()
    const isRescue = date < serverToday

    // 1. 补签资格校验（防止绕过客户端直接提交历史日期）
    if (isRescue) {
      const profileRes = await db.collection('user_profiles').doc(OPENID).get()
      if (!profileRes.data || profileRes.data.streak_rescue <= 0) {
        return { code: 403, message: '本月补签机会已用完', data: null }
      }
    }

    // 2. 防重复提交
    // ⚠️ 建议在 user_records 集合上创建 {openid: 1, date: 1} 唯一复合索引作为并发兜底
    const existing = await db.collection('user_records')
      .where({ openid: OPENID, date })
      .limit(1)
      .get()
    if (existing.data.length > 0) {
      return { code: 409, message: isRescue ? '该日期已作答' : '今日已作答', data: null }
    }

    // 3. 读取题目（含 answer）
    const qRes = await db.collection('questions').doc(question_id).get()
    const q = qRes.data
    if (!q) {
      return { code: 404, message: '题目不存在', data: null }
    }

    // 日期与题目必须匹配，防止跳过补签机制提交任意历史日期
    if (q.date !== date) {
      return { code: 400, message: '日期与题目不匹配', data: null }
    }

    // 4. 判题
    let is_correct = false
    if (q.type === 'choice') {
      is_correct = selected === q.answer
    } else {
      // fill_number / fill_expr
      const variants = q.answer_variants || []
      const allAnswers = [q.answer, ...variants].map(normalizeAnswer)
      is_correct = allAnswers.includes(normalizeAnswer(fill_answer || ''))
    }

    // 5. 写入答题记录
    try {
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
    } catch (addErr) {
      // 并发写入时唯一索引触发异常，验证后返回 409
      const dup = await db.collection('user_records')
        .where({ openid: OPENID, date })
        .limit(1)
        .get()
      if (dup.data.length > 0) {
        return { code: 409, message: isRescue ? '该日期已作答' : '今日已作答', data: null }
      }
      throw addErr
    }

    // 6. 补签成功后原子扣减补签次数
    if (isRescue) {
      await db.collection('user_profiles').doc(OPENID).update({
        data: { streak_rescue: _.inc(-1) },
      })
    }

    // 7. 更新题目全局统计（原子操作）
    const statsUpdate = {
      'stats.total':      _.inc(1),
      'stats.total_time': _.inc(time_spent || 0),
    }
    if (is_correct) statsUpdate['stats.correct'] = _.inc(1)
    await db.collection('questions').doc(question_id).update({ data: statsUpdate })

    // 8. 读取最新统计（用于返回正确率）
    const updatedQ = await db.collection('questions').doc(question_id)
      .field({ stats: true })
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
  } catch (e) {
    console.error('[submitAnswer] 未预期错误:', e.message, 'OPENID:', OPENID, 'qid:', question_id)
    // 不暴露内部细节给前端
    return { code: 500, message: '服务器内部错误', data: null }
  }
}
