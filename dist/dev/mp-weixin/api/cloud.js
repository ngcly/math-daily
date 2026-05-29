"use strict";
const common_vendor = require("../common/vendor.js");
async function callCloud(name, data = {}) {
  const res = await common_vendor.wx$1.cloud.callFunction({ name, data });
  const result = res.result;
  if (result.code !== 0) {
    throw new Error(result.message || `云函数 ${name} 调用失败`);
  }
  return result.data;
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
exports.getHistoryDetail = getHistoryDetail;
exports.getQuestionByDate = getQuestionByDate;
exports.getTodayQuestion = getTodayQuestion;
exports.getUserHistory = getUserHistory;
exports.initUser = initUser;
exports.logEvent = logEvent;
exports.submitAnswer = submitAnswer;
exports.updateSettings = updateSettings;
