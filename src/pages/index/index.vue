<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useQuestionStore } from '@/store/question'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { today, formatDisplayDate } from '@/utils/date'
import { syncNativeTabBarTheme } from '@/utils/theme'
import type { Category } from '@/types'

const questionStore = useQuestionStore()
const userStore     = useUserStore()
const themeStore    = useThemeStore()

const question  = computed(() => questionStore.todayQuestion)
const loading   = computed(() => questionStore.loading)
const answered  = computed(() => questionStore.isAnswered)
const streak    = computed(() => userStore.streak)
const dateLabel = computed(() => formatDisplayDate(today()))

// ── 难度 → 时间预估 ────────────────────────────────────
function timeEstimate(difficulty: number): string {
  if (difficulty <= 2) return '约5分钟'
  if (difficulty <= 3) return '约10分钟'
  return '约15分钟'
}

// ── 最近训练维度 ───────────────────────────────────────
const recentDims = ref<Category[]>([])

function loadRecentDims() {
  try {
    const raw: { date: string; category: Category }[] =
      uni.getStorageSync('recent_trained_dims') || []
    recentDims.value = [...new Set(raw.map(d => d.category))]
  } catch {
    recentDims.value = []
  }
}

// 每次切回首页刷新（提交后数据即时可见）
onShow(() => {
  themeStore.setCurrentTab(0)
  syncNativeTabBarTheme(themeStore.isDark)
  loadRecentDims()
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

function goToSubmit() {
  if (!question.value) return
  uni.navigateTo({ url: `/pages/draft/index?id=${question.value._id}&submit=1` })
}
</script>

<template>
  <view class="page" :class="themeStore.themeClass">

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

    <!-- 加载中 -->
    <view class="loading-wrap" v-if="loading">
      <text class="loading-wrap__text">题目加载中...</text>
    </view>

    <!-- 无题目 -->
    <view class="empty-wrap" v-else-if="!question">
      <text class="empty-wrap__emoji">📭</text>
      <text class="empty-wrap__text">今日暂无题目</text>
      <text class="empty-wrap__sub">明天再来看看吧</text>
    </view>

    <!-- 有题目 -->
    <block v-else>

      <!-- 今日大脑训练提示 -->
      <view class="train-eyebrow">
        <text class="train-eyebrow__label">今日大脑训练</text>
        <text class="train-eyebrow__meta">{{ question.category }} · {{ timeEstimate(question.difficulty) }}</text>
      </view>

      <!-- 题目卡片 -->
      <view class="q-card">
        <view class="q-card__tag-row">
          <text class="tag tag--green">{{ question.category }}</text>
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
</style>
