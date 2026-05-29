<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import ResultBanner from '@/components/ResultBanner/index.vue'
import { useQuestionStore } from '@/store/question'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { requestDailySubscribe, showSubscribeStatusToast } from '@/utils/subscribe'

const questionStore = useQuestionStore()
const userStore     = useUserStore()
const themeStore    = useThemeStore()

const question   = computed(() => questionStore.todayQuestion)
const result     = computed(() => questionStore.submitResult)
const isAnswered = computed(() => questionStore.isAnswered)
const streak     = computed(() => userStore.streak)

// 从 record 里拿用时（store 里记录了提交时的用时）
const timeSpent = ref(0)

// 另一种解法展开状态
const altExpanded = ref(false)

// ── 小程序短链（wxaurl.cn，微信聊天中可点击跳转） ────────────
const miniLink = ref('')

// ── 朋友圈文案 ────────────────────────────────────────
const correctRate = computed(() => {
  const s = result.value?.stats
  if (!s || s.total === 0) return null
  return Math.round((s.correct / s.total) * 100)
})

const answerCopy = computed(() => {
  if (!result.value || !question.value) return ''
  const t = question.value.title
  const link = miniLink.value ? `\n${miniLink.value}` : '\n微信搜索小程序「别让你的脑生锈」'
  if (result.value.is_correct) {
    const rate = correctRate.value
    const rateClause = rate !== null ? `只有 ${rate}% 的人答对，` : ''
    return `今天这道题${rateClause}我做出来了 ✅\n「${t}」\n#脑生锈 #思维训练${link}`
  }
  return `今天被这道题难住了 🤔 解析很精彩\n「${t}」\n#脑生锈 来挑战一下？${link}`
})

const streakCopy = computed(() => {
  const link = miniLink.value ? `\n${miniLink.value}` : '\n微信搜索小程序「别让你的脑生锈」'
  return `连续第 ${streak.value} 天做题 🔥 大脑保持运转中\n#脑生锈${link}`
})

function copyText(text: string) {
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制', icon: 'success', duration: 1500 }),
  })
}

function shareToTimeline() {
  uni.setClipboardData({
    data: answerCopy.value,
    success: () => uni.showModal({
      title: '文案已复制',
      content: '打开微信朋友圈，长按输入框粘贴即可发布',
      showCancel: false,
      confirmText: '知道了',
    }),
  })
}


onShow(() => {
  // 无结果时跳回首页（submitResult 已持久化，重启后仍有值，此处只兜底）
  if (!result.value) {
    uni.switchTab({ url: '/pages/index/index' })
    return
  }
  // 从 localStorage 取本次用时
  const cached = uni.getStorageSync('last_time_spent')
  if (cached) timeSpent.value = Number(cached)

  // 生成小程序短链（正式版可用；开发版可能失败，静默降级）
  wx.generateShortLink?.({
    path: 'pages/index/index',
    query: '',
    isPermanent: false,
    success: (res: any) => { miniLink.value = res.link },
  })
})

// ── 微信原生分享 ───────────────────────────────────────
// 分享给朋友（配合 <button open-type="share"> 触发）
onShareAppMessage(() => {
  const correct = result.value?.is_correct
  const title = question.value
    ? (correct
        ? `我答对了今日脑力题：${question.value.title} 🎉`
        : `今日脑力挑战：${question.value.title}，你能做到吗？`)
    : '别让你的脑生锈 · 训练你的大脑'
  return {
    title,
    path: '/pages/index/index',
  }
})

// 分享到朋友圈
onShareTimeline(() => ({
  title: answerCopy.value.split('\n')[0] || '别让你的脑生锈 · 训练你的大脑',
  query: '',
}))

// ── 订阅明日提醒 ──────────────────────────────────────
async function requestSubscribe() {
  const status = await requestDailySubscribe()
  if (status === 'accept') {
    await userStore.updatePrefs({ subscribed: true })
  }
  showSubscribeStatusToast(status, '明天准时提醒你 🔔')
}

