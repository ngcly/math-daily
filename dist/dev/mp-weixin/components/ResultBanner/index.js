"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_date = require("../../utils/date.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  props: {
    result: {},
    timeSpent: {}
  },
  setup(__props) {
    const props = __props;
    const correctRate = common_vendor.computed(() => {
      const s = props.result.stats;
      if (!s || s.total === 0)
        return 0;
      return Math.round(s.correct / s.total * 100);
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(_ctx.result.is_correct ? "🎉" : "🤔"),
        b: common_vendor.t(_ctx.result.is_correct ? "回答正确！" : "答错了，看看解析"),
        c: common_vendor.t(common_vendor.unref(utils_date.formatDuration)(_ctx.timeSpent)),
        d: common_vendor.n(_ctx.result.is_correct ? "banner--correct" : "banner--wrong"),
        e: common_vendor.t(correctRate.value),
        f: common_vendor.n(correctRate.value < 40 ? "stats__num--red" : ""),
        g: common_vendor.t(common_vendor.unref(utils_date.formatDuration)(_ctx.timeSpent)),
        h: common_vendor.t(_ctx.result.stats.total),
        i: !_ctx.result.is_correct
      }, !_ctx.result.is_correct ? {
        j: common_vendor.t(_ctx.result.correct_answer)
      } : {});
    };
  }
});
wx.createComponent(_sfc_main);
