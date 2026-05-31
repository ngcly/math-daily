"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    return (_ctx, _cache) => {
      return {
        a: common_vendor.f(7, (i, k0, i0) => {
          return {
            a: i
          };
        }),
        b: common_vendor.f(5, (i, k0, i0) => {
          return {
            a: i
          };
        })
      };
    };
  }
});
wx.createComponent(_sfc_main);
