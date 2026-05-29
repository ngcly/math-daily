"use strict";
const common_vendor = require("../common/vendor.js");
const api_cloud = require("../api/cloud.js");
const utils_date = require("../utils/date.js");
function dayBefore(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return utils_date.dateToStr(d);
}
const useUserStore = common_vendor.defineStore("user", () => {
  const profile = common_vendor.ref(null);
  const lastActiveDate = common_vendor.ref("");
  const lastCheckDate = common_vendor.ref("");
  const lastRescueResetMonth = common_vendor.ref("");
  const streak = common_vendor.computed(() => {
    var _a;
    return ((_a = profile.value) == null ? void 0 : _a.streak) ?? 0;
  });
  const isLoggedIn = common_vendor.computed(() => !!profile.value);
  const pendingRescueDate = common_vendor.computed(() => {
    if (!profile.value || !lastActiveDate.value)
      return "";
    if (profile.value.streak_rescue <= 0)
      return "";
    const todayStr = utils_date.today();
    if (lastActiveDate.value === todayStr)
      return "";
    if (utils_date.isConsecutiveDay(lastActiveDate.value, todayStr))
      return "";
    const yesterdayStr = dayBefore(todayStr);
    return utils_date.isConsecutiveDay(lastActiveDate.value, yesterdayStr) ? yesterdayStr : "";
  });
  async function init() {
    try {
      profile.value = await api_cloud.initUser();
      checkStreak();
    } catch (e) {
      console.error("[UserStore] init failed", e);
    }
  }
  function checkStreak() {
    if (!profile.value)
      return;
    const todayStr = utils_date.today();
    if (lastCheckDate.value === todayStr)
      return;
    lastCheckDate.value = todayStr;
    const currentMonth = todayStr.slice(0, 7);
    if (lastRescueResetMonth.value !== currentMonth) {
      lastRescueResetMonth.value = currentMonth;
      if (profile.value.streak_rescue < 1) {
        profile.value.streak_rescue = 1;
        syncProfile();
      }
    }
    if (!lastActiveDate.value)
      return;
    if (utils_date.isConsecutiveDay(lastActiveDate.value, todayStr))
      return;
    if (profile.value.streak > 0) {
      const yesterdayStr = dayBefore(todayStr);
      const canRescue = utils_date.isConsecutiveDay(lastActiveDate.value, yesterdayStr) && profile.value.streak_rescue > 0;
      if (!canRescue) {
        profile.value.streak = 0;
        syncProfile();
      }
    }
  }
  function useRescue(rescuedDate) {
    if (!profile.value)
      return;
    profile.value.streak += 1;
    profile.value.streak_rescue -= 1;
    lastActiveDate.value = rescuedDate;
    syncProfile();
  }
  function onCompleted() {
    if (!profile.value)
      return;
    const todayStr = utils_date.today();
    if (lastActiveDate.value !== todayStr) {
      const consecutive = !lastActiveDate.value || utils_date.isConsecutiveDay(lastActiveDate.value, todayStr);
      profile.value.streak = consecutive ? profile.value.streak + 1 : 1;
      lastActiveDate.value = todayStr;
      syncProfile();
    }
  }
  async function updatePrefs(prefs) {
    if (!profile.value)
      return;
    Object.assign(profile.value, prefs);
    await api_cloud.updateSettings(prefs);
  }
  let syncTimer = null;
  function syncProfile() {
    if (syncTimer)
      clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (profile.value) {
        api_cloud.updateSettings({
          streak: profile.value.streak,
          streak_rescue: profile.value.streak_rescue
        }).catch(console.error);
      }
    }, 1e3);
  }
  return {
    profile,
    streak,
    isLoggedIn,
    pendingRescueDate,
    init,
    checkStreak,
    onCompleted,
    useRescue,
    updatePrefs
  };
}, {
  unistorage: {
    paths: ["lastActiveDate", "lastCheckDate", "lastRescueResetMonth"]
  }
});
exports.useUserStore = useUserStore;
