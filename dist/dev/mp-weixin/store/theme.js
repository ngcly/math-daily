"use strict";
const common_vendor = require("../common/vendor.js");
const utils_theme = require("../utils/theme.js");
const useThemeStore = common_vendor.defineStore("theme", {
  state: () => ({
    _systemIsDark: utils_theme.getSystemIsDark(),
    currentTabIndex: 0
  }),
  getters: {
    isDark(state) {
      return state._systemIsDark;
    },
    themeClass() {
      return this.isDark ? "theme-dark" : "theme-light";
    }
  },
  actions: {
    setSystemTheme(dark) {
      this._systemIsDark = dark;
    },
    setCurrentTab(index) {
      this.currentTabIndex = index;
    }
  }
});
exports.useThemeStore = useThemeStore;