// ── 返回首页 ─────────────────────────────────────────
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">

    <view v-if="result && question" class="content">

      <!-- Streak 里程碑提示 -->
      <view v-if="streak > 0 && streak % 7 === 0" class="milestone">
        <text class="milestone__emoji">🏆</text>
        <text class="milestone__text">连续 {{ streak }} 天！你真厉害</text>
      </view>

      <!-- 结果 Banner + 统计 -->
      <ResultBanner :result="result" :timeSpent="timeSpent" />

      <!-- 解题思路 -->
      <view class="section">
        <text class="section__title">💡 解题思路</text>
        <view class="analysis-card">
          <text class="analysis-card__text">{{ result.solution }}</text>
        </view>
      </view>

      <!-- 啊哈时刻 -->
      <view v-if="result.aha_moment" class="aha-box">
        <text class="aha-box__label">✨ 核心洞察</text>
        <text class="aha-box__text">{{ result.aha_moment }}</text>
      </view>

      <!-- 常见陷阱 -->
      <view v-if="result.trap" class="trap-box">
        <text class="trap-box__label">⚠️ 大多数人栽在这里</text>
        <text class="trap-box__text">{{ result.trap }}</text>
      </view>

      <!-- 另一种解法（折叠） -->
      <view
        v-if="result.alt_solution"
        class="alt-solution"
        @tap="altExpanded = !altExpanded"
      >
        <view class="alt-solution__header">
          <text class="alt-solution__label">💭 还有另一种思路</text>
          <text class="alt-solution__arrow">{{ altExpanded ? '↑' : '↓' }}</text>
        </view>
        <view v-if="altExpanded" class="alt-solution__body">
          <text class="alt-solution__text">{{ result.alt_solution }}</text>
        </view>
      </view>

      <!-- 朋友圈文案 -->
      <view class="copy-section">
        <text class="copy-section__label">📋 朋友圈文案</text>

        <view class="copy-card">
          <text class="copy-card__text">{{ answerCopy }}</text>
          <view class="copy-card__btn" @tap="copyText(answerCopy)">复制</view>
        </view>

        <view v-if="streak > 1" class="copy-card">
          <text class="copy-card__text">{{ streakCopy }}</text>
          <view class="copy-card__btn" @tap="copyText(streakCopy)">复制</view>
        </view>
      </view>

      <!-- 操作区 -->
      <view class="actions">

        <!-- 分享给朋友（必须用 button open-type="share"） -->
        <button class="actions__share" open-type="share">
          <text class="actions__share-text">💬 分享给朋友</text>
        </button>

        <!-- 分享到朋友圈：复制文案 + 引导用户粘贴（shareTimeline 需微信审核，暂不可用） -->
        <view class="actions__timeline" @tap="shareToTimeline">
          <text class="actions__timeline-text">🌐 分享到朋友圈</text>
        </view>

        <!-- 订阅明日提醒 -->
        <view class="actions__subscribe" @tap="requestSubscribe">
          <text class="actions__subscribe-text">🔔 订阅明日提醒</text>
        </view>

        <!-- 返回首页 -->
        <view class="actions__home" @tap="goHome">
          <text class="actions__home-text">回首页</text>
        </view>

      </view>

    </view>

    <!-- 异常：无结果（onShow guard 未拦截的边界情况） -->
    <view v-else class="empty">
      <text>暂无数据</text>
    </view>

  </scroll-view>
</template>

<style lang="scss">

.page {
  min-height: 100vh;
  background: $white;
}

.content {
  padding: $space-md $space-md $space-xl;
}

// ── 里程碑 ──────────────────────────────────
.milestone {
  display: flex;
  align-items: center;
  gap: $space-sm;
  background: $amber-light;
  border-radius: $radius-md;
  padding: 16rpx 24rpx;
  margin-bottom: $space-md;
  border: 1rpx solid var(--milestone-border);

  &__emoji { font-size: 36rpx; }
  &__text  { font-size: 26rpx; font-weight: 700; color: $amber; }
}

// ── 章节标题 ────────────────────────────────
.section {
  margin-bottom: $space-md;

  &__title {
    display: block;
    font-size: 26rpx;
    font-weight: 800;
    color: $ink;
    margin-bottom: $space-sm;
    letter-spacing: 0.5px;
  }
}

