<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useQuestionStore } from '@/store/question'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { today, formatDisplayDate, dateToStr } from '@/utils/date'
import { CATEGORY_SUBTITLE } from '@/utils/category'
import type { Category } from '@/types'
import SkeletonCard from '@/components/SkeletonCard/index.vue'

// 是否显示骨架屏：没有缓存数据且正在加载
const showSkeleton = computed(() => loading.value && !question.value)

const questionStore = useQuestionStore()
const userStore     = useUserStore()
const themeStore    = useThemeStore()

const question           = computed(() => questionStore.todayQuestion)
const loading            = computed(() => questionStore.loading)
const loadError          = computed(() => questionStore.loadError)
const answered           = computed(() => questionStore.isAnswered)
const streak             = computed(() => userStore.streak)
const dateLabel          = computed(() => formatDisplayDate(today()))
const pendingRescueDate  = computed(() => userStore.pendingRescueDate)

// ── 难度 → 时间预估 ────────────────────────────────────
function timeEstimate(difficulty: number): string {
  if (difficulty <= 2) return '约5分钟'
  if (difficulty <= 3) return '约10分钟'
  return '约15分钟'
}

// ── 最近训练维度 ───────────────────────────────────────
const recentDims = computed(() => {
  const raw = questionStore.recentTrainedDims
  return [...new Set(raw.map(d => d.category))]
})

// ── 本周答题记录（周历条） ──────────────────────────────
const weekDays = computed(() => {
  const todayStr  = today()
  const todayDate = new Date(todayStr + 'T00:00:00')
  const dow    = todayDate.getDay()                        // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1                  // offset to Monday
  const monday = new Date(todayDate)
  monday.setDate(todayDate.getDate() - offset)

  return ['一','二','三','四','五','六','日'].map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = dateToStr(d)
    const rec = questionStore.weeklyResults.find(r => r.date === dateStr)
    return {
      date:     dateStr,
      label,
      isToday:  dateStr === todayStr,
      isFuture: dateStr > todayStr,
      result:   rec != null ? rec.is_correct : null,   // null = 无记录
    }
  })
})

// ── 社交热度数据 ────────────────────────────────────────
// 答题后优先用 submitResult.stats（含本次提交），否则用题目缓存里的 stats
const socialStats = computed(() => {
  const s = (answered.value && questionStore.submitResult?.stats)
    ? questionStore.submitResult.stats
    : question.value?.stats
  if (!s || s.total === 0) return null
  return {
    total: s.total,
    rate:  Math.round((s.correct / s.total) * 100),
  }
})

// 每次切回首页刷新（提交后数据即时可见，统计数据通过 Pinia 自动持久化）
onShow(() => {
  themeStore.setCurrentTab(0)
})

// 跳转草稿纸
function goToDraft() {
  if (!question.value) return
  uni.navigateTo({ url: `/pages/draft/index?id=${question.value._id}` })
}

// 已作答则跳转到解析页
function goToResult() {
  uni.navigateTo({ url: '/pages/result/index' })
}

// 跳转历史/签到记录页
function goToHistory() {
  uni.switchTab({ url: '/pages/history/index' })
}

function goRescue() {
  if (!pendingRescueDate.value) return
  uni.navigateTo({ url: `/pages/draft/index?rescue_date=${pendingRescueDate.value}` })
}

function goToSubmit() {
  if (!question.value) return
  uni.navigateTo({ url: `/pages/draft/index?id=${question.value._id}&submit=1` })
}
</script>

