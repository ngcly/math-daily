<script setup lang="ts">
/**
 * SketchPad 草稿纸组件
 *
 * 职责：
 * - 手写笔迹（贝塞尔曲线平滑）
 * - 双指缩放 + 平移
 * - 橡皮擦
 * - 撤销 / 重做
 * - 自动保存到本地
 *
 * 使用：
 * <SketchPad :questionId="q._id" />
 */

import { ref, computed, watch, onMounted, onUnmounted, getCurrentInstance, nextTick } from 'vue'
import type { Stroke, StrokePoint, CanvasTransform, DraftData } from '@/types'
import { useDraftStore } from '@/store/draft'
import { useThemeStore } from '@/store/theme'

// ── Props ──────────────────────────────────────────────
const props = defineProps<{
  questionId: string
}>()

// ── Store ──────────────────────────────────────────────
const draftStore = useDraftStore()

// ── 组件实例（在 setup 顶层同步获取；uni-app 微信端真正需要的是 ctx.$scope，即微信原生组件实例）──
const instance = getCurrentInstance()

// ── Canvas 引用 ────────────────────────────────────────
// 云数据库 _id 可能以数字开头或含特殊字符，需要清洗成合法 CSS id
const canvasId = `sp_${props.questionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

/** 微信小程序 Canvas 2D 节点（type="2d"）的最小类型描述 */
interface Canvas2DNode {
  width: number
  height: number
  getContext(type: '2d'): CanvasRenderingContext2D | null
}

/** SelectorQuery fields() 查询 Canvas 2D 节点后返回的扁平结构 */
interface Canvas2DNodeFields {
  node: Canvas2DNode
  width: number
  height: number
  left: number
  top: number
  right: number
  bottom: number
}

let ctx: CanvasRenderingContext2D | null = null
let canvasNode: Canvas2DNode | null = null   // Canvas 2D 节点引用，canvasToTempFilePath 需要
let canvasRect = { left: 0, top: 0, width: 0, height: 0 }

// ── 主题（从全局 store 读取，跟随用户设置）─────────────
const themeStore = useThemeStore()

// ── 工具栏状态 ─────────────────────────────────────────
type Tool = 'pen' | 'eraser'
const activeTool  = ref<Tool>('pen')
const activeColor = ref(themeStore.isDark ? '#e0e0e0' : '#333333')
const activeWidth = ref(2)   // 逻辑像素，绘制时除以 scale
const canUndo     = ref(false)
const canRedo     = ref(false)

const PEN_WIDTHS = [2, 4, 7]   // 细/中/粗
const LIGHT_COLORS = ['#333333', '#e53935']
const DARK_COLORS  = ['#e0e0e0', '#ef5350']
const COLORS = computed(() => themeStore.isDark ? DARK_COLORS : LIGHT_COLORS)

watch(() => themeStore.isDark, (dark) => {
  const prevColors = dark ? LIGHT_COLORS : DARK_COLORS
  const idx = prevColors.indexOf(activeColor.value)
  if (idx !== -1) activeColor.value = COLORS.value[idx]
  redrawAll()
})

// ── 绘制状态 ───────────────────────────────────────────
// 已完成的笔迹列表
const strokes = ref<Stroke[]>([])
// 撤销栈：被 undo 的笔迹暂存这里
const redoStack = ref<Stroke[]>([])
// 当前正在画的笔迹
let currentStroke: Stroke | null = null

// ── 变换状态（缩放 + 平移）────────────────────────────
const transform = ref<CanvasTransform>({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
})

// 双指手势上一帧状态
let lastPinch: { dist: number; cx: number; cy: number } | null = null

// ── 自动保存防抖 ───────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null

// ════════════════════════════════════════════════════════
// 初始化
// ════════════════════════════════════════════════════════

onMounted(async () => {
  // 等待 Vue 完成 DOM 更新，再等一个微任务让微信原生层也完成渲染
  await nextTick()
  await initCanvas()
  loadDraft()
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  // 离开前立即保存
  persistDraft()
})

/** 带超时的 SelectorQuery 工具，防止回调永不触发导致 Promise 挂起 */
function queryWithTimeout<T>(
  queryFn: (query: UniApp.SelectorQuery) => void,
  timeout = 3000,
): Promise<T | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      console.warn('[SketchPad] SelectorQuery timeout, canvasId =', canvasId)
      resolve(null)
    }, timeout)

    // uni-app Vue3 中 .in() 需要传微信原生组件实例 (ctx.$scope)，
    // 而非 Vue 内部 proxy；若 $scope 不可用则不传，让框架自动处理作用域
    const scope = instance?.ctx?.$scope
    const query = scope
      ? uni.createSelectorQuery().in(scope)
      : uni.createSelectorQuery()
    queryFn(query)
    query.exec((res: (Canvas2DNodeFields | null)[]) => {
      clearTimeout(timer)
      resolve(res?.[0] ?? null)
    })
  })
}

async function initCanvas() {
  // 一次查询同时拿到：Canvas 节点、尺寸、位置（rect）
  // 避免单独调用 boundingClientRect()——该 API 在 uni-app Vue3 组件内有兼容性问题
  const res = await queryWithTimeout<Canvas2DNodeFields>(q =>
    q.select(`#${canvasId}`).fields({ node: true, size: true, rect: true })
  )

  if (!res?.node) {
    console.error('[SketchPad] canvas node not found, id =', canvasId)
    return
  }

  // 同步更新画布位置（用于 touch 坐标转换）
  canvasRect = {
    left:   res.left   ?? 0,
    top:    res.top    ?? 0,
    width:  res.width  ?? 300,
    height: res.height ?? 400,
  }

  const canvas = res.node
  canvasNode = canvas
  ctx = canvas.getContext('2d')

  // 适配高分屏（dpr 处理）；用 getWindowInfo 替代已废弃的 getSystemInfoSync
  const dpr = uni.getWindowInfo?.()?.pixelRatio ?? uni.getSystemInfoSync().pixelRatio ?? 1
  canvas.width  = res.width  * dpr
  canvas.height = res.height * dpr
  ctx.scale(dpr, dpr)
}

