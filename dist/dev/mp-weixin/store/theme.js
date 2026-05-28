"use strict";
const common_vendor = require("../common/vendor.js");
const utils_theme = require("../utils/theme.js");
const useThemeStore = common_vendor.defineStore("theme", {
  state: () => ({
    preference: common_vendor.index.getStorageSync("theme_pref") || "system",
    _systemIsDark: utils_theme.getSystemIsDark(),
    currentTabIndex: 0
  }),
  unistorage: {
    paths: ["preference"]
    // _systemIsDark 和 currentTabIndex 不缓存，每次从系统重新读
  },
  getters: {
    isDark(state) {
      if (state.preference === "dark")
        return true;
      if (state.preference === "light")
        return false;
      return state._systemIsDark;
    },
    // 'system' 模式返回空字符串，让 CSS @media (prefers-color-scheme: dark) 接管内容区域。
    // 注意：class 选择器（specificity 10）高于 @media 内继承值（specificity 1），
    // 若在 system 模式也返回 'theme-light'，会导致 @media 的暗色变量被覆盖，内容变浅色。
    themeClass() {
      if (this.preference === "dark")
        return "theme-dark";
      if (this.preference === "light")
        return "theme-light";
      return "";
    }
  },
  actions: {
    setPreference(pref) {
      this.preference = pref;
      common_vendor.index.setStorageSync("theme_pref", pref);
    },
    setSystemTheme(dark) {
      this._systemIsDark = dark;
    },
    setCurrentTab(index) {
      this.currentTabIndex = index;
    }
  }
});
exports.useThemeStore = useThemeStore;