<template>
  <view class="page">

    <!-- 顶部：标题 + Streak -->
    <view class="header">
      <text class="header__title">别让你的脑生锈</text>
      <view class="streak-pill" v-if="streak > 0" @tap="goToHistory">
        <text class="streak-pill__fire">🔥</text>
        <text class="streak-pill__num">{{ streak }} 天连续</text>
      </view>
    </view>

    <!-- 日期 -->
    <text class="date-label">{{ dateLabel }}</text>

    <!-- 补签提示 Banner -->
    <view v-if="pendingRescueDate" class="rescue-banner" @tap="goRescue">
      <view class="rescue-banner__left">
        <text class="rescue-banner__icon">📅</text>
        <view>
          <text class="rescue-banner__title">昨天漏打卡了</text>
          <text class="rescue-banner__sub">你还有 1 次补签机会，连续天数不会中断</text>
        </view>
      </view>
      <text class="rescue-banner__arrow">去补签 →</text>
    </view>

    <!-- 骨架屏（首次加载无缓存时展示） -->
    <SkeletonCard v-if="showSkeleton" />

    <!-- 加载失败 -->
    <view v-else-if="loadError" class="error-wrap">
      <text class="error-wrap__emoji">😕</text>
      <text class="error-wrap__text">题目加载失败</text>
      <text class="error-wrap__sub">请检查网络后重试</text>
      <view class="error-wrap__btn" @tap="questionStore.loadToday()">
        <text>重新加载</text>
      </view>
    </view>

    <!-- 无题目 -->
    <view class="empty-wrap" v-else-if="!question">
      <text class="empty-wrap__emoji">📭</text>
      <text class="empty-wrap__text">今日暂无题目</text>
      <text class="empty-wrap__sub">明天再来看看吧</text>
    </view>

    <!-- 有题目 -->
    <block v-else>

      <!-- 本周打卡条 -->
      <view class="week-strip">
        <view
          v-for="day in weekDays"
          :key="day.date"
          class="week-strip__day"
        >
          <view
            class="week-strip__dot"
            :class="{
              'week-strip__dot--correct': day.result === true,
              'week-strip__dot--wrong':   day.result === false,
              'week-strip__dot--today':   day.isToday && day.result === null,
              'week-strip__dot--future':  day.isFuture && day.result === null,
            }"
          />
          <text
            class="week-strip__label"
            :class="{ 'week-strip__label--today': day.isToday }"
          >{{ day.label }}</text>
        </view>
      </view>

      <!-- 今日大脑训练提示 -->
      <view class="train-eyebrow">
        <text class="train-eyebrow__label">今日大脑训练</text>
        <text class="train-eyebrow__meta">{{ question.category }} · {{ timeEstimate(question.difficulty) }}</text>
      </view>

      <!-- 题目卡片 -->
      <view class="q-card">
        <view class="q-card__tag-row">
          <view class="tag tag--green tag--category">
            <text class="tag__name">{{ question.category }}</text>
            <text class="tag__sub">{{ CATEGORY_SUBTITLE[question.category] }}</text>
          </view>
          <view class="q-card__right">
            <view class="q-card__dots">
              <view
                v-for="i in 5" :key="i"
                class="q-card__dot"
                :class="{ 'q-card__dot--filled': i <= question.difficulty }"
              />
            </view>
            <text v-if="answered" class="done-badge">✓ 已完成</text>
          </view>
        </view>
        <text class="q-card__body" user-select>{{ question.body }}</text>

        <!-- 题目配图 -->
        <image
          v-if="question.image_url"
          class="q-card__image"
          :src="question.image_url"
          mode="widthFix"
        />

        <!-- 社交热度条 -->
        <view v-if="socialStats" class="social-bar">
          <text class="social-bar__text">
            已有 <text class="social-bar__num">{{ socialStats.total }}</text> 人挑战
            · 正确率 <text class="social-bar__num">{{ socialStats.rate }}%</text>
          </text>
        </view>
      </view>

      <!-- 每日哲言 -->
      <view v-if="question.quote" class="daily-quote">
        <text class="daily-quote__text">{{ question.quote }}</text>
        <text class="daily-quote__label">— 今日题眼</text>
      </view>

      <!-- 演算草稿入口 -->
      <view
        class="draft-preview"
        :class="{ 'draft-preview--done': answered }"
        @tap="answered ? goToResult() : goToDraft()"
      >
        <text class="draft-preview__hint">
          {{ answered ? '查看解析 →' : '✏️ 点击开始演算 →' }}
        </text>
        <view
          v-if="answered"
          class="draft-preview__secondary"
          @tap.stop="goToDraft"
        >
          <text>回顾草稿</text>
        </view>
        <view
          v-else
          class="draft-preview__secondary"
          @tap.stop="goToSubmit"
        >
          <text>已有思路？直接填写答案</text>
        </view>
      </view>


      <!-- 底部小提示：连续 + 最近维度 -->
      <view class="stats-hint">
        <view class="stats-hint__row" v-if="streak > 0">
          <text class="stats-hint__key">连续思考</text>
          <text class="stats-hint__val">{{ streak }} 天 🔥</text>
        </view>
        <view class="stats-hint__row" v-if="recentDims.length > 0">
          <text class="stats-hint__key">最近训练</text>
          <view class="stats-hint__dims">
            <text
              v-for="dim in recentDims.slice(0, 4)"
              :key="dim"
              class="stats-hint__dim"
            >{{ dim }}</text>
          </view>
        </view>
      </view>

    </block>

  </view>