// ── 解析卡片 ────────────────────────────────
.analysis-card {
  background: $paper;
  border-radius: $radius-md;
  padding: 24rpx;
  border-left: 6rpx solid $ink;

  &__text {
    font-size: 28rpx;
    color: $ink-2;
    line-height: 1.8;
    display: block;
  }
}

// ── 啊哈时刻 ────────────────────────────────
.aha-box {
  background: linear-gradient(135deg, var(--aha-from), var(--aha-to));
  border-radius: $radius-md;
  padding: 24rpx;
  margin-bottom: $space-md;
  border: 1rpx solid var(--aha-border);

  &__label {
    display: block;
    font-size: 22rpx;
    font-weight: 800;
    color: var(--aha-label);
    letter-spacing: 1px;
    margin-bottom: 8rpx;
  }

  &__text {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: $ink;
    line-height: 1.6;
  }
}

// ── 常见陷阱 ────────────────────────────────
.trap-box {
  background: $red-light;
  border-radius: $radius-md;
  padding: 24rpx;
  margin-bottom: $space-md;
  border-left: 6rpx solid $red;

  &__label {
    display: block;
    font-size: 22rpx;
    font-weight: 800;
    color: $red;
    letter-spacing: 1px;
    margin-bottom: 8rpx;
  }

  &__text {
    display: block;
    font-size: 28rpx;
    color: $ink-2;
    line-height: 1.8;
  }
}

// ── 另一种解法 ──────────────────────────────
.alt-solution {
  border: 2rpx dashed $ink-5;
  border-radius: $radius-md;
  margin-bottom: $space-md;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 24rpx;
  }

  &__label { font-size: 26rpx; color: $ink-3; font-weight: 600; }
  &__arrow { font-size: 24rpx; color: $ink-4; }

  &__body {
    padding: 0 24rpx 20rpx;
    border-top: 1rpx solid $ink-5;
  }

  &__text {
    display: block;
    font-size: 26rpx;
    color: $ink-2;
    line-height: 1.75;
    padding-top: $space-sm;
  }
}

// ── 朋友圈文案 ──────────────────────────────
.copy-section {
  margin-bottom: $space-md;

  &__label {
    display: block;
    font-size: 22rpx;
    font-weight: 800;
    color: $ink-3;
    letter-spacing: 1px;
    margin-bottom: $space-sm;
    text-transform: uppercase;
  }
}

.copy-card {
  background: $paper;
  border-radius: $radius-md;
  padding: 24rpx;
  margin-bottom: $space-sm;
  display: flex;
  align-items: flex-start;
  gap: $space-sm;

  &__text {
    flex: 1;
    font-size: 26rpx;
    color: $ink-2;
    line-height: 1.75;
    white-space: pre-line;
  }

  &__btn {
    flex-shrink: 0;
    height: 56rpx;
    padding: 0 24rpx;
    background: $ink;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    font-weight: 700;
    color: $white;
    letter-spacing: 1px;

    &:active { opacity: 0.75; }
  }
}

// ── 操作区 ──────────────────────────────────
.actions {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  margin-top: $space-md;

  &__share {
    width: 100%;
    height: 96rpx;
    background: $wechat;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity $duration-fast;
    border: none;
    padding: 0;

    &:active { opacity: 0.85; }
  }

  &__share-text {
    font-size: 30rpx;
    font-weight: 700;
    color: $white;
    letter-spacing: 1px;
  }

  &__timeline {
    width: 100%;
    height: 88rpx;
    background: $white;
    border: 2rpx solid $ink-5;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity $duration-fast;
    padding: 0;

    &:active { background: $paper; }
  }

  &__timeline-text {
    font-size: 28rpx;
    font-weight: 600;
    color: $ink-2;
  }

  &__subscribe {
    height: 88rpx;
    background: $white;
    border: 2rpx solid $ink-5;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;

    &:active { background: $paper; }
  }

  &__subscribe-text {
    font-size: 28rpx;
    color: $ink-2;
    font-weight: 600;
  }

  &__home {
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__home-text {
    font-size: 26rpx;
    color: $ink-4;
  }
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50vh;
  font-size: 28rpx;
  color: $ink-4;
}
</style>
