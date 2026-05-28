"use strict";
const common_vendor = require("../../common/vendor.js");
const store_user = require("../../store/user.js");
const store_theme = require("../../store/theme.js");
const store_draft = require("../../store/draft.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    var _a, _b, _c;
    const userStore = store_user.useUserStore();
    const themeStore = store_theme.useThemeStore();
    const draftStore = store_draft.useDraftStore();
    common_vendor.onShow(() => {
      themeStore.setCurrentTab(2);
    });
    const profile = common_vendor.computed(() => userStore.profile);
    const remindTime = common_vendor.ref(((_a = profile.value) == null ? void 0 : _a.remind_time) ?? "08:00");
    const REMIND_HOURS = Array.from(
      { length: 24 },
      (_, i) => `${String(i).padStart(2, "0")}:00`
    );
    const remindIndex = common_vendor.ref(REMIND_HOURS.indexOf(remindTime.value));
    function onRemindChange(e) {
      remindIndex.value = e.detail.value;
      remindTime.value = REMIND_HOURS[e.detail.value];
      userStore.updatePrefs({ remind_time: remindTime.value });
    }
    const CATEGORIES = [
      "逻辑推理",
      "空间想象",
      "直觉挑战",
      "抽象思维",
      "博弈思维",
      "拆解估算"
    ];
    const selectedCats = common_vendor.ref(((_b = profile.value) == null ? void 0 : _b.pref_categories) ?? []);
    function toggleCategory(cat) {
      const idx = selectedCats.value.indexOf(cat);
      if (idx >= 0)
        selectedCats.value.splice(idx, 1);
      else
        selectedCats.value.push(cat);
      userStore.updatePrefs({ pref_categories: [...selectedCats.value] });
    }
    const DIFFICULTIES = [
      { label: "不限", value: null },
      { label: "轻松", value: 1 },
      { label: "适中", value: 3 },
      { label: "烧脑", value: 5 }
    ];
    const selectedDiff = common_vendor.ref(((_c = profile.value) == null ? void 0 : _c.pref_difficulty) ?? null);
    function setDifficulty(v) {
      selectedDiff.value = v;
      userStore.updatePrefs({ pref_difficulty: v });
    }
    function requestSubscribe() {
      const templateId = "KiJLSpuOmVhQ5RJh5LqkQbMrfWYqkUVIHj2C1Dy4k78";
      common_vendor.wx$1.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (res) => {
          if (res[templateId] === "accept") {
            userStore.updatePrefs({ subscribed: true });
            common_vendor.index.showToast({ title: "订阅成功 🔔", icon: "none" });
          } else if (res[templateId] === "reject") {
            userStore.updatePrefs({ subscribed: false });
            common_vendor.index.showToast({ title: "已取消订阅", icon: "none" });
          }
        }
      });
    }
    const pendingRescueDate = common_vendor.computed(() => userStore.pendingRescueDate);
    const canRescue = common_vendor.computed(() => !!pendingRescueDate.value);
    function goRescue() {
      if (!canRescue.value)
        return;
      common_vendor.index.navigateTo({ url: `/pages/draft/index?rescue_date=${pendingRescueDate.value}` });
    }
    const THEMES = [
      { label: "自动", value: "system" },
      { label: "浅色", value: "light" },
      { label: "深色", value: "dark" }
    ];
    function setTheme(v) {
      themeStore.setPreference(v);
    }
    function clearDrafts() {
      common_vendor.index.showModal({
        title: "清除草稿缓存",
        content: "将删除所有本地演算草稿，无法恢复。",
        confirmText: "清除",
        confirmColor: "#c62828",
        success: (res) => {
          if (!res.confirm)
            return;
          draftStore.clearAll();
          common_vendor.index.showToast({ title: "已清除", icon: "success" });
        }
      });
    }
    return (_ctx, _cache) => {
      var _a2, _b2;
      return {
        a: common_vendor.f(THEMES, (t, k0, i0) => {
          return {
            a: common_vendor.t(t.label),
            b: t.value,
            c: common_vendor.unref(themeStore).preference === t.value ? 1 : "",
            d: common_vendor.o(($event) => setTheme(t.value), t.value)
          };
        }),
        b: common_vendor.t(remindTime.value),
        c: common_vendor.unref(REMIND_HOURS),
        d: remindIndex.value,
        e: common_vendor.o(onRemindChange, "f2"),
        f: common_vendor.o(requestSubscribe, "c4"),
        g: common_vendor.f(CATEGORIES, (cat, k0, i0) => {
          return {
            a: common_vendor.t(cat),
            b: cat,
            c: selectedCats.value.includes(cat) ? 1 : "",
            d: common_vendor.o(($event) => toggleCategory(cat), cat)
          };
        }),
        h: common_vendor.f(DIFFICULTIES, (d, k0, i0) => {
          return {
            a: common_vendor.t(d.label),
            b: String(d.value),
            c: selectedDiff.value === d.value ? 1 : "",
            d: common_vendor.o(($event) => setDifficulty(d.value), String(d.value))
          };
        }),
        i: common_vendor.t(((_a2 = profile.value) == null ? void 0 : _a2.streak) ?? 0),
        j: common_vendor.t(((_b2 = profile.value) == null ? void 0 : _b2.streak_rescue) ?? 0),
        k: common_vendor.t(canRescue.value ? `补签 ${pendingRescueDate.value}` : "暂无可补签的日期"),
        l: !canRescue.value ? 1 : "",
        m: common_vendor.o(goRescue, "de"),
        n: common_vendor.o(clearDrafts, "cf"),
        o: common_vendor.n(common_vendor.unref(themeStore).themeClass)
      };
    };
  }
});
wx.createPage(_sfc_main);