// ════════════════════════════════════════════════════════
// 草稿加载 / 保存
// ════════════════════════════════════════════════════════

function loadDraft() {
  const data = draftStore.load(props.questionId)
  if (data) {
    strokes.value    = data.strokes
    transform.value  = data.transform
    canUndo.value    = strokes.value.length > 0
    redrawAll()
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(persistDraft, 800)  // 800ms 防抖
}

function persistDraft() {
  const data: DraftData = {
    strokes:   strokes.value,
    transform: transform.value,
    savedAt:   Date.now(),
  }
  draftStore.save(props.questionId, data)
}

// ════════════════════════════════════════════════════════
// 坐标转换：屏幕坐标 → 画布逻辑坐标
// ════════════════════════════════════════════════════════

function screenToCanvas(sx: number, sy: number): StrokePoint {
  const t = transform.value
  return {
    x: (sx - canvasRect.left - t.offsetX) / t.scale,
    y: (sy - canvasRect.top  - t.offsetY) / t.scale,
  }
}

// ════════════════════════════════════════════════════════
// Touch 事件处理
// ════════════════════════════════════════════════════════

function onTouchStart(e: TouchEvent) {
  const touches = e.touches

  if (touches.length === 1) {
    // 单指：开始画笔 / 橡皮
    const t = touches[0]
    const pt = screenToCanvas(t.clientX, t.clientY)

    if (activeTool.value === 'eraser') {
      currentStroke = null
      eraseAt(pt)
      redrawAll()
    } else {
      currentStroke = {
        color:  activeColor.value,
        width:  activeWidth.value,
        points: [pt],
      }
    }
    lastPinch = null

  } else if (touches.length === 2) {
    // 双指：进入缩放/平移模式，取消当前笔迹
    currentStroke = null
    lastPinch = getPinchState(touches as unknown as Touch[])
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault?.()  // 阻止页面滚动
  const touches = e.touches

  if (touches.length === 1 && lastPinch === null) {
    const t = touches[0]
    const pt = screenToCanvas(t.clientX, t.clientY)

    if (activeTool.value === 'eraser') {
      eraseAt(pt)
      redrawAll()
      return
    }

    if (!currentStroke) return
    currentStroke.points.push(pt)

    // 增量绘制（只画最新的一段，不全量重绘，提升性能）
    drawLatestSegment(currentStroke)

  } else if (touches.length === 2) {
    handlePinch(touches as unknown as Touch[])
  }
}

function onTouchEnd(e: TouchEvent) {
  if (touchesLength(e) === 0 && currentStroke) {
    // 笔迹结束：加入 strokes，清空 redoStack
    if (currentStroke.points.length > 1) {
      strokes.value.push(currentStroke)
      redoStack.value = []
      canUndo.value = true
      canRedo.value  = false
      scheduleSave()
    }
    currentStroke = null
    // 笔迹结束后全量重绘（修正增量绘制的精度误差）
    redrawAll()
  }

  if (touchesLength(e) < 2) {
    lastPinch = null
  }
}

function touchesLength(e: TouchEvent): number {
  return e.touches?.length ?? 0
}

// ════════════════════════════════════════════════════════
// 双指缩放 / 平移
// ════════════════════════════════════════════════════════

interface Touch { clientX: number; clientY: number }

function getPinchState(touches: Touch[]) {
  const [t1, t2] = touches
  const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
  const cx = (t1.clientX + t2.clientX) / 2
  const cy = (t1.clientY + t2.clientY) / 2
  return { dist, cx, cy }
}

function handlePinch(touches: Touch[]) {
  if (!lastPinch) {
    lastPinch = getPinchState(touches)
    return
  }

  const curr  = getPinchState(touches)
  const t     = transform.value

  // 缩放比例（限制在 0.4x ~ 5x 之间）
  const ratio    = curr.dist / lastPinch.dist
  const newScale = Math.min(5, Math.max(0.4, t.scale * ratio))

  // 以双指中心为基准缩放（不偏移中心点）
  const pivotX = curr.cx - canvasRect.left
  const pivotY = curr.cy - canvasRect.top

  const dx = curr.cx - lastPinch.cx
  const dy = curr.cy - lastPinch.cy

  transform.value = {
    scale:   newScale,
    offsetX: pivotX - (pivotX - t.offsetX) * (newScale / t.scale) + dx,
    offsetY: pivotY - (pivotY - t.offsetY) * (newScale / t.scale) + dy,
  }

  lastPinch = curr
  redrawAll()
}

// ════════════════════════════════════════════════════════
// 绘制
// ════════════════════════════════════════════════════════

/** 全量重绘（缩放/撤销/加载时调用） */
function redrawAll() {
  if (!ctx) return

  ctx.clearRect(0, 0, canvasRect.width * 4, canvasRect.height * 4)

  // 应用变换
  const t = transform.value
  ctx.save()
  ctx.translate(t.offsetX, t.offsetY)
  ctx.scale(t.scale, t.scale)

  // 绘制点阵背景
  drawDotGrid(ctx)

  // 绘制所有已完成笔迹
  for (const stroke of strokes.value) {
    drawStroke(ctx, stroke)
  }

  // 绘制当前正在画的笔迹
  if (currentStroke && currentStroke.points.length > 1) {
    drawStroke(ctx, currentStroke)
  }

  ctx.restore()
}

/** 增量绘制（touchmove 时只画最新的一小段，性能更好） */
function drawLatestSegment(stroke: Stroke) {
  if (!ctx || stroke.points.length < 2) return
  const t = transform.value
  const pts = stroke.points

  ctx.save()
  ctx.translate(t.offsetX, t.offsetY)
  ctx.scale(t.scale, t.scale)

  ctx.beginPath()
  ctx.strokeStyle = stroke.color
  ctx.lineWidth   = stroke.width / t.scale
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  const len = pts.length
  if (len === 2) {
    ctx.moveTo(pts[0].x, pts[0].y)
    ctx.lineTo(pts[1].x, pts[1].y)
  } else {
    // 取最后三个点做贝塞尔
    const p0 = pts[len - 3]
    const p1 = pts[len - 2]
    const p2 = pts[len - 1]
    const mid1x = (p0.x + p1.x) / 2
    const mid1y = (p0.y + p1.y) / 2
    const mid2x = (p1.x + p2.x) / 2
    const mid2y = (p1.y + p2.y) / 2
    ctx.moveTo(mid1x, mid1y)
    ctx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y)
  }

  ctx.stroke()
  ctx.restore()
}

/** 绘制单条笔迹（贝塞尔曲线平滑） */
function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points
  if (pts.length < 2) return

  ctx.beginPath()
  ctx.strokeStyle = stroke.color
  ctx.lineWidth   = stroke.width / transform.value.scale
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  ctx.moveTo(pts[0].x, pts[0].y)

  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2
    const midY = (pts[i].y + pts[i + 1].y) / 2
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY)
  }

  // 最后一段直接到终点
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  ctx.stroke()
}

