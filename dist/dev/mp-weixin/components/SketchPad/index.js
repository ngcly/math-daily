"use strict";
const common_vendor = require("../../common/vendor.js");
const store_draft = require("../../store/draft.js");
const store_theme = require("../../store/theme.js");
const ERASER_RADIUS = 12;
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  props: {
    questionId: {}
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const draftStore = store_draft.useDraftStore();
    const instance = common_vendor.getCurrentInstance();
    const canvasId = `sp_${props.questionId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    let ctx = null;
    let canvasNode = null;
    let canvasRect = { left: 0, top: 0, width: 0, height: 0 };
    const themeStore = store_theme.useThemeStore();
    const activeTool = common_vendor.ref("pen");
    const activeColor = common_vendor.ref(themeStore.isDark ? "#e0e0e0" : "#333333");
    const activeWidth = common_vendor.ref(2);
    const canUndo = common_vendor.ref(false);
    const canRedo = common_vendor.ref(false);
    const PEN_WIDTHS = [2, 4, 7];
    const LIGHT_COLORS = ["#333333", "#e53935"];
    const DARK_COLORS = ["#e0e0e0", "#ef5350"];
    const COLORS = common_vendor.computed(() => themeStore.isDark ? DARK_COLORS : LIGHT_COLORS);
    common_vendor.watch(() => themeStore.isDark, (dark) => {
      const prevColors = dark ? LIGHT_COLORS : DARK_COLORS;
      const idx = prevColors.indexOf(activeColor.value);
      if (idx !== -1)
        activeColor.value = COLORS.value[idx];
      redrawAll();
    });
    const strokes = common_vendor.ref([]);
    const redoStack = common_vendor.ref([]);
    let currentStroke = null;
    const transform = common_vendor.ref({
      scale: 1,
      offsetX: 0,
      offsetY: 0
    });
    let lastPinch = null;
    let saveTimer = null;
    common_vendor.onMounted(async () => {
      await common_vendor.nextTick$1();
      await initCanvas();
      loadDraft();
    });
    common_vendor.onUnmounted(() => {
      if (saveTimer)
        clearTimeout(saveTimer);
      persistDraft();
    });
    function queryWithTimeout(queryFn, timeout = 3e3) {
      return new Promise((resolve) => {
        var _a;
        const timer = setTimeout(() => {
          console.warn("[SketchPad] SelectorQuery timeout, canvasId =", canvasId);
          resolve(null);
        }, timeout);
        const scope = (_a = instance == null ? void 0 : instance.ctx) == null ? void 0 : _a.$scope;
        const query = scope ? common_vendor.index.createSelectorQuery().in(scope) : common_vendor.index.createSelectorQuery();
        queryFn(query);
        query.exec((res) => {
          clearTimeout(timer);
          resolve((res == null ? void 0 : res[0]) ?? null);
        });
      });
    }
    async function initCanvas() {
      var _a, _b, _c;
      const res = await queryWithTimeout(
        (q) => q.select(`#${canvasId}`).fields({ node: true, size: true, rect: true })
      );
      if (!(res == null ? void 0 : res.node)) {
        console.error("[SketchPad] canvas node not found, id =", canvasId);
        return;
      }
      canvasRect = {
        left: res.left ?? 0,
        top: res.top ?? 0,
        width: res.width ?? 300,
        height: res.height ?? 400
      };
      const canvas = res.node;
      canvasNode = canvas;
      ctx = canvas.getContext("2d");
      const dpr = ((_c = (_b = (_a = common_vendor.index).getWindowInfo) == null ? void 0 : _b.call(_a)) == null ? void 0 : _c.pixelRatio) ?? common_vendor.index.getSystemInfoSync().pixelRatio ?? 1;
      canvas.width = res.width * dpr;
      canvas.height = res.height * dpr;
      ctx.scale(dpr, dpr);
    }
    function loadDraft() {
      const data = draftStore.load(props.questionId);
      if (data) {
        strokes.value = data.strokes;
        transform.value = data.transform;
        canUndo.value = strokes.value.length > 0;
        redrawAll();
      }
    }
    function scheduleSave() {
      if (saveTimer)
        clearTimeout(saveTimer);
      saveTimer = setTimeout(persistDraft, 800);
    }
    function persistDraft() {
      const data = {
        strokes: strokes.value,
        transform: transform.value,
        savedAt: Date.now()
      };
      draftStore.save(props.questionId, data);
    }
    function screenToCanvas(sx, sy) {
      const t = transform.value;
      return {
        x: (sx - canvasRect.left - t.offsetX) / t.scale,
        y: (sy - canvasRect.top - t.offsetY) / t.scale
      };
    }
    function onTouchStart(e) {
      const touches = e.touches;
      if (touches.length === 1) {
        const t = touches[0];
        const pt = screenToCanvas(t.clientX, t.clientY);
        if (activeTool.value === "eraser") {
          currentStroke = null;
          eraseAt(pt);
          redrawAll();
        } else {
          currentStroke = {
            color: activeColor.value,
            width: activeWidth.value,
            points: [pt]
          };
        }
        lastPinch = null;
      } else if (touches.length === 2) {
        currentStroke = null;
        lastPinch = getPinchState(touches);
      }
    }
    function onTouchMove(e) {
      var _a;
      (_a = e.preventDefault) == null ? void 0 : _a.call(e);
      const touches = e.touches;
      if (touches.length === 1 && lastPinch === null) {
        const t = touches[0];
        const pt = screenToCanvas(t.clientX, t.clientY);
        if (activeTool.value === "eraser") {
          eraseAt(pt);
          redrawAll();
          return;
        }
        if (!currentStroke)
          return;
        currentStroke.points.push(pt);
        drawLatestSegment(currentStroke);
      } else if (touches.length === 2) {
        handlePinch(touches);
      }
    }
    function onTouchEnd(e) {
      if (touches_length(e) === 0 && currentStroke) {
        if (currentStroke.points.length > 1) {
          strokes.value.push(currentStroke);
          redoStack.value = [];
          canUndo.value = true;
          canRedo.value = false;
          scheduleSave();
        }
        currentStroke = null;
        redrawAll();
      }
      if (touches_length(e) < 2) {
        lastPinch = null;
      }
    }
    function touches_length(e) {
      var _a;
      return ((_a = e.touches) == null ? void 0 : _a.length) ?? 0;
    }
    function getPinchState(touches) {
      const [t1, t2] = touches;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      return { dist, cx, cy };
    }
    function handlePinch(touches) {
      if (!lastPinch) {
        lastPinch = getPinchState(touches);
        return;
      }
      const curr = getPinchState(touches);
      const t = transform.value;
      const ratio = curr.dist / lastPinch.dist;
      const newScale = Math.min(5, Math.max(0.4, t.scale * ratio));
      const pivotX = curr.cx - canvasRect.left;
      const pivotY = curr.cy - canvasRect.top;
      const dx = curr.cx - lastPinch.cx;
      const dy = curr.cy - lastPinch.cy;
      transform.value = {
        scale: newScale,
        offsetX: pivotX - (pivotX - t.offsetX) * (newScale / t.scale) + dx,
        offsetY: pivotY - (pivotY - t.offsetY) * (newScale / t.scale) + dy
      };
      lastPinch = curr;
      redrawAll();
    }
    function redrawAll() {
      if (!ctx)
        return;
      const c = ctx;
      c.clearRect(0, 0, canvasRect.width * 4, canvasRect.height * 4);
      const t = transform.value;
      c.save();
      c.translate(t.offsetX, t.offsetY);
      c.scale(t.scale, t.scale);
      drawDotGrid(c);
      for (const stroke of strokes.value) {
        drawStroke(c, stroke);
      }
      if (currentStroke && currentStroke.points.length > 1) {
        drawStroke(c, currentStroke);
      }
      c.restore();
    }
    function drawLatestSegment(stroke) {
      if (!ctx || stroke.points.length < 2)
        return;
      const c = ctx;
      const t = transform.value;
      const pts = stroke.points;
      c.save();
      c.translate(t.offsetX, t.offsetY);
      c.scale(t.scale, t.scale);
      c.beginPath();
      c.strokeStyle = stroke.color;
      c.lineWidth = stroke.width / t.scale;
      c.lineCap = "round";
      c.lineJoin = "round";
      const len = pts.length;
      if (len === 2) {
        c.moveTo(pts[0].x, pts[0].y);
        c.lineTo(pts[1].x, pts[1].y);
      } else {
        const p0 = pts[len - 3];
        const p1 = pts[len - 2];
        const p2 = pts[len - 1];
        const mid1x = (p0.x + p1.x) / 2;
        const mid1y = (p0.y + p1.y) / 2;
        const mid2x = (p1.x + p2.x) / 2;
        const mid2y = (p1.y + p2.y) / 2;
        c.moveTo(mid1x, mid1y);
        c.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
      }
      c.stroke();
      c.restore();
    }
    function drawStroke(c, stroke) {
      const pts = stroke.points;
      if (pts.length < 2)
        return;
      c.beginPath();
      c.strokeStyle = stroke.color;
      c.lineWidth = stroke.width / transform.value.scale;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        c.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      c.stroke();
    }
    function drawDotGrid(c) {
      const GRID = 20;
      const t = transform.value;
      const DOT_R = 0.8 / t.scale;
      const left = -t.offsetX / t.scale;
      const top = -t.offsetY / t.scale;
      const right = left + canvasRect.width / t.scale;
      const bottom = top + canvasRect.height / t.scale;
      const startX = Math.floor(left / GRID) * GRID;
      const startY = Math.floor(top / GRID) * GRID;
      c.fillStyle = themeStore.isDark ? "#3a3820" : "#d4cc80";
      for (let x = startX; x <= right; x += GRID) {
        for (let y = startY; y <= bottom; y += GRID) {
          c.beginPath();
          c.arc(x, y, DOT_R, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    function eraseAt(pt) {
      const before = strokes.value.length;
      strokes.value = strokes.value.filter((stroke) => {
        return !stroke.points.some(
          (p) => Math.hypot(p.x - pt.x, p.y - pt.y) < ERASER_RADIUS / transform.value.scale
        );
      });
      if (strokes.value.length !== before) {
        canUndo.value = strokes.value.length > 0;
        scheduleSave();
      }
    }
    function undo() {
      if (!strokes.value.length)
        return;
      const last = strokes.value.pop();
      redoStack.value.push(last);
      canUndo.value = strokes.value.length > 0;
      canRedo.value = true;
      redrawAll();
      scheduleSave();
    }
    function redo() {
      if (!redoStack.value.length)
        return;
      const stroke = redoStack.value.pop();
      strokes.value.push(stroke);
      canUndo.value = true;
      canRedo.value = redoStack.value.length > 0;
      redrawAll();
      scheduleSave();
    }
    function clearAll() {
      common_vendor.index.showModal({
        title: "清空草稿",
        content: "确定清空所有内容？",
        success: (res) => {
          if (!res.confirm)
            return;
          strokes.value = [];
          redoStack.value = [];
          canUndo.value = false;
          canRedo.value = false;
          redrawAll();
          draftStore.clear(props.questionId);
        }
      });
    }
    function setTool(tool) {
      activeTool.value = tool;
    }
    function setColor(color) {
      activeColor.value = color;
      activeTool.value = "pen";
    }
    function setWidth(w) {
      activeWidth.value = w;
      activeTool.value = "pen";
    }
    function capture() {
      return new Promise((resolve, reject) => {
        common_vendor.index.canvasToTempFilePath({
          canvasId,
          canvas: canvasNode,
          // type="2d" 必须传节点引用，否则截图失败
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        });
      });
    }
    __expose({ capture, undo, redo, clearAll });
    return (_ctx, _cache) => {
      return {
        a: activeTool.value === "pen" ? 1 : "",
        b: common_vendor.o(($event) => setTool("pen"), "7a"),
        c: activeTool.value === "eraser" ? 1 : "",
        d: common_vendor.o(($event) => setTool("eraser"), "48"),
        e: common_vendor.f(PEN_WIDTHS, (w, k0, i0) => {
          return {
            a: `${w * 4}rpx`,
            b: `${w * 4}rpx`,
            c: w,
            d: activeWidth.value === w && activeTool.value === "pen" ? 1 : "",
            e: common_vendor.o(($event) => setWidth(w), w)
          };
        }),
        f: common_vendor.f(COLORS.value, (c, k0, i0) => {
          return {
            a: c,
            b: activeColor.value === c && activeTool.value === "pen" ? 1 : "",
            c,
            d: common_vendor.o(($event) => setColor(c), c)
          };
        }),
        g: !canUndo.value ? 1 : "",
        h: common_vendor.o(undo, "31"),
        i: !canRedo.value ? 1 : "",
        j: common_vendor.o(redo, "fa"),
        k: common_vendor.o(clearAll, "c8"),
        l: canvasId,
        m: common_vendor.o(onTouchStart, "5c"),
        n: common_vendor.o(onTouchMove, "a3"),
        o: common_vendor.o(onTouchEnd, "df")
      };
    };
  }
});
wx.createComponent(_sfc_main);
