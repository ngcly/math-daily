<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import ResultBanner from '@/components/ResultBanner/index.vue'
import { useQuestionStore } from '@/store/question'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { requestDailySubscribe, showSubscribeStatusToast } from '@/utils/subscribe'
import { logEvent, getAIFeedback } from '@/api/cloud'
import { today, dateToStr } from '@/utils/date'

const questionStore = useQuestionStore()
const userStore     = useUserStore()
const themeStore    = useThemeStore()

const question = computed(() => questionStore.todayQuestion)
const result   = computed(() => questionStore.submitResult)
const streak   = computed(() => userStore.streak)

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

// 与全球平均用时的对比（差距 < 3s 不显示）
const avgTimeComparison = computed(() => {
  const s = result.value?.stats
  if (!s || s.total < 2 || !s.total_time) return null
  const avg  = Math.round(s.total_time / s.total)
  const diff = avg - timeSpent.value
  if (Math.abs(diff) < 3) return null
  return diff > 0
    ? `比全球平均用时快 ${diff} 秒 ⚡`
    : `比全球平均用时慢 ${Math.abs(diff)} 秒`
})

// 里程碑：只在特定节点触发
const milestone = computed(() => {
  const s = streak.value
  if (s === 100) return { emoji: '🚀', text: '百日里程碑！传奇级别' }
  if (s === 30)  return { emoji: '🏆', text: '整整一个月！顶级自律' }
  if (s === 14)  return { emoji: '🌟', text: '两周不间断！你是认真的' }
  if (s === 7)   return { emoji: '🎯', text: '坚持一周！大脑在发光' }
  if (s > 7 && s % 7 === 0) return { emoji: '🔥', text: `连续 ${s} 天！保持下去` }
  return null
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
  logEvent('share', { question_id: question.value?._id, type: 'timeline_copy' })
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
  if (!result.value) {
    uni.switchTab({ url: '/pages/index/index' })
    return
  }
  // 允许今天或昨天的提交（处理跨零点边界情况：23:59 提交，00:01 查看）
  const sd = questionStore.submittedDate
  const todayStr = today()
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yesterdayStr = dateToStr(d)
  if (sd !== todayStr && sd !== yesterdayStr) {
    uni.switchTab({ url: '/pages/index/index' })
    return
  }
  // 从 questionStore 取本次用时（submit 时已持久化到 store）
  timeSpent.value = questionStore.lastTimeSpent

  // 生成小程序短链（正式版可用；开发版可能失败，静默降级）
  wx.generateShortLink?.({
    path: 'pages/index/index',
    query: '',
    isPermanent: false,
    success: (res: { link: string }) => { miniLink.value = res.link },
  })
})

// ── 微信原生分享 ───────────────────────────────────────
// 分享给朋友（配合 <button open-type="share"> 触发）
onShareAppMessage(() => {
  logEvent('share', { question_id: question.value?._id, type: 'friend' })
  const correct = result.value?.is_correct
  const title = question.value
    ? (correct
        ? `我答对了今日脑力题：${question.value.title} 🎉`
        : `今日脑力挑战：${question.value.title}，你能做到吗？`)
    : '别让你的脑生锈 · 训练你的大脑'
  // ref 参数：新用户从此链接进入时，App.vue 的 app_open 事件可记录来源
  const ref = userStore.profile?._id || ''
  return {
    title,
    path: ref ? `/pages/index/index?ref=${ref}` : '/pages/index/index',
  }
})

// 分享到朋友圈
onShareTimeline(() => {
  logEvent('share', { question_id: question.value?._id, type: 'timeline' })
  const ref = userStore.profile?._id || ''
  return {
    title: answerCopy.value.split('\n')[0] || '别让你的脑生锈 · 训练你的大脑',
    query: ref ? `ref=${ref}` : '',
  }
})

// ── 订阅明日提醒 ──────────────────────────────────────
async function requestSubscribe() {
  const status = await requestDailySubscribe()
  if (status === 'accept') {
    try {
      await userStore.updatePrefs({ subscribed: true })
    } catch {
      console.warn('[Result] subscribed 保存失败')
    }
  }
  showSubscribeStatusToast(status, '明天准时提醒你 🔔')
}

// ── AI 点评 ───────────────────────────────────────────
const aiFeedback        = ref('')
const aiFeedbackLoading = ref(false)
const aiFeedbackError   = ref('')

async function fetchAiFeedback() {
  if (aiFeedback.value || aiFeedbackLoading.value) return
  const date = questionStore.submittedDate
  if (!date) return
  aiFeedbackLoading.value = true
  aiFeedbackError.value   = ''
  try {
    const res = await getAIFeedback(date)
    aiFeedback.value = res.feedback
  } catch (e) {
    aiFeedbackError.value = e instanceof Error ? e.message : 'AI 点评生成失败，请稍后重试'
  } finally {
    aiFeedbackLoading.value = false
  }
}

