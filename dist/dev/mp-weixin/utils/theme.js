"use strict";
const common_vendor = require("../common/vendor.js");
const TAB_BAR_ITEMS = [
  {
    text: "今日题",
    iconPath: "static/icons/home.png",
    selectedIconPath: "static/icons/home-active.png",
    selectedIconPathDark: "static/icons/home-active-dark.png"
  },
  {
    text: "历史",
    iconPath: "static/icons/history.png",
    selectedIconPath: "static/icons/history-active.png",
    selectedIconPathDark: "static/icons/history-active-dark.png"
  },
  {
    text: "设置",
    iconPath: "static/icons/settings.png",
    selectedIconPath: "static/icons/settings-active.png",
    selectedIconPathDark: "static/icons/settings-active-dark.png"
  }
];
function getSystemIsDark() {
  var _a, _b;
  try {
    const appBaseInfo = (_b = (_a = common_vendor.wx$1).getAppBaseInfo) == null ? void 0 : _b.call(_a);
    if (appBaseInfo == null ? void 0 : appBaseInfo.theme)
      return appBaseInfo.theme === "dark";
  } catch {
  }
  try {
    return common_vendor.wx$1.getSystemInfoSync().theme === "dark";
  } catch {
    return false;
  }
}
function syncNativeTabBarTheme(isDark) {
  var _a, _b;
  const style = {
    color: isDark ? "#606060" : "#aaaaaa",
    selectedColor: isDark ? "#f0f0f0" : "#1a1a1a",
    backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
    borderStyle: "black"
  };
  (_b = (_a = common_vendor.wx$1).setTabBarStyle) == null ? void 0 : _b.call(_a, {
    ...style,
    fail: () => {
    }
  });
  TAB_BAR_ITEMS.forEach((item, index) => {
    var _a2, _b2;
    (_b2 = (_a2 = common_vendor.wx$1).setTabBarItem) == null ? void 0 : _b2.call(_a2, {
      index,
      text: item.text,
      iconPath: item.iconPath,
      selectedIconPath: isDark ? item.selectedIconPathDark : item.selectedIconPath,
      fail: () => {
      }
    });
  });
}
exports.getSystemIsDark = getSystemIsDark;
exports.syncNativeTabBarTheme = syncNativeTabBarTheme;
