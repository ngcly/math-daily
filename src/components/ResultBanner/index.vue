<script setup lang="ts">
import { computed } from 'vue'
import type { SubmitResult } from '@/types'
import { formatDuration } from '@/utils/date'

const props = defineProps<{
  result: SubmitResult
  timeSpent: number
}>()

const correctRate = computed(() => {
  const s = props.result.stats
  if (!s || s.total === 0) return 0
  return Math.round((s.correct / s.total) * 100)
})
</script>

<template>
  <view class="result-banner">

    <!-- 答对 / 答错 主 Banner -->
    <view
      class="banner"
      :class="result.is_correct ? 'banner--correct' : 'banner--wrong'"
    >
      <text class="banner__emoji">{{ result.is_correct ? '🎉' : '🤔' }}</text>
      <view class="banner__info">
        <text class="banner__main">
          {{ result.is_correct ? '回答正确！' : '答错了，看看解析' }}
        </text>
        <text class="banner__sub">
          用时 {{ formatDuration(timeSpent) }}
        </text>
      </view>
    </view>

    <!-- 三栏数据 -->
    <view class="stats">
      <view class="stats__item">
        <text
          class="stats__num"
          :class="correctRate < 40 ? 'stats__num--red' : ''"
        >{{ correctRate }}%</text>
        <text class="stats__label">全球答对率</text>
      </view>
      <view class="stats__divider" />
      <view class="stats__item">
        <text class="stats__num">{{ formatDuration(timeSpent) }}</text>
        <text class="stats__label">你的用时</text>
      </view>
      <view class="stats__divider" />
      <view class="stats__item">
        <text class="stats__num stats__num--amber">
          {{ result.stats.total }}
        </text>
        <text class="stats__label">总作答人数</text>
      </view>
    </view>

    <!-- 答错时展示正确答案 -->
    <view v-if="!result.is_correct" class="correct-ans">
      <text class="correct-ans__label">正确答案</text>
      <text class="correct-ans__value">{{ result.correct_answer }}</text>
    </view>

  </view>
</template>

<style lang="scss">

.result-banner {
  margin-bottom: $space-md;
}

// ── 主 Banner ───────────────────────────────
.banner {
  display: flex;
  align-items: center;
  gap: $space-md;
  border-radius: $radius-lg;
  padding: 24rpx 28rpx;
  margin-bottom: $space-sm;
  border: 1rpx solid transparent;

  &--correct {
    background: linear-gradient(135deg, var(--banner-correct-from), var(--banner-correct-to));
    border-color: $green-border;
  }

  &--wrong {
    background: linear-gradient(135deg, var(--banner-wrong-from), var(--banner-wrong-to));
    border-color: var(--banner-wrong-border);
  }

  &__emoji { font-size: 56rpx; flex-shrink: 0; }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__main {
    font-size: 32rpx;
    font-weight: 800;
    color: $ink;
  }

  &__sub {
    font-size: 22rpx;
    color: $ink-3;
  }
}

// ── 三栏统计 ────────────────────────────────
.stats {
  display: flex;
  background: $white;
  border-radius: $radius-md;
  border: 1rpx solid $ink-5;
  overflow: hidden;
  margin-bottom: $space-sm;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20rpx 0;
    gap: 4rpx;
  }

  &__divider {
    width: 1rpx;
    background: $ink-5;
    margin: 16rpx 0;
  }

  &__num {
    font-size: 36rpx;
    font-weight: 900;
    color: $ink;
    letter-spacing: -1rpx;

    &--red   { color: $red; }
    &--amber { color: $amber; }
  }

  &__label {
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 500;
  }
}

// ── 正确答案（答错时显示）──────────────────
.correct-ans {
  display: flex;
  align-items: center;
  gap: $space-sm;
  background: $green-light;
  border-radius: $radius-md;
  padding: 18rpx 24rpx;
  border: 1rpx solid $green-border;

  &__label {
    font-size: 24rpx;
    color: $green;
    font-weight: 700;
  }

  &__value {
    font-size: 28rpx;
    font-weight: 900;
    color: $green;
  }
}
</style>
