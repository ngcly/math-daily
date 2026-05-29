"use strict";
const common_vendor = require("../../common/vendor.js");
const store_user = require("../../store/user.js");
const store_theme = require("../../store/theme.js");
const store_draft = require("../../store/draft.js");
const utils_subscribe = require("../../utils/subscribe.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const userStore = store_user.useUserStore();
    const themeStore = store_theme.useThemeStore();
    const draftStore = store_draft.useDraftStore();
    const profile = common_vendor.computed(() => userStore.profile);
    const REMIND_HOURS = Array.from(
      { length: 24 },
      (_, i) => `${String(i).padStart(2, "0")}:00`
    );
    const remindTime = common_vendor.ref("08:00");
    const remindIndex = common_vendor.ref(8);
    common_vendor.onShow(() => {
      themeStore.setCurrentTab(2);
      if (profile.value) {
        remindTime.value = profile.value.remind_time;
        const idx = REMIND_HOURS.indexOf(profile.value.remind_time);
        remindIndex.value = idx >= 0 ? idx : 8;
      }
    });
    function onRemindChange(e) {
      remindIndex.value = e.detail.value;
      remindTime.value = REMIND_HOURS[e.detail.value];
      userStore.updatePrefs({ remind_time: remindTime.value });
    }
    async function requestSubscribe() {
      const status = await utils_subscribe.requestDailySubscribe();
      if (status === "accept") {
        await userStore.updatePrefs({ subscribed: true });
      }
      utils_subscribe.showSubscribeStatusToast(status, "订阅成功 🔔");
    }
    const pendingRescueDate = common_vendor.computed(() => userStore.pendingRescueDate);
    const canRescue = common_vendor.computed(() => !!pendingRescueDate.value);
    function goRescue() {
      if (!canRescue.value)
        return;
      common_vendor.index.navigateTo({ url: `/pages/draft/index?rescue_date=${pendingRescueDate.value}` });
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
      var _a, _b;
      return {
        a: common_vendor.t(remindTime.value),
        b: common_vendor.unref(REMIND_HOURS),
        c: remindIndex.value,
        d: common_vendor.o(onRemindChange, "ba"),
        e: common_vendor.o(requestSubscribe, "1c"),
        f: common_vendor.t(((_a = profile.value) == null ? void 0 : _a.streak) ?? 0),
        g: common_vendor.t(((_b = profile.value) == null ? void 0 : _b.streak_rescue) ?? 0),
        h: common_vendor.t(canRescue.value ? `补签 ${pendingRescueDate.value}` : "暂无可补签的日期"),
        i: !canRescue.value ? 1 : "",
        j: common_vendor.o(goRescue, "b6"),
        k: common_vendor.o(clearDrafts, "cf")
      };
    };
  }
});
wx.createPage(_sfc_main);