/** 点阵背景 */
function drawDotGrid(ctx: CanvasRenderingContext2D) {
  const GRID  = 20    // 点间距（逻辑像素）
  const t     = transform.value
  const DOT_R = 0.8 / t.scale

  // 只绘制可视区域内的点
  const left   = -t.offsetX / t.scale
  const top    = -t.offsetY / t.scale
  const right  = left + canvasRect.width  / t.scale
  const bottom = top  + canvasRect.height / t.scale

  const startX = Math.floor(left  / GRID) * GRID
  const startY = Math.floor(top   / GRID) * GRID

  ctx.fillStyle = themeStore.isDark ? '#3a3820' : '#d4cc80'
  for (let x = startX; x <= right; x += GRID) {
    for (let y = startY; y <= bottom; y += GRID) {
      ctx.beginPath()
      ctx.arc(x, y, DOT_R, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ════════════════════════════════════════════════════════
// 橡皮擦
// ════════════════════════════════════════════════════════

const ERASER_RADIUS = 12  // 橡皮擦半径（逻辑像素）

function eraseAt(pt: StrokePoint) {
  const before = strokes.value.length
  strokes.value = strokes.value.filter(stroke => {
    // 判断笔迹是否与橡皮擦圆形区域相交
    return !stroke.points.some(p =>
      Math.hypot(p.x - pt.x, p.y - pt.y) < ERASER_RADIUS / transform.value.scale
    )
  })
  if (strokes.value.length !== before) {
    canUndo.value = strokes.value.length > 0
    scheduleSave()
  }
}

// ════════════════════════════════════════════════════════
// 撤销 / 重做
// ════════════════════════════════════════════════════════

function undo() {
  if (!strokes.value.length) return
  const last = strokes.value.pop()!
  redoStack.value.push(last)
  canUndo.value = strokes.value.length > 0
  canRedo.value  = true
  redrawAll()
  scheduleSave()
}

function redo() {
  if (!redoStack.value.length) return
  const stroke = redoStack.value.pop()!
  strokes.value.push(stroke)
  canUndo.value = true
  canRedo.value  = redoStack.value.length > 0
  redrawAll()
  scheduleSave()
}

// ════════════════════════════════════════════════════════
// 清空
// ════════════════════════════════════════════════════════

function clearAll() {
  uni.showModal({
    title: '清空草稿',
    content: '确定清空所有内容？',
    success: (res) => {
      if (!res.confirm) return
      strokes.value   = []
      redoStack.value = []
      canUndo.value   = false
      canRedo.value   = false
      redrawAll()
      draftStore.clear(props.questionId)
    }
  })
}

// ════════════════════════════════════════════════════════
// 工具栏操作
// ════════════════════════════════════════════════════════

function setTool(tool: Tool)    { activeTool.value  = tool }
function setColor(color: string) { activeColor.value = color; activeTool.value = 'pen' }
function setWidth(w: number)    { activeWidth.value = w;     activeTool.value = 'pen' }

// ════════════════════════════════════════════════════════
// 截图（用于分享）
// ════════════════════════════════════════════════════════

function capture(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      canvas: canvasNode,   // type="2d" 必须传节点引用，否则截图失败
      success: (res) => resolve(res.tempFilePath),
      fail:    reject,
    })
  })
}

