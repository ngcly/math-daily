"use strict";
const common_vendor = require("../common/vendor.js");
function getSystemIsDark() {
  var _a, _b;
  try {
    const appBaseInfo = (_b = (_a = common_vendor.wx$1).getAppBaseInfo) == null ? void 0 : _b.call(_a);
    if (appBaseInfo == null ? void 0 : appBaseInfo.theme)
      return appBaseInfo.theme === "dark";
  } catch {
  }
  try {
    const info = common_vendor.index.getSystemInfoSync();
    return info.theme === "dark";
  } catch {
    return false;
  }
}
exports.getSystemIsDark = getSystemIsDark;
