<script setup lang="ts">
/**
 * SkeletonCard 骨架屏加载卡片
 *
 * 通过 CSS 脉冲动画模拟页面内容占位，提升感知加载速度。
 * 用法：在数据加载完成前替代真实卡片渲染。
 */
</script>

<template>
  <view class="skeleton">
    <!-- 本周打卡条骨架 -->
    <view class="skeleton__week-strip">
      <view v-for="i in 7" :key="i" class="skeleton__week-item">
        <view class="skeleton__dot" />
        <view class="skeleton__week-label" />
      </view>
    </view>

    <!-- 眉毛行 -->
    <view class="skeleton__eyebrow">
      <view class="skeleton__line skeleton__line--short" />
      <view class="skeleton__line skeleton__line--xs" />
    </view>

    <!-- 题目卡片骨架 -->
    <view class="skeleton__card">
      <view class="skeleton__row">
        <view class="skeleton__tag" />
        <view class="skeleton__dots-row">
          <view v-for="i in 5" :key="i" class="skeleton__dot-sm" />
        </view>
      </view>

      <view class="skeleton__body">
        <view class="skeleton__line" />
        <view class="skeleton__line" />
        <view class="skeleton__line skeleton__line--medium" />
        <view class="skeleton__line skeleton__line--long" />
      </view>

      <view class="skeleton__social-bar">
        <view class="skeleton__line skeleton__line--xs" />
      </view>
    </view>

    <!-- 哲言骨架 -->
    <view class="skeleton__card skeleton__card--narrow">
      <view class="skeleton__line" />
      <view class="skeleton__line skeleton__line--short" />
    </view>

    <!-- 草稿区域骨架 -->
    <view class="skeleton__draft-area">
      <view class="skeleton__line skeleton__line--medium" />
    </view>
  </view>
</template>

<style lang="scss">
.skeleton {
  width: 100%;

  // ── 脉冲动画 ─────────────────────────────
  @keyframes shimmer {
    0%   { opacity: 0.6; }
    50%  { opacity: 0.9; }
    100% { opacity: 0.6; }
  }

  &__week-strip {
    display: flex;
    justify-content: space-between;
    padding: 20rpx 28rpx;
    background: $white;
    border-radius: $radius-md;
    box-shadow: $shadow-sm;
    margin-bottom: $space-md;
  }

  &__week-item {
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
    animation: shimmer 1.6s ease-in-out infinite;
  }

  &__week-label {
    width: 16rpx;
    height: 16rpx;
    border-radius: 2rpx;
    background: $ink-5;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  &__eyebrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-sm;
  }

  &__card {
    background: $white;
    border-radius: $radius-lg;
    padding: 28rpx;
    box-shadow: $shadow-sm;
    margin-bottom: $space-md;

    &--narrow {
      padding: 24rpx 28rpx;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-sm;
  }

  &__tag {
    width: 140rpx;
    height: 32rpx;
    border-radius: $radius-full;
    background: $ink-5;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  &__dots-row {
    display: flex;
    gap: 6rpx;
  }

  &__dot-sm {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: $ink-5;
    animation: shimmer 1.6s ease-in-out infinite;

    &:nth-child(3) { animation-delay: 0.1s; }
    &:nth-child(4) { animation-delay: 0.2s; }
    &:nth-child(5) { animation-delay: 0.3s; }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 14rpx;
    margin-bottom: $space-md;
  }

  &__line {
    height: 24rpx;
    border-radius: 6rpx;
    background: $ink-5;
    animation: shimmer 1.6s ease-in-out infinite;

    &--short  { width: 45%; }
    &--medium { width: 65%; }
    &--long   { width: 85%; }
    &--xs     { width: 30%; height: 18rpx; }
  }

  &__social-bar {
    margin-top: $space-md;
    padding-top: $space-sm;
    border-top: 1rpx solid $ink-5;
  }

  &__draft-area {
    min-height: 200rpx;
    border-radius: $radius-md;
    border: 3rpx dashed $ink-5;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $space-md;
  }
}
</style>
