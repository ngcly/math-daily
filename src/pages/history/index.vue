<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import Calendar from '@/components/Calendar/index.vue'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { getUserHistory, getUserStats } from '@/api/cloud'
import type { UserRecord, UserStats } from '@/types'
import { formatDuration } from '@/utils/date'

const userStore  = useUserStore()
const themeStore = useThemeStore()
const streak     = computed(() => userStore.streak)

// 当前浏览年月
const now       = new Date()
const viewYear  = ref(now.getFullYear())
const viewMonth = ref(now.getMonth() + 1)

// 当月答题记录
const records     = ref<UserRecord[]>([])
const loading     = ref(false)
const loadFailed  = ref(false)
// 记录最近一次加载对应的年月，避免 onShow 每次重复请求
const loadedYear  = ref(0)
const loadedMonth = ref(0)

// 全局累计统计
const globalStats        = ref<UserStats | null>(null)
const globalStatsLoading = ref(false)
let   globalStatsLoaded  = false

// 汇总统计
const totalDone    = computed(() => records.value.length)
const totalCorrect = computed(() => records.value.filter(r => r.is_correct).length)
const correctRate  = computed(() =>
  totalDone.value === 0 ? 0 : Math.round((totalCorrect.value / totalDone.value) * 100)
)

onShow(() => {
  themeStore.setCurrentTab(1)
  const n = new Date()
  const isCurrentMonth = viewYear.value === n.getFullYear() && viewMonth.value === n.getMonth() + 1
  // 当前月始终刷新（用户可能刚提交了答案）；历史月只在首次加载或切换时请求
  if (isCurrentMonth || loadedYear.value !== viewYear.value || loadedMonth.value !== viewMonth.value) {
    loadRecords()
  }
  if (!globalStatsLoaded) {
    globalStatsLoaded = true
    loadGlobalStats()
  }
})

