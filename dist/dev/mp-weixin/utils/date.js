"use strict";
function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function today() {
  return dateToStr(/* @__PURE__ */ new Date());
}
function formatDisplayDate(dateStr) {
  const d = new Date(dateStr);
  const weeks = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${weeks[d.getDay()]}`;
}
function isConsecutiveDay(prev, curr) {
  const p = new Date(prev);
  const c = new Date(curr);
  p.setDate(p.getDate() + 1);
  return p.toDateString() === c.toDateString();
}
function formatDuration(seconds) {
  if (seconds < 60)
    return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}
function firstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1);
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
exports.dateToStr = dateToStr;
exports.daysInMonth = daysInMonth;
exports.firstDayOfMonth = firstDayOfMonth;
exports.formatDisplayDate = formatDisplayDate;
exports.formatDuration = formatDuration;
exports.isConsecutiveDay = isConsecutiveDay;
exports.today = today;
