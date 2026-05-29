"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_date = require("../../utils/date.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  props: {
    year: {},
    month: {},
    records: {}
  },
  emits: ["dayClick", "prevMonth", "nextMonth"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const todayStr = utils_date.today();
    const totalDays = common_vendor.computed(() => utils_date.daysInMonth(props.year, props.month));
    const startWeekday = common_vendor.computed(() => {
      const dow = utils_date.firstDayOfMonth(props.year, props.month).getDay();
      return (dow + 6) % 7;
    });
    const doneDates = common_vendor.computed(() => {
      const set = /* @__PURE__ */ new Set();
      props.records.forEach((r) => set.add(r.date));
      return set;
    });
    const correctDates = common_vendor.computed(() => {
      const set = /* @__PURE__ */ new Set();
      props.records.filter((r) => r.is_correct).forEach((r) => set.add(r.date));
      return set;
    });
    const calDays = common_vendor.computed(() => {
      const cells = [];
      for (let i = 0; i < startWeekday.value; i++) {
        cells.push({ day: null, dateStr: "", isDone: false, isCorrect: false, isToday: false, isFuture: false });
      }
      for (let d = 1; d <= totalDays.value; d++) {
        const dateStr = `${props.year}-${String(props.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        cells.push({
          day: d,
          dateStr,
          isDone: doneDates.value.has(dateStr),
          isCorrect: correctDates.value.has(dateStr),
          isToday: dateStr === todayStr,
          isFuture: dateStr > todayStr
        });
      }
      return cells;
    });
    const monthLabel = common_vendor.computed(
      () => `${props.year} 年 ${props.month} 月`
    );
    const completionRate = common_vendor.computed(() => {
      const passedDays = calDays.value.filter((c) => c.day && !c.isFuture).length;
      if (passedDays === 0)
        return 0;
      return Math.round(doneDates.value.size / passedDays * 100);
    });
    function onDayTap(cell) {
      if (!cell.day || cell.isFuture || !cell.isDone)
        return;
      emit("dayClick", cell.dateStr);
    }
    return (_ctx, _cache) => {
      return {
        a: common_vendor.o(($event) => emit("prevMonth"), "87"),
        b: common_vendor.t(monthLabel.value),
        c: common_vendor.t(completionRate.value),
        d: common_vendor.o(($event) => emit("nextMonth"), "7c"),
        e: common_vendor.f(["一", "二", "三", "四", "五", "六", "日"], (w, k0, i0) => {
          return {
            a: common_vendor.t(w),
            b: w
          };
        }),
        f: common_vendor.f(calDays.value, (cell, i, i0) => {
          return common_vendor.e({
            a: common_vendor.t(cell.day ?? ""),
            b: cell.isDone && !cell.isToday
          }, cell.isDone && !cell.isToday ? {
            c: common_vendor.n(cell.isCorrect ? "calendar__dot--green" : "calendar__dot--red")
          } : {}, {
            d: i,
            e: !cell.day ? 1 : "",
            f: cell.isToday ? 1 : "",
            g: cell.isDone && !cell.isToday ? 1 : "",
            h: cell.isCorrect && !cell.isToday ? 1 : "",
            i: cell.isFuture ? 1 : "",
            j: cell.isDone && !cell.isFuture ? 1 : "",
            k: common_vendor.o(($event) => onDayTap(cell), i)
          });
        })
      };
    };
  }
});
wx.createComponent(_sfc_main);
