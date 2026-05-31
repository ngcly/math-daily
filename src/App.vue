<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useQuestionStore } from '@/store/question'
import { useThemeStore } from '@/store/theme'
import { getSystemIsDark } from '@/utils/theme'
import { logEvent } from '@/api/cloud'
import { today } from '@/utils/date'

const userStore     = useUserStore()
const questionStore = useQuestionStore()
const themeStore    = useThemeStore()

onLaunch((options?: { scene?: number; query?: Record<string, string> }) => {
  wx.cloud.init({
    env: 'cloud1-d4g6o6y529c3db4b2',
    traceUser: true,
  })

  themeStore.setSystemTheme(getSystemIsDark())

  userStore.init()
  questionStore.loadToday()

  uni.onThemeChange?.((res: { theme: string }) => {
    themeStore.setSystemTheme(res.theme === 'dark')
  })

  // DAU 打点：每用户每天只记录一次，避免重复计数
  // ref 参数：从分享链接进入时携带分享者 openId，用于分享→新用户转化分析
  const todayStr = today()
  const lastOpenDate = uni.getStorageSync('last_open_date') || ''
  if (lastOpenDate !== todayStr) {
    logEvent('app_open', {
      scene: options?.scene ?? null,
      ref:   options?.query?.ref ?? null,
    })
    try { uni.setStorageSync('last_open_date', todayStr) } catch {}
  }
})

onShow(() => {
  userStore.checkStreak()
})
</script>

<template>
  <!-- page background is handled by pages.json backgroundColor + theme.json, not JS -->
</template>

<!-- 全局工具类（仅 class 选择器，不含 tag/属性选择器，可安全注入组件 WXSS）-->
<style lang="scss">

// ── 设计 Token（浅色模式） ────────────────────
page {
  // 文字层次
  --ink:   #1a1a1a;
  --ink-2: #444444;
  --ink-3: #777777;
  --ink-4: #aaaaaa;
  --ink-5: #e4e4e4;
  // 背景层次
  --paper:   #f5f4f0;
  --paper-2: #eeede8;
  --white:   #ffffff;
  // 语义色
  --green:        #2e7d32;
  --green-light:  #e8f5e9;
  --green-border: #a5d6a7;
  --red:          #c62828;
  --red-light:    #ffebee;
  --amber:        #e65100;
  --amber-light:  #fff3e0;
  --yellow:       #fffef5;
  --yellow-border:#e0d88a;
  // 一次性组件色
  --banner-correct-from: #e8f5e9;
  --banner-correct-to:   #f9fbe7;
  --banner-wrong-from:   #ffebee;
  --banner-wrong-to:     #fff3e0;
  --banner-wrong-border: #ef9a9a;
  --aha-from:         #fffde7;
  --aha-to:           #fff9c4;
  --aha-border:       #f9e57a;
  --aha-label:        #b8860b;
  --milestone-border: #ffcc80;
  --draft-hint:       #b8ad60;
  --fab-ghost-bg:     rgba(255,255,255,0.9);
  // 工具栏激活图标滤镜（深色底用高亮）
  --icon-filter: brightness(10);
}

// ── 深色模式覆盖（跟随系统，无手动切换）────────────────────────────────────
@media (prefers-color-scheme: dark) {
  page {
    --ink: #f0f0f0; --ink-2: #c0c0c0; --ink-3: #888888; --ink-4: #606060; --ink-5: #2e2e2e;
    --paper: #111111; --paper-2: #1c1c1e; --white: #1a1a1a;
    --green: #4caf50; --green-light: #1a2e1c; --green-border: #2d5c2f;
    --red: #ef5350; --red-light: #2e1a1a;
    --amber: #ff8a50; --amber-light: #2e1e08;
    --yellow: #1c1900; --yellow-border: #3d3600;
    --banner-correct-from: #1a2e1c; --banner-correct-to: #1e2810;
    --banner-wrong-from: #2e1a1a; --banner-wrong-to: #2e1e08; --banner-wrong-border: #7a3030;
    --aha-from: #1e1c00; --aha-to: #2a2400; --aha-border: #3d3600; --aha-label: #d4a017;
    --milestone-border: #4a3010; --draft-hint: #7a7040;
    --fab-ghost-bg: rgba(50,50,50,0.9); --icon-filter: none;
  }
}

// ── 通用卡片 ─────────────────────────────────
.card {
  background: $white;
  border-radius: $radius-lg;
  padding: 28rpx;
  box-shadow: $shadow-sm;
}

// ── 通用按钮 ─────────────────────────────────
// 注：disabled 状态用 .btn-primary--disabled 类名处理，
//     [disabled] 属性选择器在组件 WXSS 中被禁止
.btn-primary {
  background: $ink;
  color: $white;
  border-radius: $radius-md;
  padding: 24rpx 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  width: 100%;
  border: none;

  &:active { opacity: 0.85; transform: scale(0.99); }
  &--disabled { background: $ink-4; pointer-events: none; }
}

.btn-ghost {
  border: 2rpx solid $ink-5;
  color: $ink-3;
  border-radius: $radius-md;
  padding: 20rpx 0;
  text-align: center;
  font-size: 26rpx;
  font-weight: 600;
  background: $white;
}

// ── 标签 ─────────────────────────────────────
.tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: $radius-full;
  font-size: 22rpx;
  font-weight: 700;

  &--green  { background: $green-light; color: $green; }
  &--amber  { background: $amber-light; color: $amber; }
  &--ink    { background: $paper-2;     color: $ink-2; }
}

// ── 分割线 ───────────────────────────────────
.divider {
  height: 1rpx;
  background: $ink-5;
  margin: $space-md 0;
}
</style>
