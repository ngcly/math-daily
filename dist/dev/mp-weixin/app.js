"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
const store_user = require("./store/user.js");
const store_question = require("./store/question.js");
const store_theme = require("./store/theme.js");
const utils_theme = require("./utils/theme.js");
const api_cloud = require("./api/cloud.js");
const utils_date = require("./utils/date.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/draft/index.js";
  "./pages/result/index.js";
  "./pages/review/index.js";
  "./pages/history/index.js";
  "./pages/settings/index.js";
  "./pages/feedback/index.js";
}
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "App",
  setup(__props) {
    const userStore = store_user.useUserStore();
    const questionStore = store_question.useQuestionStore();
    const themeStore = store_theme.useThemeStore();
    common_vendor.onLaunch((options) => {
      var _a, _b, _c;
      common_vendor.wx$1.cloud.init({
        env: "cloud1-d4g6o6y529c3db4b2",
        traceUser: true
      });
      themeStore.setSystemTheme(utils_theme.getSystemIsDark());
      userStore.init();
      questionStore.loadToday();
      (_b = (_a = common_vendor.index).onThemeChange) == null ? void 0 : _b.call(_a, (res) => {
        themeStore.setSystemTheme(res.theme === "dark");
      });
      const todayStr = utils_date.today();
      const lastOpenDate = common_vendor.index.getStorageSync("last_open_date") || "";
      if (lastOpenDate !== todayStr) {
        api_cloud.logEvent("app_open", {
          scene: (options == null ? void 0 : options.scene) ?? null,
          ref: ((_c = options == null ? void 0 : options.query) == null ? void 0 : _c.ref) ?? null
        });
        try {
          common_vendor.index.setStorageSync("last_open_date", todayStr);
        } catch {
        }
      }
    });
    common_vendor.onShow(() => {
      userStore.checkStreak();
    });
    return (_ctx, _cache) => {
      return {};
    };
  }
});
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  const pinia = common_vendor.createPinia();
  pinia.use(common_vendor.createUnistorage());
  app.use(pinia);
  return { app, pinia };
}
createApp().app.mount("#app");
exports.createApp = createApp;