// 暴露给父组件
defineExpose({ capture, undo, redo, clearAll })
</script>

<template>
  <view class="sketchpad">

    <!-- 工具栏 -->
    <view class="toolbar">

      <!-- 笔 / 橡皮 -->
      <view
        class="toolbar__btn"
        :class="{ 'toolbar__btn--active': activeTool === 'pen' }"
        @tap="setTool('pen')"
      >
        <text class="toolbar__icon">✏️</text>
      </view>
      <view
        class="toolbar__btn"
        :class="{ 'toolbar__btn--active': activeTool === 'eraser' }"
        @tap="setTool('eraser')"
      >
        <text class="toolbar__icon">⌫</text>
      </view>

      <!-- 分割线 -->
      <view class="toolbar__sep" />

      <!-- 笔触粗细 -->
      <view
        v-for="w in PEN_WIDTHS"
        :key="w"
        class="toolbar__width"
        :class="{ 'toolbar__width--active': activeWidth === w && activeTool === 'pen' }"
        @tap="setWidth(w)"
      >
        <view
          class="toolbar__dot"
          :style="{ width: `${w * 4}rpx`, height: `${w * 4}rpx` }"
        />
      </view>

      <!-- 分割线 -->
      <view class="toolbar__sep" />

      <!-- 颜色 -->
      <view
        v-for="c in COLORS"
        :key="c"
        class="toolbar__color"
        :class="{ 'toolbar__color--active': activeColor === c && activeTool === 'pen' }"
        :style="{ background: c }"
        @tap="setColor(c)"
      />

      <!-- 分割线 -->
      <view class="toolbar__sep" />

      <!-- 撤销 / 重做 -->
      <view
        class="toolbar__btn"
        :class="{ 'toolbar__btn--disabled': !canUndo }"
        @tap="undo"
      >
        <text class="toolbar__icon">↩</text>
      </view>
      <view
        class="toolbar__btn"
        :class="{ 'toolbar__btn--disabled': !canRedo }"
        @tap="redo"
      >
        <text class="toolbar__icon">↪</text>
      </view>

      <!-- 清空 -->
      <view class="toolbar__btn toolbar__btn--danger" @tap="clearAll">
        <text class="toolbar__icon">🗑</text>
      </view>

    </view>

    <!-- Canvas 画布 -->
    <canvas
      :id="canvasId"
      type="2d"
      class="canvas"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      :disable-scroll="true"
    />

  </view>
