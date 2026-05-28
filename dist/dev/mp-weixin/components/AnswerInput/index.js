"use strict";
const common_vendor = require("../../common/vendor.js");
const store_question = require("../../store/question.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  props: {
    question: {},
    submitFn: { type: Function }
  },
  emits: ["submitted"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const questionStore = store_question.useQuestionStore();
    const selectedOption = common_vendor.ref("");
    const fillInput = common_vendor.ref("");
    const submitting = common_vendor.computed(() => questionStore.submitting);
    const inputFocused = common_vendor.ref(false);
    const startTime = Date.now();
    function getTimeSpent() {
      return Math.round((Date.now() - startTime) / 1e3);
    }
    function selectOption(key) {
      if (submitting.value)
        return;
      selectedOption.value = key;
    }
    const canSubmit = common_vendor.computed(() => {
      if (props.question.type === "choice") {
        return !!selectedOption.value;
      }
      return fillInput.value.trim().length > 0;
    });
    async function handleSubmit() {
      if (!canSubmit.value || submitting.value)
        return;
      const payload = props.question.type === "choice" ? { selected: selectedOption.value, time_spent: getTimeSpent() } : { fill_answer: fillInput.value.trim(), time_spent: getTimeSpent() };
      const doSubmit = props.submitFn ?? questionStore.submit;
      const result = await doSubmit(payload);
      if (result) {
        emit("submitted");
      }
    }
    common_vendor.onMounted(() => {
      if (props.question.type !== "choice") {
        setTimeout(() => {
          inputFocused.value = true;
        }, 300);
      }
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: _ctx.question.type === "choice"
      }, _ctx.question.type === "choice" ? {
        b: common_vendor.f(_ctx.question.options, (opt, k0, i0) => {
          return {
            a: common_vendor.t(opt.key),
            b: selectedOption.value === opt.key ? 1 : "",
            c: common_vendor.t(opt.text),
            d: opt.key,
            e: selectedOption.value === opt.key ? 1 : "",
            f: common_vendor.o(($event) => selectOption(opt.key), opt.key)
          };
        }),
        c: submitting.value ? 1 : ""
      } : common_vendor.e({
        d: _ctx.question.type === "fill_number" ? "number" : "text",
        e: _ctx.question.type === "fill_number" ? "输入数字" : "输入答案",
        f: submitting.value,
        g: inputFocused.value,
        h: common_vendor.o(handleSubmit, "f3"),
        i: fillInput.value,
        j: common_vendor.o(($event) => fillInput.value = $event.detail.value, "1d"),
        k: _ctx.question.answer_unit
      }, _ctx.question.answer_unit ? {
        l: common_vendor.t(_ctx.question.answer_unit)
      } : {}, {
        m: _ctx.question.type === "fill_expr"
      }, _ctx.question.type === "fill_expr" ? {} : {}), {
        n: common_vendor.t(submitting.value ? "提交中..." : "确认提交"),
        o: !canSubmit.value || submitting.value ? 1 : "",
        p: submitting.value ? 1 : "",
        q: common_vendor.o(handleSubmit, "57")
      });
    };
  }
});
wx.createComponent(_sfc_main);
