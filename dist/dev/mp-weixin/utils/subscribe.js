"use strict";
const common_vendor = require("../common/vendor.js");
const DAILY_SUBSCRIBE_TEMPLATE_ID = "KiJLSpuOmVhQ5RJh5LqkQfbFVCQGcoaMkcV2WbOIcuU";
function requestDailySubscribe() {
  return new Promise((resolve) => {
    common_vendor.wx$1.requestSubscribeMessage({
      tmplIds: [DAILY_SUBSCRIBE_TEMPLATE_ID],
      success: (res) => {
        const status = res[DAILY_SUBSCRIBE_TEMPLATE_ID];
        if (status === "accept") {
          resolve("accept");
        } else if (status === "ban") {
          resolve("ban");
        } else {
          resolve("reject");
        }
      },
      fail: (err) => {
        console.error("[subscribe] requestSubscribeMessage failed:", err);
        resolve("fail");
      }
    });
  });
}
function showSubscribeStatusToast(status, successTitle = "订阅成功") {
  if (status === "accept") {
    common_vendor.index.showToast({ title: successTitle, icon: "none" });
    return;
  }
  if (status === "ban") {
    common_vendor.index.showToast({ title: "订阅消息已关闭，请在微信设置中开启", icon: "none" });
    return;
  }
  if (status === "fail") {
    common_vendor.index.showToast({ title: "订阅请求失败，请稍后重试", icon: "none" });
    return;
  }
  common_vendor.index.showToast({ title: "未开启提醒，可稍后再试", icon: "none" });
}
exports.requestDailySubscribe = requestDailySubscribe;
exports.showSubscribeStatusToast = showSubscribeStatusToast;
