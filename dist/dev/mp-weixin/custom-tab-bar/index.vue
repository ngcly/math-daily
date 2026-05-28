<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/store/theme'

const themeStore = useThemeStore()

const TABS = [
  {
    text: '今日题',
    icon: '/static/icons/home.png',
    activeIcon: '/static/icons/home-active.png',
    activeIconDark: '/static/icons/home-active-dark.png',
    path: '/pages/index/index',
  },
  {
    text: '历史',
    icon: '/static/icons/history.png',
    activeIcon: '/static/icons/history-active.png',
    activeIconDark: '/static/icons/history-active-dark.png',
    path: '/pages/history/index',
  },
  {
    text: '设置',
    icon: '/static/icons/settings.png',
    activeIcon: '/static/icons/settings-active.png',
    activeIconDark: '/static/icons/settings-active-dark.png',
    path: '/pages/settings/index',
  },
]

const selected = computed(() => themeStore.currentTabIndex)

function switchTab(path: string) {
  uni.switchTab({ url: path })
}
</script>

<template>
  <view class="tab-bar" :class="themeStore.themeClass">
    <view
      v-for="(tab, i) in TABS"
      :key="tab.path"
      class="tab-bar__item"
      @tap="switchTab(tab.path)"
    >
      <!-- 非激活：单图标，深浅色均兼容 -->
      <image
        v-if="selected !== i"
        class="tab-bar__icon"
        :src="tab.icon"
        mode="aspectFit"
      />
      <!-- 激活：同时渲染深/浅两版，用 CSS 按模式显示其中一个，不依赖 JS 主题检测 -->
      <view v-else class="tab-bar__icon-box">
        <image class="tab-bar__icon tab-bar__icon--lt" :src="tab.activeIcon"     mode="aspectFit" />
        <image class="tab-bar__icon tab-bar__icon--dk" :src="tab.activeIconDark" mode="aspectFit" />
      </view>
      <text class="tab-bar__label" :class="{ 'tab-bar__label--active': selected === i }">
        {{ tab.text }}
      </text>
    </view>
  </view>
</template>

<style lang="scss">

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: $white;
  border-top: 1rpx solid $ink-5;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12rpx 0 10rpx;
    gap: 4rpx;
    &:active { opacity: 0.6; }
  }

  &__icon {
    width: 48rpx;
    height: 48rpx;
  }

  &__icon-box {
    width: 48rpx;
    height: 48rpx;
  }

  &__label {
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 500;
    &--active { color: $ink; font-weight: 700; }
  }
}

// ── 激活图标深/浅版切换（不依赖 JS isDark，全部 CSS 完成）────
// 默认：显示浅色版，隐藏深色版
.tab-bar__icon--dk { display: none; }

// 手动深色模式：themeClass='theme-dark' → .theme-dark 加在 .tab-bar 上
.theme-dark .tab-bar__icon--lt { display: none; }
.theme-dark .tab-bar__icon--dk { display: block; }

// 系统深色模式（auto 偏好时 themeClass=''，.tab-bar 无显式类名）
// 背景/文字/图标全部通过 @media 处理；
// :not(.theme-light) 确保用户手动选浅色时不被此规则覆盖
@media (prefers-color-scheme: dark) {
  .tab-bar:not(.theme-light) {
    background: #1a1a1a;
    border-top-color: #2e2e2e;
  }
  .tab-bar:not(.theme-light) .tab-bar__label         { color: #606060; }
  .tab-bar:not(.theme-light) .tab-bar__label--active  { color: #f0f0f0; }
  .tab-bar:not(.theme-light) .tab-bar__icon--lt { display: none; }
  .tab-bar:not(.theme-light) .tab-bar__icon--dk { display: block; }
}
</style>
