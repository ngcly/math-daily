"use strict";
const common_vendor = require("../common/vendor.js");
const api_cloud = require("../api/cloud.js");
const store_user = require("./user.js");
const utils_date = require("../utils/date.js");
const useQuestionStore = common_vendor.defineStore("question", () => {
  const todayQuestion = common_vendor.ref(null);
  const submitResult = common_vendor.ref(null);
  const loading = common_vendor.ref(false);
  const submitting = common_vendor.ref(false);
  const hasSubmitted = common_vendor.ref(false);
  const submittedDate = common_vendor.ref("");
  const rescueQuestion = common_vendor.ref(null);
  const weeklyResults = common_vendor.ref([]);
  const recentTrainedDims = common_vendor.ref([]);
  const lastTimeSpent = common_vendor.ref(0);
  const isAnswered = common_vendor.computed(() => {
    return hasSubmitted.value && submittedDate.value === utils_date.today();
  });
  const correctRate = common_vendor.computed(() => {
    var _a;
    const s = (_a = submitResult.value) == null ? void 0 : _a.stats;
    if (!s || s.total === 0)
      return 0;
    return Math.round(s.correct / s.total * 100);
  });
  const QUESTION_CACHE_KEY = "cache_today_question";
  function readCache() {
    try {
      const raw = common_vendor.index.getStorageSync(QUESTION_CACHE_KEY);
      return (raw == null ? void 0 : raw.date) === utils_date.today() ? raw.data : null;
    } catch {
      return null;
    }
  }
  function writeCache(q) {
    try {
      common_vendor.index.setStorageSync(QUESTION_CACHE_KEY, { date: utils_date.today(), data: q });
    } catch {
    }
  }
  async function loadToday() {
    if (loading.value)
      return;
    const cached = readCache();
    if (cached) {
      todayQuestion.value = cached;
      api_cloud.getTodayQuestion().then((fresh) => {
        todayQuestion.value = fresh;
        writeCache(fresh);
      }).catch(() => {
      });
      return;
    }
    loading.value = true;
    try {
      const q = await api_cloud.getTodayQuestion();
      todayQuestion.value = q;
      writeCache(q);
    } catch (e) {
      console.error("[QuestionStore] loadToday failed", e);
      common_vendor.index.showToast({ title: "加载失败，请检查网络", icon: "none" });
    } finally {
      loading.value = false;
    }
  }
  async function submit(payload) {
    if (!todayQuestion.value || submitting.value)
      return;
    submitting.value = true;
    try {
      const fullPayload = {
        ...payload,
        question_id: todayQuestion.value._id,
        date: utils_date.today()
      };
      submitResult.value = await api_cloud.submitAnswer(fullPayload);
      hasSubmitted.value = true;
      submittedDate.value = utils_date.today();
      const filteredWeekly = weeklyResults.value.filter((d) => d.date !== utils_date.today());
      filteredWeekly.unshift({ date: utils_date.today(), is_correct: submitResult.value.is_correct });
      weeklyResults.value = filteredWeekly.slice(0, 30);
      lastTimeSpent.value = payload.time_spent ?? 0;
      const filteredDims = recentTrainedDims.value.filter((d) => d.date !== utils_date.today());
      filteredDims.unshift({ date: utils_date.today(), category: todayQuestion.value.category });
      recentTrainedDims.value = filteredDims.slice(0, 30);
      const userStore = store_user.useUserStore();
      userStore.onCompleted();
      return submitResult.value;
    } catch (e) {
      console.error("[QuestionStore] submit failed", e);
      common_vendor.index.showToast({ title: "提交失败，请重试", icon: "none" });
    } finally {
      submitting.value = false;
    }
  }
  async function loadRescueQuestion(date) {
    rescueQuestion.value = null;
    try {
      rescueQuestion.value = await api_cloud.getQuestionByDate(date);
    } catch (e) {
      console.error("[QuestionStore] loadRescueQuestion failed", e);
      common_vendor.index.showToast({ title: "该日暂无题目", icon: "none" });
    }
  }
  async function submitRescue(payload, rescueDate) {
    const q = rescueQuestion.value;
    if (!q || submitting.value)
      return false;
    submitting.value = true;
    try {
      const fullPayload = {
        ...payload,
        question_id: q._id,
        date: rescueDate
      };
      const result = await api_cloud.submitAnswer(fullPayload);
      return result.is_correct !== void 0;
    } catch (e) {
      console.error("[QuestionStore] submitRescue failed", e);
      common_vendor.index.showToast({ title: "提交失败，请重试", icon: "none" });
      return false;
    } finally {
      submitting.value = false;
    }
  }
  async function refresh() {
    todayQuestion.value = null;
    submitResult.value = null;
    try {
      common_vendor.index.removeStorageSync(QUESTION_CACHE_KEY);
    } catch {
    }
    await loadToday();
  }
  return {
    todayQuestion,
    rescueQuestion,
    submitResult,
    loading,
    submitting,
    hasSubmitted,
    submittedDate,
    weeklyResults,
    recentTrainedDims,
    lastTimeSpent,
    isAnswered,
    correctRate,
    loadToday,
    loadRescueQuestion,
    submit,
    submitRescue,
    refresh
  };
}, {
  unistorage: {
    paths: [
      "hasSubmitted",
      "submittedDate",
      "submitResult",
      "weeklyResults",
      "recentTrainedDims",
      "lastTimeSpent"
    ]
  }
});
exports.useQuestionStore = useQuestionStore;
