/**
 * 云函数 / 本地脚本：syncFromNotion
 * 把 Notion 数据库的题目同步到云数据库
 *
 * 使用方式：
 * 1. 本地运行：node cloudfunctions/syncFromNotion/index.js
 * 2. 或部署为云函数，手动触发
 *
 * 需要在 .env 文件配置：
 * NOTION_TOKEN=secret_xxx
 * NOTION_DB_ID=xxx
 */
const https = require('https')

// ── Notion API 工具 ──────────────────
const NOTION_TOKEN = process.env.NOTION_TOKEN
const NOTION_DB_ID = process.env.NOTION_DB_ID

async function notionRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      }
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(JSON.parse(data)))
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// ── Notion 属性解析器 ────────────────
function parseProps(props) {
  const get = (key, type) => {
    const p = props[key]
    if (!p) return null
    switch (type) {
      case 'title':   return p.title?.[0]?.plain_text || ''
      case 'rich':    return p.rich_text?.map(t => t.plain_text).join('') || ''
      case 'select':  return p.select?.name || ''
      case 'number':  return p.number ?? null
      case 'date':    return p.date?.start || ''
      case 'multi':   return p.multi_select?.map(s => s.name) || []
      case 'check':   return p.checkbox ?? false
      default:        return null
    }
  }

  return {
    date:             get('发布日期', 'date'),
    title:            get('题目标题', 'title'),
    category:         get('分类', 'select'),
    type:             get('题型', 'select'),        // 'choice' | 'fill_number'
    difficulty:       get('难度', 'number'),
    body:             get('题目正文', 'rich'),
    options_raw:      get('选项(A|B|C|D格式)', 'rich'),
    answer:           get('正确答案', 'rich'),
    answer_variants:  get('等价答案(逗号分隔)', 'rich'),
    answer_unit:      get('单位', 'rich'),
    solution:         get('解题思路', 'rich'),
    aha_moment:       get('啊哈时刻', 'rich'),
    alt_solution:     get('另一种解法', 'rich'),
    thought_prompt:   get('思路引导语', 'rich'),     // 终极形态预留
    ready:            get('已审核', 'check'),
  }
}

// ── 选项字符串解析 "A.xxx|B.xxx|C.xxx|D.xxx" ──
function parseOptions(raw) {
  if (!raw) return []
  return raw.split('|').map(s => {
    const match = s.trim().match(/^([A-D])[.。]\s*(.+)$/)
    if (!match) return null
    return { key: match[1], text: match[2].trim() }
  }).filter(Boolean)
}

// ── 主逻辑 ──────────────────────────
async function sync() {
  console.log('🔄 开始同步 Notion → 云数据库...')

  // 查询 Notion 数据库（只同步已审核的题目）
  const res = await notionRequest(`/v1/databases/${NOTION_DB_ID}/query`, 'POST', {
    filter: { property: '已审核', checkbox: { equals: true } },
    sorts: [{ property: '发布日期', direction: 'ascending' }],
  })

  const questions = res.results.map(page => {
    const p = parseProps(page.properties)
    if (!p.date || !p.title || !p.answer) return null

    const q = {
      notion_id:      page.id,
      date:           p.date,
      title:          p.title,
      category:       p.category || '逻辑推理',
      type:           (p.type || 'choice').toLowerCase(),
      difficulty:     p.difficulty || 2,
      body:           p.body,
      answer:         p.answer.trim().toUpperCase(),
      answer_variants: p.answer_variants
        ? p.answer_variants.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      answer_unit:    p.answer_unit || '',
      solution:       p.solution,
      aha_moment:     p.aha_moment,
      alt_solution:   p.alt_solution || '',
      thought_prompt: p.thought_prompt || '',  // 预留
      ai_grading_rubric: {},                   // 预留
      image_url:      null,
      stats:          { total: 0, correct: 0 },
    }

    if (p.type === 'choice') {
      q.options = parseOptions(p.options_raw)
    }

    return q
  }).filter(Boolean)

  console.log(`✅ 解析完成，共 ${questions.length} 道题`)

  // 写入云数据库（upsert 逻辑：按 date 查重）
  // 注意：本地运行时需要替换为直接的 HTTP API 调用
  // 或通过云开发 SDK 写入
  console.log('📋 题目列表预览：')
  questions.forEach(q => {
    console.log(`  ${q.date} [${q.category}] ${q.title}`)
  })

  console.log('\n⚠️  请在微信开发者工具中运行此云函数，或使用云开发 HTTP API 写入数据')
  return questions
}

sync().catch(console.error)

module.exports = { sync }
