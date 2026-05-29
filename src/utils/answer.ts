/**
 * 标准化用户输入的填空题答案，用于与标准答案比较
 * 处理：去空格、分数/小数等价、单位容错
 */
export function normalizeAnswer(raw: string): string {
  let s = raw.trim().toLowerCase()

  // 去除常见单位后缀（"个"、"天"、"元"等）
  s = s.replace(/[个天元米秒年月日次步人只条块]$/, '').trim()

  // 百分号转小数
  if (s.endsWith('%')) {
    const num = parseFloat(s)
    if (!isNaN(num)) return String(num / 100)
  }

  // 分数转小数（1/8 → 0.125），保留6位精度
  const fractionMatch = s.match(/^(-?\d+)\s*[/／]\s*(\d+)$/)
  if (fractionMatch) {
    const denom = parseInt(fractionMatch[2])
    if (denom === 0) return s
    const val = parseInt(fractionMatch[1]) / denom
    return String(Math.round(val * 1e6) / 1e6)
  }

  // 纯数字：去掉多余小数点后的零（1.0 → 1）
  const num = parseFloat(s)
  if (!isNaN(num)) return String(num)

  return s
}

/**
 * 判断用户填空答案是否正确
 * @param userInput  用户输入
 * @param answer     标准答案
 * @param variants   等价答案列表（可选）
 */
export function checkFillAnswer(
  userInput: string,
  answer: string,
  variants: string[] = []
): boolean {
  const normalized = normalizeAnswer(userInput)
  const allAnswers = [answer, ...variants].map(normalizeAnswer)
  return allAnswers.includes(normalized)
}
