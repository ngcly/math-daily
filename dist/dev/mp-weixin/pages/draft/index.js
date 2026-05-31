"use strict";
const common_vendor = require("../../common/vendor.js");
const store_question = require("../../store/question.js");
const store_user = require("../../store/user.js");
const store_theme = require("../../store/theme.js");
if (!Math) {
  (SketchPad + AnswerInput)();
}
const SketchPad = () => "../../components/SketchPad/index.js";
const AnswerInput = () => "../../components/AnswerInput/index.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const questionStore = store_question.useQuestionStore();
    const userStore = store_user.useUserStore();
    store_theme.useThemeStore();
    const rescueDate = common_vendor.ref("");
    const isRescueMode = common_vendor.computed(() => !!rescueDate.value);
    const question = common_vendor.computed(
      () => isRescueMode.value ? questionStore.rescueQuestion : questionStore.todayQuestion
    );
    const isAnswered = common_vendor.computed(() => !isRescueMode.value && questionStore.isAnswered);
    const cardCollapsed = common_vendor.ref(false);
    const answerVisible = common_vendor.ref(false);
    const sketchPadRef = common_vendor.ref(null);
    const questionId = common_vendor.ref("");
    common_vendor.onLoad(async (options) => {
      var _a, _b;
      rescueDate.value = (options == null ? void 0 : options.rescue_date) || "";
      if (isRescueMode.value) {
        await questionStore.loadRescueQuestion(rescueDate.value);
        questionId.value = ((_a = questionStore.rescueQuestion) == null ? void 0 : _a._id) || "";
      } else {
        questionId.value = (options == null ? void 0 : options.id) || ((_b = question.value) == null ? void 0 : _b._id) || "";
        if ((options == null ? void 0 : options.submit) === "1") {
          answerVisible.value = true;
        }
      }
    });
    async function rescueSubmitFn(payload) {
      return await questionStore.submitRescue(payload, rescueDate.value);
    }
    function openAnswer() {
      answerVisible.value = true;
    }
    async function onSubmitted() {
      answerVisible.value = false;
      if (isRescueMode.value) {
        userStore.useRescue(rescueDate.value);
        common_vendor.index.showModal({
          title: "补签成功 🎉",
          content: `${rescueDate.value} 的打卡已补上，连续天数 +1！`,
          showCancel: false,
          confirmText: "好的",
          success: () => common_vendor.index.navigateBack()
        });
      } else {
        common_vendor.index.redirectTo({ url: "/pages/result/index" });
      }
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    function goToResult() {
      common_vendor.index.redirectTo({ url: "/pages/result/index" });
    }
    return (_ctx, _cache) => {
      var _a, _b, _c;
      return common_vendor.e({
        a: common_vendor.sr(sketchPadRef, "66abf536-0", {
          "k": "sketchPadRef"
        }),
        b: common_vendor.p({
          questionId: questionId.value || ((_a = question.value) == null ? void 0 : _a._id) || "default"
        }),
        c: common_vendor.t(isRescueMode.value ? `📅 补签 ${rescueDate.value}` : "📌 题目"),
        d: isAnswered.value
      }, isAnswered.value ? {} : {}, {
        e: common_vendor.t(cardCollapsed.value ? "展开 ↑" : "收起 ↓"),
        f: common_vendor.o(($event) => cardCollapsed.value = !cardCollapsed.value, "cc"),
        g: !cardCollapsed.value
      }, !cardCollapsed.value ? {
        h: common_vendor.t(((_b = question.value) == null ? void 0 : _b.body) ?? "题目加载中...")
      } : {}, {
        i: cardCollapsed.value ? 1 : "",
        j: common_vendor.o(goBack, "2f"),
        k: !isAnswered.value
      }, !isAnswered.value ? {
        l: common_vendor.o(openAnswer, "af")
      } : {
        m: common_vendor.o(goToResult, "c8")
      }, {
        n: common_vendor.o(($event) => answerVisible.value = false, "77"),
        o: common_vendor.t((_c = question.value) == null ? void 0 : _c.title),
        p: question.value
      }, question.value ? {
        q: common_vendor.o(onSubmitted, "35"),
        r: common_vendor.p({
          question: question.value,
          ["submit-fn"]: isRescueMode.value ? rescueSubmitFn : void 0
        })
      } : {}, {
        s: answerVisible.value ? 1 : ""
      });
    };
  }
});
wx.createPage(_sfc_main);
