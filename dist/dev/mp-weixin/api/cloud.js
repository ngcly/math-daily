"use strict";
const common_vendor = require("../common/vendor.js");
const RETRY_MAX = 2;
const RETRY_BASE_MS = 1e3;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
class CloudBusinessError extends Error {
  constructor(message) {
    super(message);
    this.name = "CloudBusinessError";
  }
}
async function callCloud(name, data = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const res = await common_vendor.wx$1.cloud.callFunction({ name, data });
      const result = res.result;
      if (result.code !== 0) {
        throw new CloudBusinessError(result.message || `云函数 ${name} 调用失败`);
      }
      return result.data;
    } catch (e) {
      if (e instanceof CloudBusinessError)
        throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < RETRY_MAX) {
        const jitter = Math.random() * 0.3 + 0.85;
        const delay = Math.round(RETRY_BASE_MS * Math.pow(2, attempt) * jitter);
        console.warn(`[callCloud] ${name} 失败，${delay}ms 后重试 (${attempt + 1}/${RETRY_MAX})`, lastError.message);
        await sleep(delay);
      }
    }
  }
  throw lastError ?? new Error(`云函数 ${name} 调用失败（已重试 ${RETRY_MAX} 次）`);
}
const getTodayQuestion = () => callCloud("getTodayQuestion");
const getQuestionByDate = (date) => callCloud("getQuestionByDate", { date });
const submitAnswer = (payload) => callCloud("submitAnswer", payload);
const initUser = () => callCloud("initUser");
const getUserHistory = (params) => callCloud("getUserHistory", params);
const getHistoryDetail = (date) => callCloud("getHistoryDetail", { date });
const updateSettings = (settings) => callCloud("updateSettings", settings);
function logEvent(event, data = {}) {
  callCloud("logEvent", { event, data }).catch(() => {
  });
}
const submitFeedback = (category, content) => callCloud("submitFeedback", { category, content });
exports.getHistoryDetail = getHistoryDetail;
exports.getQuestionByDate = getQuestionByDate;
exports.getTodayQuestion = getTodayQuestion;
exports.getUserHistory = getUserHistory;
exports.initUser = initUser;
exports.logEvent = logEvent;
exports.submitAnswer = submitAnswer;
exports.submitFeedback = submitFeedback;
exports.updateSettings = updateSettings;