</template>

<style lang="scss">

.page {
  min-height: 100vh;
  padding: 0 $space-md $space-xl;
  background: $paper;
}

// ── 标题栏 ─────────────────────────────────────
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-md 0 $space-sm;

  &__title {
    font-size: 44rpx;
    font-weight: 900;
    color: $ink;
    letter-spacing: -1rpx;
  }
}

.streak-pill {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: $amber-light;
  border: 2rpx solid #ffcc80;
  border-radius: $radius-full;
  padding: 8rpx 18rpx;
  transition: opacity $duration-fast;

  &:active { opacity: 0.7; }

  &__fire { font-size: 28rpx; }
  &__num  { font-size: 22rpx; font-weight: 700; color: $amber; }
}

.date-label {
  display: block;
  font-size: 22rpx;
  color: $ink-4;
  margin-bottom: $space-md;
  letter-spacing: 1rpx;
}

// ── 加载 / 空状态 ──────────────────────────────
.loading-wrap, .empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-xl 0;
  gap: $space-sm;

  &__text  { font-size: 28rpx; color: $ink-3; }
  &__emoji { font-size: 80rpx; }
  &__sub   { font-size: 24rpx; color: $ink-4; }
}

// ── 本周打卡条 ─────────────────────────────────
.week-strip {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  background: $white;
  border-radius: $radius-md;
  box-shadow: $shadow-sm;
  margin-bottom: $space-md;

  &__day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
  }

  &__dot {
    width: 28rpx;
    height: 28rpx;
    border-radius: 50%;
    background: $ink-5;

    &--correct { background: $green; }
    &--wrong   { background: $red; }
    &--today   {
      background: transparent;
      border: 3rpx solid $amber;
      box-sizing: border-box;
    }
    &--future  {
      width: 10rpx;
      height: 10rpx;
      margin: 9rpx 9rpx 0;
      background: $ink-5;
    }
  }

  &__label {
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 600;

    &--today { color: $amber; font-weight: 800; }
  }
}

// ── 分类 Tag 副标题扩展 ────────────────────────
.tag--category {
  flex-direction: column;
  align-items: flex-start;
  gap: 2rpx;
  padding: 8rpx 16rpx;

  .tag__name { font-size: 22rpx; font-weight: 700; line-height: 1.3; }
  .tag__sub  { font-size: 18rpx; font-weight: 500; opacity: 0.75; line-height: 1.3; }
}

// ── 题目卡片 ───────────────────────────────────
.q-card {
  background: $white;
  border-radius: $radius-lg;
  padding: 28rpx;
  box-shadow: $shadow-sm;
  margin-bottom: $space-md;

  &__tag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-sm;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__dots {
    display: flex;
    gap: 6rpx;
  }

  &__dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: $ink-5;

    &--filled { background: $ink-3; }
  }

  &__body {
    font-size: 30rpx;
    color: $ink;
    line-height: 1.7;
    display: block;
  }

  &__image {
    width: 100%;
    margin-top: $space-md;
    border-radius: $radius-md;
  }
}

// ── 社交热度条（题目卡片内底部） ───────────────
.social-bar {
  margin-top: $space-md;
  padding-top: $space-sm;
  border-top: 1rpx solid $ink-5;

  &__text {
    font-size: 22rpx;
    color: $ink-4;
  }

  &__num {
    font-weight: 700;
    color: $ink-3;
  }
}

