"use strict";
const common_vendor = require("../../common/vendor.js");
const store_question = require("../../store/question.js");
const store_user = require("../../store/user.js");
const store_theme = require("../../store/theme.js");
const utils_date = require("../../utils/date.js");
const utils_category = require("../../utils/category.js");
if (!Math) {
  SkeletonCard();
}
const SkeletonCard = () => "../../components/SkeletonCard/index.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const showSkeleton = common_vendor.computed(() => loading.value && !question.value);
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
    const recentDims = common_vendor.computed(() => {
      const raw = questionStore.recentTrainedDims;
      return [...new Set(raw.map((d) => d.category))];
    });
    const weekDays = common_vendor.computed(() => {
      const todayStr = utils_date.today();
      const todayDate = /* @__PURE__ */ new Date(todayStr + "T00:00:00");
      const dow = todayDate.getDay();
      const offset = dow === 0 ? 6 : dow - 1;
      const monday = new Date(todayDate);
      monday.setDate(todayDate.getDate() - offset);
      return ["一", "二", "三", "四", "五", "六", "日"].map((label, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = utils_date.dateToStr(d);
        const rec = questionStore.weeklyResults.find((r) => r.date === dateStr);
        return {
          date: dateStr,
          label,
          isToday: dateStr === todayStr,
          isFuture: dateStr > todayStr,
          result: rec != null ? rec.is_correct : null
          // null = 无记录
        };
      });
    });
    const socialStats = common_vendor.computed(() => {
      var _a, _b;
      const s = answered.value && ((_a = questionStore.submitResult) == null ? void 0 : _a.stats) ? questionStore.submitResult.stats : (_b = question.value) == null ? void 0 : _b.stats;
      if (!s || s.total === 0)
        return null;
      return {
        total: s.total,
        rate: Math.round(s.correct / s.total * 100)
      };
    });
    common_vendor.onShow(() => {
      themeStore.setCurrentTab(0);
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
        c: common_vendor.o(goToHistory, "0e")
      } : {}, {
        d: common_vendor.t(dateLabel.value),
        e: showSkeleton.value
      }, showSkeleton.value ? {} : !question.value ? {} : common_vendor.e({
        g: common_vendor.f(weekDays.value, (day, k0, i0) => {
          return {
            a: day.result === true ? 1 : "",
            b: day.result === false ? 1 : "",
            c: day.isToday && day.result === null ? 1 : "",
            d: day.isFuture && day.result === null ? 1 : "",
            e: common_vendor.t(day.label),
            f: day.isToday ? 1 : "",
            g: day.date
          };
        }),
        h: common_vendor.t(question.value.category),
        i: common_vendor.t(timeEstimate(question.value.difficulty)),
        j: common_vendor.t(question.value.category),
        k: common_vendor.t(common_vendor.unref(utils_category.CATEGORY_SUBTITLE)[question.value.category]),
        l: common_vendor.f(5, (i, k0, i0) => {
          return {
            a: i,
            b: i <= question.value.difficulty ? 1 : ""
          };
        }),
        m: answered.value
      }, answered.value ? {} : {}, {
        n: common_vendor.t(question.value.body),
        o: question.value.image_url
      }, question.value.image_url ? {
        p: question.value.image_url
      } : {}, {
        q: socialStats.value
      }, socialStats.value ? {
        r: common_vendor.t(socialStats.value.total),
        s: common_vendor.t(socialStats.value.rate)
      } : {}, {
        t: question.value.quote
      }, question.value.quote ? {
        v: common_vendor.t(question.value.quote)
      } : {}, {
        w: common_vendor.t(answered.value ? "查看解析 →" : "✏️ 点击开始演算 →"),
        x: answered.value
      }, answered.value ? {
        y: common_vendor.o(goToDraft, "0a")
      } : {
        z: common_vendor.o(goToSubmit, "96")
      }, {
        A: answered.value ? 1 : "",
        B: common_vendor.o(($event) => answered.value ? goToResult() : goToDraft(), "66"),
        C: streak.value > 0
      }, streak.value > 0 ? {
        D: common_vendor.t(streak.value)
      } : {}, {
        E: recentDims.value.length > 0
      }, recentDims.value.length > 0 ? {
        F: common_vendor.f(recentDims.value.slice(0, 4), (dim, k0, i0) => {
          return {
            a: common_vendor.t(dim),
            b: dim
          };
        })
      } : {}), {
        f: !question.value
      });
    };
  }
});
wx.createPage(_sfc_main);
