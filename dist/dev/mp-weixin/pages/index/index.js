"use strict";
const common_vendor = require("../../common/vendor.js");
const store_question = require("../../store/question.js");
const store_user = require("../../store/user.js");
const store_theme = require("../../store/theme.js");
const utils_date = require("../../utils/date.js");
const utils_theme = require("../../utils/theme.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const questionStore = store_question.useQuestionStore();
    const userStore = store_user.useUserStore();
    const themeStore = store_theme.useThemeStore();
    const question = common_vendor.computed(() => questionStore.todayQuestion);
    const loading = common_vendor.computed(() => questionStore.loading);
    const answered = common_vendor.computed(() => questionStore.isAnswered);
    const streak = common_vendor.computed(() => userStore.streak);
    const dateLabel = common_vendor.computed(() => utils_date.formatDisplayDate(utils_date.today()));
    function timeEstimate(difficulty) {
      if (difficulty <= 2)
        return "约5分钟";
      if (difficulty <= 3)
        return "约10分钟";
      return "约15分钟";
    }
    const recentDims = common_vendor.ref([]);
    function loadRecentDims() {
      try {
        const raw = common_vendor.index.getStorageSync("recent_trained_dims") || [];
        recentDims.value = [...new Set(raw.map((d) => d.category))];
      } catch {
        recentDims.value = [];
      }
    }
    common_vendor.onShow(() => {
      themeStore.setCurrentTab(0);
      utils_theme.syncNativeTabBarTheme(themeStore.isDark);
      loadRecentDims();
    });
    function goToDraft() {
      if (!question.value)
        return;
      common_vendor.index.navigateTo({ url: `/pages/draft/index?id=${question.value._id}` });
    }
    function goToResult() {
      common_vendor.index.navigateTo({ url: "/pages/result/index" });
    }
    function goToHistory() {
      common_vendor.index.switchTab({ url: "/pages/history/index" });
    }
    function goToSubmit() {
      if (!question.value)
        return;
      common_vendor.index.navigateTo({ url: `/pages/draft/index?id=${question.value._id}&submit=1` });
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: streak.value > 0
      }, streak.value > 0 ? {
        b: common_vendor.t(streak.value),
        c: common_vendor.o(goToHistory, "a0")
      } : {}, {
        d: common_vendor.t(dateLabel.value),
        e: loading.value
      }, loading.value ? {} : !question.value ? {} : common_vendor.e({
        g: common_vendor.t(question.value.category),
        h: common_vendor.t(timeEstimate(question.value.difficulty)),
        i: common_vendor.t(question.value.category),
        j: common_vendor.f(5, (i, k0, i0) => {
          return {
            a: i,
            b: i <= question.value.difficulty ? 1 : ""
          };
        }),
        k: answered.value
      }, answered.value ? {} : {}, {
        l: common_vendor.t(question.value.body),
        m: question.value.image_url
      }, question.value.image_url ? {
        n: question.value.image_url
      } : {}, {
        o: common_vendor.t(answered.value ? "查看解析 →" : "✏️ 点击开始演算 →"),
        p: answered.value
      }, answered.value ? {
        q: common_vendor.o(goToDraft, "24")
      } : {
        r: common_vendor.o(goToSubmit, "c3")
      }, {
        s: answered.value ? 1 : "",
        t: common_vendor.o(($event) => answered.value ? goToResult() : goToDraft(), "ee"),
        v: streak.value > 0
      }, streak.value > 0 ? {
        w: common_vendor.t(streak.value)
      } : {}, {
        x: recentDims.value.length > 0
      }, recentDims.value.length > 0 ? {
        y: common_vendor.f(recentDims.value.slice(0, 4), (dim, k0, i0) => {
          return {
            a: common_vendor.t(dim),
            b: dim
          };
        })
      } : {}), {
        f: !question.value,
        z: common_vendor.n(common_vendor.unref(themeStore).themeClass)
      });
    };
  }
});
wx.createPage(_sfc_main);
