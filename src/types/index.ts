// ─────────────────────────────────────
// 题目相关类型
// ─────────────────────────────────────

/** 题目分类 */
export type Category =
  | '逻辑推理'
  | '空间想象'
  | '直觉挑战'
  | '抽象思维'
  | '博弈思维'
  | '拆解估算'
  | '本周经典'

/** 题目类型：选择题 | 数字填空（终极形态预留更多） */
export type QuestionType = 'choice' | 'fill_number' | 'fill_expr'

/** 难度 1-5 */
export type Difficulty = 1 | 2 | 3 | 4 | 5

/** 选择题选项 */
export interface Option {
  key: 'A' | 'B' | 'C' | 'D'
  text: string
}

/** 题目数据结构（从云数据库返回，answer 字段不包含） */
export interface Question {
  _id: string
  date: string          // "2026-05-26"
  category: Category
  type: QuestionType
  difficulty: Difficulty
  title: string
  body: string
  image_url?: string    // 可选题目配图

  // 选择题专用
  options?: Option[]

  // 填空题专用
  answer_unit?: string  // "个"、"%" 等单位提示

  // 答题后才返回（云函数控制）
  solution?: string
  aha_moment?: string
  alt_solution?: string
  trap?: string              // 大多数人会犯的错误

  // 全局统计（答题后更新）
  stats: {
    total:      number
    correct:    number
    total_time?: number  // 所有用时之和（秒），avg = total_time / total
  }

  // 题目主题短语（导入时写入）
  quote?: string

  // ── 终极形态预留字段（MVP 阶段留空）──
  thought_prompt?: string       // 引导用户写思路的提示语
  ai_grading_rubric?: {
    key_concepts: string[]
    common_mistakes: string[]
  }
  answer_variants?: string[]    // 等价答案（填空题）
}

/** 提交答案的请求体 */
export interface SubmitPayload {
  question_id: string
  date: string
  /** 选择题答案：'A'|'B'|'C'|'D'（选择题必填，填空题不传） */
  selected?: Option['key']
  /** 填空题答案（填空题必填，选择题不传） */
  fill_answer?: string
  time_spent: number          // 答题用时（秒）
  user_thought?: string       // 用户思路（MVP 阶段可为空）
}

/** 提交答案的返回体 */
export interface SubmitResult {
  is_correct: boolean
  correct_answer: string      // 正确答案，提交后才返回
  solution: string
  aha_moment: string
  alt_solution?: string
  trap?: string               // 大多数人会犯的错误
  stats: { total: number; correct: number; total_time?: number }
  ai_feedback?: string        // 终极形态：AI 批改，MVP 留空
}

// ─────────────────────────────────────
// 用户相关类型
// ─────────────────────────────────────

export interface UserProfile {
  _id: string                 // = openId
  nickname?: string           // 用户昵称（微信键盘填写）
  avatar_url?: string         // 头像云文件 ID（cloud://...）
  remind_time: string         // "08:00"
  subscribed: boolean
  streak: number
  streak_rescue: number       // 本月补签次数
  pref_categories: Category[]
  pref_difficulty: Difficulty | null
  created_at: string
}

// ─────────────────────────────────────
// 答题记录类型
// ─────────────────────────────────────

export interface UserRecord {
  _id: string
  question_id: string
  date: string
  title: string               // 冗余存储，方便历史列表展示
  category: Category
  selected?: string
  fill_answer?: string
  is_correct: boolean
  time_spent: number
  user_thought?: string       // 终极形态预留
  ai_feedback?: string        // 终极形态预留
  created_at: string
}

// ─────────────────────────────────────
// 草稿纸类型
// ─────────────────────────────────────

export interface StrokePoint {
  x: number
  y: number
}

export interface Stroke {
  color: string
  width: number
  points: StrokePoint[]
}

export interface CanvasTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export interface DraftData {
  strokes: Stroke[]
  transform: CanvasTransform
  savedAt: number
}

// ─────────────────────────────────────
// 历史回顾类型
// ─────────────────────────────────────

export interface HistoryDetail {
  record: UserRecord
  question: Question
  correct_answer: string
}
