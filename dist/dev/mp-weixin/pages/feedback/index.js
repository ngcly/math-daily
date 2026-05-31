"use strict";
const common_vendor = require("../../common/vendor.js");
const api_cloud = require("../../api/cloud.js");
const MAX_LENGTH = 500;
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const CATEGORIES = [
      { key: "bug", label: "遇到 Bug", emoji: "🐛" },
      { key: "content", label: "题目问题", emoji: "📝" },
      { key: "feature", label: "功能建议", emoji: "💡" },
      { key: "other", label: "其他", emoji: "💬" }
    ];
    const category = common_vendor.ref("bug");
    const content = common_vendor.ref("");
    const submitting = common_vendor.ref(false);
    const submitted = common_vendor.ref(false);
    function selectCategory(key) {
      category.value = key;
    }
    async function handleSubmit() {
      const text = content.value.trim();
      if (!text || submitting.value)
        return;
      submitting.value = true;
      try {
        await api_cloud.submitFeedback(category.value, text);
        submitted.value = true;
      } catch {
        common_vendor.index.showToast({ title: "提交失败，请重试", icon: "none" });
      } finally {
        submitting.value = false;
      }
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: submitted.value
      }, submitted.value ? {
        b: common_vendor.o(goBack, "e4")
      } : {
        c: common_vendor.f(CATEGORIES, (cat, k0, i0) => {
          return {
            a: common_vendor.t(cat.emoji),
            b: common_vendor.t(cat.label),
            c: cat.key,
            d: category.value === cat.key ? 1 : "",
            e: common_vendor.o(($event) => selectCategory(cat.key), cat.key)
          };
        }),
        d: MAX_LENGTH,
        e: submitting.value,
        f: content.value,
        g: common_vendor.o(($event) => content.value = $event.detail.value, "19"),
        h: common_vendor.t(content.value.length),
        i: common_vendor.t(MAX_LENGTH),
        j: common_vendor.t(submitting.value ? "提交中..." : "提交反馈"),
        k: !content.value.trim() || submitting.value ? 1 : "",
        l: submitting.value ? 1 : "",
        m: common_vendor.o(handleSubmit, "b8")
      });
    };
  }
});
wx.createPage(_sfc_main);