// ── 每日哲言 ───────────────────────────────────
.daily-quote {
  margin-bottom: $space-md;
  padding: 24rpx 28rpx;
  background: $white;
  border-radius: $radius-md;
  border-left: 6rpx solid $amber;
  box-shadow: $shadow-sm;

  &__text {
    display: block;
    font-size: 26rpx;
    color: $ink-2;
    line-height: 1.85;
    font-style: italic;
  }

  &__label {
    display: block;
    margin-top: 12rpx;
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 600;
    text-align: right;
  }
}

// ── 演算草稿入口 ───────────────────────────────
.draft-preview {
  min-height: 200rpx;
  background: $yellow;
  border-radius: $radius-md;
  border: 3rpx dashed $yellow-border;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  margin-bottom: $space-md;
  transition: opacity $duration-fast;

  &:active { opacity: 0.82; }

  &--done {
    background: $white;
    border-style: solid;
    border-color: $green-border;
  }

  &__hint {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--draft-hint);
  }

  &__secondary {
    min-height: 42rpx;
    padding: 0 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $ink-3;
    font-size: 24rpx;
    font-weight: 600;
    transition: opacity $duration-fast;

    &:active { opacity: 0.65; }
  }
}

// ── 已完成徽章 ──────────────────────────────────
.done-badge {
  font-size: 20rpx;
  font-weight: 700;
  color: $green;
  background: $green-light;
  padding: 4rpx 14rpx;
  border-radius: $radius-full;
  border: 1rpx solid $green-border;
}

// ── 已完成解析按钮（绿色） ──────────────────────
.btn-primary--done {
  background: $green;
}

// ── 今日大脑训练眉毛行 ──────────────────────────
.train-eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-sm;

  &__label {
    font-size: 20rpx;
    font-weight: 800;
    color: $ink-3;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  &__meta {
    font-size: 22rpx;
    font-weight: 600;
    color: $ink-4;
  }
}

// ── 底部统计小提示 ────────────────────────────────
.stats-hint {
  margin-top: $space-md;
  padding: 20rpx 24rpx;
  background: $white;
  border-radius: $radius-md;
  box-shadow: $shadow-sm;
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  &__row {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__key {
    font-size: 22rpx;
    color: $ink-4;
    font-weight: 600;
    min-width: 96rpx;
    flex-shrink: 0;
  }

  &__val {
    font-size: 24rpx;
    font-weight: 700;
    color: $amber;
  }

  &__dims {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
  }

  &__dim {
    font-size: 20rpx;
    font-weight: 600;
    color: $ink-3;
    background: $paper;
    border: 1rpx solid $ink-5;
    border-radius: $radius-full;
    padding: 4rpx 16rpx;
  }
}

// ── 深色模式：难度点阵对比度增强 ──────────────
@media (prefers-color-scheme: dark) {
  .q-card__dot {
    background: #444;
    &--filled { background: #ccc; }
  }
}

// ── 补签 Banner ──────────────────────────────
.rescue-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $amber-light;
  border: 1rpx solid var(--milestone-border);
  border-radius: $radius-md;
  padding: 20rpx 24rpx;
  margin-bottom: $space-md;
  transition: opacity $duration-fast;

  &:active { opacity: 0.8; }

  &__left {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex: 1;
  }

  &__icon { font-size: 36rpx; flex-shrink: 0; }

  &__title {
    display: block;
    font-size: 26rpx;
    font-weight: 700;
    color: $amber;
  }

  &__sub {
    display: block;
    font-size: 20rpx;
    color: $ink-3;
    margin-top: 4rpx;
    line-height: 1.4;
  }

  &__arrow {
    font-size: 22rpx;
    font-weight: 700;
    color: $amber;
    flex-shrink: 0;
    margin-left: $space-sm;
  }
}

// ── 加载失败内联错误 ──────────────────────────
.error-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-xl 0;
  gap: $space-sm;

  &__emoji { font-size: 72rpx; }
  &__text  { font-size: 28rpx; color: $ink-3; font-weight: 600; }
  &__sub   { font-size: 24rpx; color: $ink-4; }

  &__btn {
    margin-top: $space-sm;
    height: 72rpx;
    padding: 0 48rpx;
    background: $ink;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    font-weight: 700;
    color: $white;

    &:active { opacity: 0.8; }
  }
}
</style>