</template>

<style lang="scss">

.sketchpad {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: $yellow;
}

// ── 工具栏 ──────────────────────────────────
.toolbar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  background: $white;
  border-bottom: 1rpx solid $ink-5;
  flex-shrink: 0;

  &__btn {
    width: 56rpx;
    height: 56rpx;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $paper;
    transition: background $duration-fast;

    &--active {
      background: $ink;
      .toolbar__icon { filter: var(--icon-filter); }
    }

    &--disabled {
      opacity: 0.3;
      pointer-events: none;
    }

    &--danger:active { background: $red-light; }

    &:active { opacity: 0.7; }
  }

  &__icon {
    font-size: 32rpx;
    line-height: 1;
  }

  &__sep {
    width: 1rpx;
    height: 36rpx;
    background: $ink-5;
    margin: 0 4rpx;
    flex-shrink: 0;
  }

  &__width {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid transparent;
    transition: border-color $duration-fast;

    &--active { border-color: $ink; }
  }

  &__dot {
    background: $ink;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__color {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 3rpx solid transparent;
    transition: border-color $duration-fast;

    &--active { border-color: $ink-3; outline: 3rpx solid $white; }
  }
}

// ── 画布 ────────────────────────────────────
.canvas {
  flex: 1;
  width: 100%;
  // 禁止 canvas 被系统手势拦截
  touch-action: none;
}
</style>
