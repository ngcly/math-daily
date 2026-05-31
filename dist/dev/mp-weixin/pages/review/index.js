"use strict";
const common_vendor = require("../../common/vendor.js");
const api_cloud = require("../../api/cloud.js");
const utils_date = require("../../utils/date.js");
const utils_category = require("../../utils/category.js");
if (!Math) {
  ResultBanner();
}
const ResultBanner = () => "../../components/ResultBanner/index.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const detail = common_vendor.ref(null);
    const loading = common_vendor.ref(false);
    const altExpanded = common_vendor.ref(false);
    common_vendor.onLoad(async (options) => {
      const date = options == null ? void 0 : options.date;
      if (!date) {
        common_vendor.index.showToast({ title: "参数错误", icon: "none" });
        common_vendor.index.navigateBack();
        return;
      }
      common_vendor.index.setNavigationBarTitle({ title: utils_date.formatDisplayDate(date).split(" · ")[0] });
      loading.value = true;
      try {
        detail.value = await api_cloud.getHistoryDetail(date);
      } catch (e) {
        common_vendor.index.showToast({ title: "加载失败，请重试", icon: "none" });
        common_vendor.index.navigateBack();
      } finally {
        loading.value = false;
      }
    });
    const syntheticResult = common_vendor.computed(() => {
      const d = detail.value;
      if (!d)
        return null;
      return {
        is_correct: d.record.is_correct,
        correct_answer: d.correct_answer,
        solution: d.question.solution ?? "",
        aha_moment: d.question.aha_moment ?? "",
        alt_solution: d.question.alt_solution,
        trap: d.question.trap,
        stats: d.question.stats
      };
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: loading.value
      }, loading.value ? {} : detail.value && syntheticResult.value ? common_vendor.e({
        c: common_vendor.t(detail.value.question.category),
        d: common_vendor.t(common_vendor.unref(utils_category.CATEGORY_SUBTITLE)[detail.value.question.category]),
        e: common_vendor.f(5, (i, k0, i0) => {
          return {
            a: i,
            b: i <= detail.value.question.difficulty ? 1 : ""
          };
        }),
        f: common_vendor.t(detail.value.question.title),
        g: common_vendor.t(detail.value.question.body),
        h: detail.value.question.image_url
      }, detail.value.question.image_url ? {
        i: detail.value.question.image_url
      } : {}, {
        j: common_vendor.t(detail.value.record.selected ?? detail.value.record.fill_answer ?? "—"),
        k: common_vendor.t(detail.value.record.is_correct ? "✓ 正确" : "✗ 错误"),
        l: common_vendor.n(detail.value.record.is_correct ? "my-answer__badge--correct" : "my-answer__badge--wrong"),
        m: common_vendor.t(common_vendor.unref(utils_date.formatDuration)(detail.value.record.time_spent)),
        n: common_vendor.p({
          result: syntheticResult.value,
          timeSpent: detail.value.record.time_spent
        }),
        o: common_vendor.t(syntheticResult.value.solution),
        p: syntheticResult.value.aha_moment
      }, syntheticResult.value.aha_moment ? {
        q: common_vendor.t(syntheticResult.value.aha_moment)
      } : {}, {
        r: syntheticResult.value.trap
      }, syntheticResult.value.trap ? {
        s: common_vendor.t(syntheticResult.value.trap)
      } : {}, {
        t: syntheticResult.value.alt_solution
      }, syntheticResult.value.alt_solution ? common_vendor.e({
        v: common_vendor.t(altExpanded.value ? "↑" : "↓"),
        w: altExpanded.value
      }, altExpanded.value ? {
        x: common_vendor.t(syntheticResult.value.alt_solution)
      } : {}, {
        y: common_vendor.o(($event) => altExpanded.value = !altExpanded.value, "81")
      }) : {}) : {}, {
        b: detail.value && syntheticResult.value
      });
    };
  }
});
wx.createPage(_sfc_main);
