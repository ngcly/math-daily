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
    const avatarUrl = common_vendor.ref("");
    const nickname = common_vendor.ref("");
    const REMIND_HOURS = Array.from(
      { length: 24 },
      (_, i) => `${String(i).padStart(2, "0")}:00`
    );
    const remindTime = common_vendor.ref("08:00");
    const remindIndex = common_vendor.ref(8);
    common_vendor.onShow(() => {
      themeStore.setCurrentTab(2);
    });
    common_vendor.watch(profile, (p) => {
      if (!p)
        return;
      avatarUrl.value = p.avatar_url || "";
      nickname.value = p.nickname || "";
      remindTime.value = p.remind_time;
      const idx = REMIND_HOURS.indexOf(p.remind_time);
      remindIndex.value = idx >= 0 ? idx : 8;
    }, { immediate: true });
    async function onChooseAvatar(e) {
      const tempPath = e.detail.avatarUrl;
      if (!tempPath || !profile.value)
        return;
      common_vendor.index.showLoading({ title: "保存中..." });
      try {
        const fileID = await new Promise((resolve, reject) => {
          common_vendor.wx$1.cloud.uploadFile({
            cloudPath: `avatars/${profile.value._id}.jpg`,
            filePath: tempPath,
            success: (res) => resolve(res.fileID),
            fail: reject
          });
        });
        avatarUrl.value = fileID;
        await userStore.updatePrefs({ avatar_url: fileID });
        common_vendor.index.showToast({ title: "头像已更新", icon: "success" });
      } catch {
        common_vendor.index.showToast({ title: "头像保存失败，请重试", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    }
    async function onNicknameBlur(e) {
      var _a;
      const name = (e.detail.value ?? "").trim();
      if (!name || name === ((_a = profile.value) == null ? void 0 : _a.nickname))
        return;
      nickname.value = name;
      await userStore.updatePrefs({ nickname: name });
      common_vendor.index.showToast({ title: "昵称已保存", icon: "success" });
    }
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
    function goFeedback() {
      common_vendor.index.navigateTo({ url: "/pages/feedback/index" });
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
      var _a, _b, _c, _d, _e;
      return common_vendor.e({
        a: avatarUrl.value
      }, avatarUrl.value ? {
        b: avatarUrl.value
      } : {}, {
        c: common_vendor.o(onChooseAvatar, "57"),
        d: nickname.value,
        e: common_vendor.o(onNicknameBlur, "88"),
        f: common_vendor.t(remindTime.value),
        g: common_vendor.unref(REMIND_HOURS),
        h: remindIndex.value,
        i: common_vendor.o(onRemindChange, "55"),
        j: common_vendor.t(((_a = profile.value) == null ? void 0 : _a.subscribed) ? "✅ 已开启" : "未开启"),
        k: ((_b = profile.value) == null ? void 0 : _b.subscribed) ? 1 : "",
        l: common_vendor.t(((_c = profile.value) == null ? void 0 : _c.subscribed) ? "重新订阅" : "订阅每日推送通知"),
        m: common_vendor.o(requestSubscribe, "e5"),
        n: common_vendor.t(((_d = profile.value) == null ? void 0 : _d.streak) ?? 0),
        o: common_vendor.t(((_e = profile.value) == null ? void 0 : _e.streak_rescue) ?? 0),
        p: common_vendor.t(canRescue.value ? `补签 ${pendingRescueDate.value}` : "暂无可补签的日期"),
        q: !canRescue.value ? 1 : "",
        r: common_vendor.o(goRescue, "c8"),
        s: common_vendor.o(goFeedback, "1e"),
        t: common_vendor.o(clearDrafts, "c9")
      });
    };
  }
});
wx.createPage(_sfc_main);
