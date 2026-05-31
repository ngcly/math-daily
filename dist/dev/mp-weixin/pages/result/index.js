"use strict";
const common_vendor = require("../../common/vendor.js");
const store_question = require("../../store/question.js");
const store_user = require("../../store/user.js");
const store_theme = require("../../store/theme.js");
const utils_subscribe = require("../../utils/subscribe.js");
const api_cloud = require("../../api/cloud.js");
if (!Math) {
  ResultBanner();
}
const ResultBanner = () => "../../components/ResultBanner/index.js";
const _sfc_defineComponent = common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const questionStore = store_question.useQuestionStore();
    const userStore = store_user.useUserStore();
    store_theme.useThemeStore();
    const question = common_vendor.computed(() => questionStore.todayQuestion);
    const result = common_vendor.computed(() => questionStore.submitResult);
    const streak = common_vendor.computed(() => userStore.streak);
    const timeSpent = common_vendor.ref(0);
    const altExpanded = common_vendor.ref(false);
    const miniLink = common_vendor.ref("");
    const correctRate = common_vendor.computed(() => {
      var _a;
      const s = (_a = result.value) == null ? void 0 : _a.stats;
      if (!s || s.total === 0)
        return null;
      return Math.round(s.correct / s.total * 100);
    });
    const answerCopy = common_vendor.computed(() => {
      if (!result.value || !question.value)
        return "";
      const t = question.value.title;
      const link = miniLink.value ? `
${miniLink.value}` : "\n微信搜索小程序「别让你的脑生锈」";
      if (result.value.is_correct) {
        const rate = correctRate.value;
        const rateClause = rate !== null ? `只有 ${rate}% 的人答对，` : "";
        return `今天这道题${rateClause}我做出来了 ✅
「${t}」
#脑生锈 #思维训练${link}`;
      }
      return `今天被这道题难住了 🤔 解析很精彩
「${t}」
#脑生锈 来挑战一下？${link}`;
    });
    const streakCopy = common_vendor.computed(() => {
      const link = miniLink.value ? `
${miniLink.value}` : "\n微信搜索小程序「别让你的脑生锈」";
      return `连续第 ${streak.value} 天做题 🔥 大脑保持运转中
#脑生锈${link}`;
    });
    function copyText(text) {
      common_vendor.index.setClipboardData({
        data: text,
        success: () => common_vendor.index.showToast({ title: "已复制", icon: "success", duration: 1500 })
      });
    }
    function shareToTimeline() {
      var _a;
      api_cloud.logEvent("share", { question_id: (_a = question.value) == null ? void 0 : _a._id, type: "timeline_copy" });
      common_vendor.index.setClipboardData({
        data: answerCopy.value,
        success: () => common_vendor.index.showModal({
          title: "文案已复制",
          content: "打开微信朋友圈，长按输入框粘贴即可发布",
          showCancel: false,
          confirmText: "知道了"
        })
      });
    }
    common_vendor.onShow(() => {
      var _a, _b;
      if (!result.value) {
        common_vendor.index.switchTab({ url: "/pages/index/index" });
        return;
      }
      timeSpent.value = questionStore.lastTimeSpent;
      (_b = (_a = common_vendor.wx$1).generateShortLink) == null ? void 0 : _b.call(_a, {
        path: "pages/index/index",
        query: "",
        isPermanent: false,
        success: (res) => {
          miniLink.value = res.link;
        }
      });
    });
    common_vendor.onShareAppMessage(() => {
      var _a, _b, _c;
      api_cloud.logEvent("share", { question_id: (_a = question.value) == null ? void 0 : _a._id, type: "friend" });
      const correct = (_b = result.value) == null ? void 0 : _b.is_correct;
      const title = question.value ? correct ? `我答对了今日脑力题：${question.value.title} 🎉` : `今日脑力挑战：${question.value.title}，你能做到吗？` : "别让你的脑生锈 · 训练你的大脑";
      const ref2 = ((_c = userStore.profile) == null ? void 0 : _c._id) || "";
      return {
        title,
        path: ref2 ? `/pages/index/index?ref=${ref2}` : "/pages/index/index"
      };
    });
    common_vendor.onShareTimeline(() => {
      var _a, _b;
      api_cloud.logEvent("share", { question_id: (_a = question.value) == null ? void 0 : _a._id, type: "timeline" });
      const ref2 = ((_b = userStore.profile) == null ? void 0 : _b._id) || "";
      return {
        title: answerCopy.value.split("\n")[0] || "别让你的脑生锈 · 训练你的大脑",
        query: ref2 ? `ref=${ref2}` : ""
      };
    });
    async function requestSubscribe() {
      const status = await utils_subscribe.requestDailySubscribe();
      if (status === "accept") {
        await userStore.updatePrefs({ subscribed: true });
      }
      utils_subscribe.showSubscribeStatusToast(status, "明天准时提醒你 🔔");
    }
    function goHome() {
      common_vendor.index.switchTab({ url: "/pages/index/index" });
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: result.value && question.value
      }, result.value && question.value ? common_vendor.e({
        b: streak.value > 0 && streak.value % 7 === 0
      }, streak.value > 0 && streak.value % 7 === 0 ? {
        c: common_vendor.t(streak.value)
      } : {}, {
        d: common_vendor.p({
          result: result.value,
          timeSpent: timeSpent.value
        }),
        e: common_vendor.t(result.value.solution),
        f: result.value.aha_moment
      }, result.value.aha_moment ? {
        g: common_vendor.t(result.value.aha_moment)
      } : {}, {
        h: result.value.trap
      }, result.value.trap ? {
        i: common_vendor.t(result.value.trap)
      } : {}, {
        j: result.value.alt_solution
      }, result.value.alt_solution ? common_vendor.e({
        k: common_vendor.t(altExpanded.value ? "↑" : "↓"),
        l: altExpanded.value
      }, altExpanded.value ? {
        m: common_vendor.t(result.value.alt_solution)
      } : {}, {
        n: common_vendor.o(($event) => altExpanded.value = !altExpanded.value, "d2")
      }) : {}, {
        o: common_vendor.t(answerCopy.value),
        p: common_vendor.o(($event) => copyText(answerCopy.value), "39"),
        q: streak.value > 1
      }, streak.value > 1 ? {
        r: common_vendor.t(streakCopy.value),
        s: common_vendor.o(($event) => copyText(streakCopy.value), "77")
      } : {}, {
        t: common_vendor.o(shareToTimeline, "56"),
        v: common_vendor.o(requestSubscribe, "9b"),
        w: common_vendor.o(goHome, "39")
      }) : {});
    };
  }
});
_sfc_defineComponent.__runtimeHooks = 6;
wx.createPage(_sfc_defineComponent);