async function loadRecords() {
  loading.value  = true
  loadFailed.value = false
  try {
    records.value = await getUserHistory({ year: viewYear.value, month: viewMonth.value })
    loadedYear.value  = viewYear.value
    loadedMonth.value = viewMonth.value
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

async function loadGlobalStats() {
  globalStatsLoading.value = true
  try {
    globalStats.value = await getUserStats()
  } catch {
    // 全局统计加载失败不阻塞主流程
  } finally {
    globalStatsLoading.value = false
  }
}

// 月份切换
function prevMonth() {
  if (viewMonth.value === 1) { viewMonth.value = 12; viewYear.value-- }
  else viewMonth.value--
  loadRecords()
}

function nextMonth() {
  const now = new Date()
  // 不能切到未来的月
  if (viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1) return
  if (viewMonth.value === 12) { viewMonth.value = 1; viewYear.value++ }
  else viewMonth.value++
  loadRecords()
}

function goReview(date: string) {
  uni.navigateTo({ url: `/pages/review/index?date=${date}` })
}
</script>

<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">
    <view class="content">

      <!-- 页面标题 -->
      <text class="page-title">我的记录</text>

      <!-- 三栏统计：本月 -->
      <view class="stat-row">
        <view class="stat-card">
          <text class="stat-card__num">🔥 {{ streak }}</text>
          <text class="stat-card__label">连续天数</text>
        </view>
        <view class="stat-card">
          <text class="stat-card__num">{{ totalDone }}</text>
          <text class="stat-card__label">本月完成</text>
        </view>
        <view class="stat-card">
          <text class="stat-card__num">{{ correctRate }}%</text>
          <text class="stat-card__label">本月正确率</text>
        </view>
      </view>

      <!-- 全局累计统计 -->
      <view class="global-stats">
        <text class="global-stats__title">📊 累计数据</text>

        <view v-if="globalStatsLoading" class="global-stats__loading">
          <text>加载中...</text>
        </view>

        <view v-else-if="globalStats">
          <!-- 总数一行 -->
          <view class="global-stats__summary">
            <text class="global-stats__total">共完成 <text class="global-stats__num">{{ globalStats.total }}</text> 题</text>
            <text class="global-stats__rate">全局正确率 <text class="global-stats__num">{{ globalStats.total === 0 ? 0 : Math.round(globalStats.correct / globalStats.total * 100) }}%</text></text>
          </view>

          <!-- 分类明细 -->
          <view
            v-for="cat in globalStats.by_category"
            :key="cat.category"
            class="cat-row"
          >
            <text class="cat-row__name">{{ cat.category }}</text>
            <view class="cat-row__bar-wrap">
              <view
                class="cat-row__bar"
                :style="{ width: `${Math.round(cat.correct / cat.total * 100)}%` }"
              />
            </view>
            <text class="cat-row__pct">{{ Math.round(cat.correct / cat.total * 100) }}%</text>
            <text class="cat-row__count">{{ cat.correct }}/{{ cat.total }}</text>
          </view>
        </view>
      </view>

      <!-- 日历 -->
      <Calendar
        :year="viewYear"
        :month="viewMonth"
        :records="records"
        @prevMonth="prevMonth"
        @nextMonth="nextMonth"
        @dayClick="goReview"
        class="calendar-wrap"
      />

      <!-- 历史列表 -->
      <view class="history-list">
        <text class="history-list__title">本月记录</text>

        <view v-if="loading" class="history-list__loading">
          <text>加载中...</text>
        </view>

        <view v-else-if="loadFailed" class="history-list__error">
          <text class="history-list__error-text">加载失败</text>
          <view class="history-list__retry" @tap="loadRecords">
            <text>重试</text>
          </view>
        </view>

        <view v-else-if="records.length === 0" class="history-list__empty">
          <text class="history-list__empty-emoji">📭</text>
          <text class="history-list__empty-text">本月还没有记录</text>
        </view>

        <view
          v-for="record in records"
          :key="record._id"
          class="history-item"
          @tap="goReview(record.date)"
        >
          <!-- 日期 -->
          <view class="history-item__date">
            <text class="history-item__month">{{ record.date.slice(5, 7) }}/{{ record.date.slice(8, 10) }}</text>
          </view>

          <!-- 内容 -->
          <view class="history-item__info">
            <text class="history-item__title">{{ record.title }}</text>
            <view class="history-item__meta">
              <text class="tag tag--ink">{{ record.category }}</text>
              <text class="history-item__time">{{ formatDuration(record.time_spent) }}</text>
            </view>
          </view>

          <!-- 结果图标 + 回顾箭头 -->
          <view class="history-item__right">
            <text class="history-item__result">{{ record.is_correct ? '✅' : '❌' }}</text>
            <text class="history-item__arrow">›</text>
          </view>
        </view>

      </view>

    </view>
  </scroll-view>
</template>

<style lang="scss">

.page {
  min-height: 100vh;
  background: $paper;
}

.content {
  padding: $space-md $space-md $space-xl;
}

.page-title {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  color: $ink;
  letter-spacing: -1rpx;
  margin-bottom: $space-md;
}

// ── 三栏统计 ────────────────────────────────
.stat-row {
  display: flex;
  gap: $space-sm;
  margin-bottom: $space-md;
}

.stat-card {
  flex: 1;
  background: $white;
  border-radius: $radius-md;
  padding: $space-md $space-sm;
  text-align: center;
  box-shadow: $shadow-sm;
  display: flex;
  flex-direction: column;
  gap: 4rpx;

  &__num {
    font-size: 36rpx;
    font-weight: 900;
    color: $ink;
    letter-spacing: -1rpx;
  }

  &__label {
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 600;
  }
}

// ── 日历 ────────────────────────────────────
.calendar-wrap {
  margin-bottom: $space-md;
}

// ── 历史列表 ────────────────────────────────
.history-list {
  &__title {
    display: block;
    font-size: 26rpx;
    font-weight: 800;
    color: $ink-3;
    letter-spacing: 1px;
    margin-bottom: $space-sm;
  }

  &__loading,
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $space-xl 0;
    gap: $space-sm;
    color: $ink-4;
    font-size: 28rpx;
  }

  &__empty-emoji { font-size: 64rpx; }
  &__empty-text  { font-size: 26rpx; color: $ink-4; }
}

.history-item {
  display: flex;
  align-items: center;
  gap: $space-md;
  background: $white;
  border-radius: $radius-md;
  padding: 20rpx $space-md;
  margin-bottom: $space-sm;
  box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.05);
  transition: opacity $duration-fast;

  &:active { opacity: 0.75; }

  &__date {
    text-align: center;
    min-width: 56rpx;
  }

  &__month {
    font-size: 22rpx;
    font-weight: 700;
    color: $ink-3;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: $ink;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__time {
    font-size: 22rpx;
    color: $ink-4;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8rpx;
    flex-shrink: 0;
  }

  &__result { font-size: 32rpx; }

  &__arrow {
    font-size: 32rpx;
    color: $ink-4;
    font-weight: 300;
  }

  &__error {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $space-xl 0;
    gap: $space-md;
  }

  &__error-text { font-size: 26rpx; color: $ink-4; }

  &__retry {
    height: 56rpx;
    padding: 0 32rpx;
    background: $ink;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    font-size: 24rpx;
    font-weight: 700;
    color: $white;

    &:active { opacity: 0.8; }
  }
}

// ── 全局累计统计 ────────────────────────────
.global-stats {
  background: $white;
  border-radius: $radius-lg;
  padding: $space-md;
  margin-bottom: $space-md;
  box-shadow: $shadow-sm;

  &__title {
    display: block;
    font-size: 26rpx;
    font-weight: 800;
    color: $ink;
    margin-bottom: $space-md;
  }

  &__loading {
    padding: $space-md 0;
    text-align: center;
    font-size: 24rpx;
    color: $ink-4;
  }

  &__summary {
    display: flex;
    justify-content: space-between;
    margin-bottom: $space-md;
    padding-bottom: $space-md;
    border-bottom: 1rpx solid $ink-5;
  }

  &__total, &__rate {
    font-size: 24rpx;
    color: $ink-3;
  }

  &__num {
    font-weight: 800;
    color: $ink;
    font-size: 26rpx;
  }
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;

  &:last-child { margin-bottom: 0; }

  &__name {
    font-size: 22rpx;
    color: $ink-2;
    font-weight: 600;
    min-width: 120rpx;
    flex-shrink: 0;
  }

  &__bar-wrap {
    flex: 1;
    height: 10rpx;
    background: $ink-5;
    border-radius: $radius-full;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    background: $green;
    border-radius: $radius-full;
    min-width: 4rpx;
    transition: width 0.4s ease-out;
  }

  &__pct {
    font-size: 22rpx;
    font-weight: 700;
    color: $ink-2;
    min-width: 60rpx;
    text-align: right;
    flex-shrink: 0;
  }

  &__count {
    font-size: 20rpx;
    color: $ink-4;
    min-width: 72rpx;
    text-align: right;
    flex-shrink: 0;
  }
}
</style>