// ── 返回首页 ─────────────────────────────────────────
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">

    <view v-if="result && question" class="content">

      <!-- Streak 里程碑 -->
      <view v-if="milestone" class="milestone">
        <text class="milestone__emoji">{{ milestone.emoji }}</text>
        <text class="milestone__text">{{ milestone.text }}</text>
      </view>

      <!-- 结果 Banner + 统计 -->
      <ResultBanner :result="result" :timeSpent="timeSpent" />

      <!-- 平均用时对比 -->
      <view v-if="avgTimeComparison" class="avg-time">
        <text class="avg-time__text">{{ avgTimeComparison }}</text>
      </view>

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

      <!-- AI 点评 -->
      <view class="ai-section">
        <!-- 入口按钮（未加载时显示） -->
        <view
          v-if="!aiFeedback && !aiFeedbackLoading"
          class="ai-btn"
          @tap="fetchAiFeedback"
        >
          <text class="ai-btn__icon">🤖</text>
          <text class="ai-btn__label">AI 点评我的作答</text>
          <text class="ai-btn__arrow">›</text>
        </view>

        <!-- 加载中 -->
        <view v-else-if="aiFeedbackLoading" class="ai-loading">
          <text class="ai-loading__text">AI 正在分析中…</text>
        </view>

        <!-- 错误 -->
        <view v-else-if="aiFeedbackError" class="ai-error" @tap="fetchAiFeedback">
          <text class="ai-error__text">{{ aiFeedbackError }}</text>
          <text class="ai-error__retry">点击重试</text>
        </view>

        <!-- 点评结果 -->
        <view v-else-if="aiFeedback" class="ai-card">
          <view class="ai-card__header">
            <text class="ai-card__tag">🤖 AI 点评</text>
          </view>
          <text class="ai-card__text">{{ aiFeedback }}</text>
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
@keyframes milestone-pop {
  0%   { transform: scale(0.7); opacity: 0; }
  65%  { transform: scale(1.06); }
  100% { transform: scale(1);   opacity: 1; }
}

.milestone {
  display: flex;
  align-items: center;
  gap: $space-sm;
  background: $amber-light;
  border-radius: $radius-md;
  padding: 20rpx 28rpx;
  margin-bottom: $space-md;
  border: 1rpx solid var(--milestone-border);
  animation: milestone-pop 0.45s ease-out both;

  &__emoji { font-size: 48rpx; flex-shrink: 0; }
  &__text  { font-size: 28rpx; font-weight: 700; color: $amber; }
}

// ── 平均用时对比 ─────────────────────────────
.avg-time {
  text-align: center;
  margin-bottom: $space-md;

  &__text {
    font-size: 24rpx;
    color: $ink-3;
    font-weight: 600;
    background: $paper;
    display: inline-block;
    padding: 10rpx 24rpx;
    border-radius: $radius-full;
    border: 1rpx solid $ink-5;
  }
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

// ── AI 点评 ─────────────────────────────────
.ai-section {
  margin-bottom: $space-md;
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: 28rpx $space-md;
  background: $paper;
  border: 2rpx dashed $ink-4;
  border-radius: $radius-md;
  transition: opacity $duration-fast;

  &:active { opacity: 0.7; }

  &__icon { font-size: 36rpx; flex-shrink: 0; }

  &__label {
    flex: 1;
    font-size: 28rpx;
    font-weight: 600;
    color: $ink-2;
  }

  &__arrow {
    font-size: 32rpx;
    color: $ink-4;
    font-weight: 300;
  }
}

.ai-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: $paper;
  border-radius: $radius-md;

  &__text {
    font-size: 26rpx;
    color: $ink-4;
  }
}

.ai-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx $space-md;
  background: $red-light;
  border-radius: $radius-md;
  border-left: 4rpx solid $red;

  &__text {
    flex: 1;
    font-size: 24rpx;
    color: $ink-3;
  }

  &__retry {
    font-size: 24rpx;
    color: $red;
    font-weight: 700;
    flex-shrink: 0;
  }
}

.ai-card {
  background: $paper;
  border-radius: $radius-md;
  overflow: hidden;
  border: 1rpx solid $ink-5;

  &__header {
    padding: 16rpx 24rpx 12rpx;
    border-bottom: 1rpx solid $ink-5;
  }

  &__tag {
    font-size: 22rpx;
    font-weight: 800;
    color: $ink-3;
    letter-spacing: 0.5px;
  }

  &__text {
    display: block;
    font-size: 28rpx;
    color: $ink-2;
    line-height: 1.8;
    padding: 20rpx 24rpx 24rpx;
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
