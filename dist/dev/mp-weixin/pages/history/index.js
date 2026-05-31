"use strict";
const common_vendor = require("../../common/vendor.js");
const store_user = require("../../store/user.js");
const store_theme = require("../../store/theme.js");
const api_cloud = require("../../api/cloud.js");
const utils_date = require("../../utils/date.js");
if (!Math) {
  Calendar();
}
const Calendar = () => "../../components/Calendar/index.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const userStore = store_user.useUserStore();
    const themeStore = store_theme.useThemeStore();
    const streak = common_vendor.computed(() => userStore.streak);
    const now = /* @__PURE__ */ new Date();
    const viewYear = common_vendor.ref(now.getFullYear());
    const viewMonth = common_vendor.ref(now.getMonth() + 1);
    const records = common_vendor.ref([]);
    const loading = common_vendor.ref(false);
    const loadedYear = common_vendor.ref(0);
    const loadedMonth = common_vendor.ref(0);
    const totalDone = common_vendor.computed(() => records.value.length);
    const totalCorrect = common_vendor.computed(() => records.value.filter((r) => r.is_correct).length);
    const correctRate = common_vendor.computed(
      () => totalDone.value === 0 ? 0 : Math.round(totalCorrect.value / totalDone.value * 100)
    );
    common_vendor.onShow(() => {
      themeStore.setCurrentTab(1);
      const n = /* @__PURE__ */ new Date();
      const isCurrentMonth = viewYear.value === n.getFullYear() && viewMonth.value === n.getMonth() + 1;
      if (isCurrentMonth || loadedYear.value !== viewYear.value || loadedMonth.value !== viewMonth.value) {
        loadRecords();
      }
    });
    async function loadRecords() {
      loading.value = true;
      try {
        records.value = await api_cloud.getUserHistory({ year: viewYear.value, month: viewMonth.value });
        loadedYear.value = viewYear.value;
        loadedMonth.value = viewMonth.value;
      } catch {
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      } finally {
        loading.value = false;
      }
    }
    function prevMonth() {
      if (viewMonth.value === 1) {
        viewMonth.value = 12;
        viewYear.value--;
      } else
        viewMonth.value--;
      loadRecords();
    }
    function nextMonth() {
      const now2 = /* @__PURE__ */ new Date();
      if (viewYear.value === now2.getFullYear() && viewMonth.value === now2.getMonth() + 1)
        return;
      if (viewMonth.value === 12) {
        viewMonth.value = 1;
        viewYear.value++;
      } else
        viewMonth.value++;
      loadRecords();
    }
    function goReview(date) {
      common_vendor.index.navigateTo({ url: `/pages/review/index?date=${date}` });
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(streak.value),
        b: common_vendor.t(totalDone.value),
        c: common_vendor.t(correctRate.value),
        d: common_vendor.o(prevMonth, "ca"),
        e: common_vendor.o(nextMonth, "fe"),
        f: common_vendor.o(goReview, "7b"),
        g: common_vendor.p({
          year: viewYear.value,
          month: viewMonth.value,
          records: records.value
        }),
        h: loading.value
      }, loading.value ? {} : records.value.length === 0 ? {} : {}, {
        i: records.value.length === 0,
        j: common_vendor.f(records.value, (record, k0, i0) => {
          return {
            a: common_vendor.t(record.date.slice(5, 7)),
            b: common_vendor.t(record.date.slice(8, 10)),
            c: common_vendor.t(record.title),
            d: common_vendor.t(record.category),
            e: common_vendor.t(common_vendor.unref(utils_date.formatDuration)(record.time_spent)),
            f: common_vendor.t(record.is_correct ? "✅" : "❌"),
            g: record._id,
            h: common_vendor.o(($event) => goReview(record.date), record._id)
          };
        })
      });
    };
  }
});
wx.createPage(_sfc_main);
