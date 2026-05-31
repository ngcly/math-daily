<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/store/theme'

const themeStore = useThemeStore()

// uni.onThemeChange 在 custom-tab-bar 里比 Pinia 响应式更可靠
let themeChangeOff: (() => void) | null = null
onMounted(() => {
  const handler = (res: { theme: string }) => themeStore.setSystemTheme(res.theme === 'dark')
  uni.onThemeChange?.(handler)
  themeChangeOff = () => uni.offThemeChange?.(handler)
})
onUnmounted(() => themeChangeOff?.())

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
const isDark = computed(() => themeStore.isDark)

function switchTab(path: string) {
  uni.switchTab({ url: path })
}
</script>

<template>
  <view class="tab-bar" :class="{ 'tab-bar--dark': isDark }">
    <view
      v-for="(tab, i) in TABS"
      :key="tab.path"
      class="tab-bar__item"
      @tap="switchTab(tab.path)"
    >
      <image
        v-if="selected !== i"
        class="tab-bar__icon"
        :class="{ 'tab-bar__icon--inactive-dark': isDark }"
        :src="tab.icon"
        mode="aspectFit"
      />
      <image
        v-else
        class="tab-bar__icon"
        :src="isDark ? tab.activeIconDark : tab.activeIcon"
        mode="aspectFit"
      />
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
  background: #ffffff;
  border-top: 1rpx solid #e4e4e4;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;

  &--dark {
    background: #1a1a1a;
    border-top-color: #2e2e2e;
  }

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
    &--inactive-dark { filter: brightness(0) invert(0.4); }
  }

  &__label {
    font-size: 20rpx;
    color: #aaaaaa;
    font-weight: 500;
    &--active { color: #1a1a1a; font-weight: 700; }
  }
}

.tab-bar--dark .tab-bar__label         { color: #606060; }
.tab-bar--dark .tab-bar__label--active  { color: #f0f0f0; }
</style>
