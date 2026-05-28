<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import Calendar from '@/components/Calendar/index.vue'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { getUserHistory } from '@/api/cloud'
import type { UserRecord } from '@/types'
import { formatDuration } from '@/utils/date'

const userStore  = useUserStore()
const themeStore = useThemeStore()
const streak     = computed(() => userStore.streak)

// 当前浏览年月
const now       = new Date()
const viewYear  = ref(now.getFullYear())
const viewMonth = ref(now.getMonth() + 1)

// 当月答题记录
const records  = ref<UserRecord[]>([])
const loading  = ref(false)

// 汇总统计
const totalDone    = computed(() => records.value.length)
const totalCorrect = computed(() => records.value.filter(r => r.is_correct).length)
const correctRate  = computed(() =>
  totalDone.value === 0 ? 0 : Math.round((totalCorrect.value / totalDone.value) * 100)
)

onMounted(() => loadRecords())
onShow(() => { themeStore.setCurrentTab(1) })

async function loadRecords() {
  loading.value = true
  try {
    records.value = await getUserHistory({ year: viewYear.value, month: viewMonth.value })
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
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

// 点击某天 → 跳到该天的解析（回看）
function onDayClick(dateStr: string) {
  const record = records.value.find(r => r.date === dateStr)
  if (!record) return
  uni.navigateTo({ url: `/pages/result/index?replay=1&date=${dateStr}` })
}
</script>

<template>
  <scroll-view class="page" :class="themeStore.themeClass" scroll-y :show-scrollbar="false">
    <view class="content">

      <!-- 页面标题 -->
      <text class="page-title">我的记录</text>

      <!-- 三栏统计 -->
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
          <text class="stat-card__label">正确率</text>
        </view>
      </view>

      <!-- 日历 -->
      <Calendar
        :year="viewYear"
        :month="viewMonth"
        :records="records"
        @prevMonth="prevMonth"
        @nextMonth="nextMonth"
        @dayClick="onDayClick"
        class="calendar-wrap"
      />

      <!-- 历史列表 -->
      <view class="history-list">
        <text class="history-list__title">本月记录</text>

        <view v-if="loading" class="history-list__loading">
          <text>加载中...</text>
        </view>

        <view v-else-if="records.length === 0" class="history-list__empty">
          <text class="history-list__empty-emoji">📭</text>
          <text class="history-list__empty-text">本月还没有记录</text>
        </view>

        <view
          v-for="record in records"
          :key="record._id"
          class="history-item"
          @tap="onDayClick(record.date)"
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

          <!-- 结果图标 -->
          <text class="history-item__result">
            {{ record.is_correct ? '✅' : '❌' }}
          </text>
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

  &__result { font-size: 32rpx; flex-shrink: 0; }
}
</style>
