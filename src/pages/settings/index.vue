<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { useDraftStore } from '@/store/draft'
import { requestDailySubscribe, showSubscribeStatusToast } from '@/utils/subscribe'
import type { Difficulty } from '@/types'

const userStore  = useUserStore()
const themeStore = useThemeStore()
const draftStore = useDraftStore()

onShow(() => {
  themeStore.setCurrentTab(2)
})
const profile    = computed(() => userStore.profile)


// ── 提醒时间 ─────────────────────────────────────────
const remindTime = ref(profile.value?.remind_time ?? '08:00')
const REMIND_HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
)
const remindIndex = ref(REMIND_HOURS.indexOf(remindTime.value))

function onRemindChange(e: any) {
  remindIndex.value = e.detail.value
  remindTime.value  = REMIND_HOURS[e.detail.value]
  userStore.updatePrefs({ remind_time: remindTime.value })
}

// ── 订阅推送 ─────────────────────────────────────────
async function requestSubscribe() {
  const status = await requestDailySubscribe()
  if (status === 'accept') {
    await userStore.updatePrefs({ subscribed: true })
  }
  showSubscribeStatusToast(status, '订阅成功 🔔')
}

// ── Streak 补签 ──────────────────────────────────────
const pendingRescueDate = computed(() => userStore.pendingRescueDate)
const canRescue = computed(() => !!pendingRescueDate.value)

function goRescue() {
  if (!canRescue.value) return
  uni.navigateTo({ url: `/pages/draft/index?rescue_date=${pendingRescueDate.value}` })
}

// ── 清除草稿缓存 ──────────────────────────────────────
function clearDrafts() {
  uni.showModal({
    title: '清除草稿缓存',
    content: '将删除所有本地演算草稿，无法恢复。',
    confirmText: '清除',
    confirmColor: '#c62828',
    success: (res) => {
      if (!res.confirm) return
      draftStore.clearAll()
      uni.showToast({ title: '已清除', icon: 'success' })
    },
  })
}
</script>

<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">
    <view class="content">

      <text class="page-title">设置</text>

      <!-- ── 每日提醒 ── -->
      <view class="section-card">
        <text class="section-card__title">🔔 每日提醒时间</text>
        <view class="section-card__row">
          <text class="section-card__label">提醒时间</text>
          <picker
            mode="selector"
            :range="REMIND_HOURS"
            :value="remindIndex"
            @change="onRemindChange"
          >
            <view class="picker-value">
              <text>{{ remindTime }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
        <view class="section-card__row section-card__row--btn">
          <view class="outline-btn" @tap="requestSubscribe">
            <text>订阅每日推送通知</text>
          </view>
        </view>
      </view>

      <!-- ── Streak 管理 ── -->
      <view class="section-card">
        <text class="section-card__title">🔥 连续打卡</text>
        <view class="section-card__row">
          <text class="section-card__label">当前连续</text>
          <text class="section-card__value">{{ profile?.streak ?? 0 }} 天</text>
        </view>
        <view class="section-card__row">
          <text class="section-card__label">补签机会</text>
          <text class="section-card__value">{{ profile?.streak_rescue ?? 0 }} 次（每月重置）</text>
        </view>
        <view class="section-card__row section-card__row--btn">
          <view
            class="outline-btn"
            :class="{ 'outline-btn--disabled': !canRescue }"
            @tap="goRescue"
          >
            <text>{{ canRescue ? `补签 ${pendingRescueDate}` : '暂无可补签的日期' }}</text>
          </view>
        </view>
      </view>

      <!-- ── 关于 ── -->
      <view class="section-card section-card--about">
        <text class="section-card__title">关于</text>

        <view class="section-card__row">
          <text class="section-card__label">版本</text>
          <text class="section-card__value">1.0.0</text>
        </view>

        <view class="section-card__row">
          <text class="section-card__label">开发者</text>
          <text class="section-card__value">独立开发 · 用爱维护</text>
        </view>

        <view class="section-card__row section-card__row--btn">
          <view class="outline-btn" @tap="clearDrafts">
            <text>清除草稿缓存</text>
          </view>
        </view>

        <view class="about-footer">
          <text class="about-footer__quote">人最重要的能力是思考。但大多数人的大脑，正在悄悄退化</text>
          <text class="about-footer__copy">© 2026 别让你的脑生锈</text>
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

// ── 区块卡片 ────────────────────────────────
.section-card {
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

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;
    border-bottom: 1rpx solid $ink-5;

    &:last-child { border-bottom: none; }
    &--btn { border-bottom: none; padding-top: $space-sm; }
  }

  &__label {
    font-size: 28rpx;
    color: $ink-2;
  }

  &__value {
    font-size: 26rpx;
    color: $ink-3;
    font-weight: 600;
    max-width: 55%;
    text-align: right;
  }

  &--about .section-card__title { color: $ink-3; }
}

.about-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: $space-md 0 $space-sm;

  &__quote {
    font-size: 22rpx;
    font-weight: 400;
    color: $ink-3;
    line-height: 1.75;
    text-align: center;
    letter-spacing: 0.5rpx;
  }

  &__copy {
    font-size: 22rpx;
    color: $ink-4;
  }
}

// ── Picker ──────────────────────────────────
.picker-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: $ink-2;
  font-weight: 700;
}

.picker-arrow {
  font-size: 32rpx;
  color: $ink-4;
}

// ── 线框按钮 ────────────────────────────────
.outline-btn {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid $ink-5;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: $ink-2;
  font-weight: 600;
  transition: all $duration-fast;

  &:active { background: $paper; }

  &--disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}
</style>
