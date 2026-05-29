<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SketchPad from '@/components/SketchPad/index.vue'
import AnswerInput from '@/components/AnswerInput/index.vue'
import { useQuestionStore } from '@/store/question'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import type { SubmitPayload } from '@/types'

const questionStore = useQuestionStore()
const userStore     = useUserStore()
const themeStore    = useThemeStore()

// 补签模式：rescue_date 有值时为补签
const rescueDate = ref('')
const isRescueMode = computed(() => !!rescueDate.value)

const question   = computed(() =>
  isRescueMode.value ? questionStore.rescueQuestion : questionStore.todayQuestion
)
const isAnswered = computed(() => !isRescueMode.value && questionStore.isAnswered)

// 悬浮题目卡片折叠状态
const cardCollapsed = ref(false)

// 底部答题抽屉是否展开
const answerVisible = ref(false)

// SketchPad 组件实例（用于截图）
const sketchPadRef = ref<InstanceType<typeof SketchPad> | null>(null)

// 从路由参数获取题目 id（备用）
const questionId = ref('')
onLoad(async (options) => {
  rescueDate.value = options?.rescue_date || ''
  if (isRescueMode.value) {
    await questionStore.loadRescueQuestion(rescueDate.value)
    questionId.value = questionStore.rescueQuestion?._id || ''
  } else {
    questionId.value = options?.id || question.value?._id || ''
    // submit=1：从首页"直接填写答案"入口进来，自动打开答题抽屉
    if (options?.submit === '1') {
      answerVisible.value = true
    }
  }
})

// 补签模式的提交函数，传给 AnswerInput 覆盖默认的 submit
async function rescueSubmitFn(payload: Omit<SubmitPayload, 'question_id' | 'date'>) {
  return await questionStore.submitRescue(payload, rescueDate.value)
}

// 提交入口：展开答题抽屉
function openAnswer() {
  answerVisible.value = true
}

// 答题完成回调（由 AnswerInput 触发）
async function onSubmitted() {
  answerVisible.value = false

  if (isRescueMode.value) {
    // 补签：修复 streak，弹窗提示，返回设置页
    userStore.useRescue(rescueDate.value)
    uni.showModal({
      title: '补签成功 🎉',
      content: `${rescueDate.value} 的打卡已补上，连续天数 +1！`,
      showCancel: false,
      confirmText: '好的',
      success: () => uni.navigateBack(),
    })
  } else {
    // 正常流程：跳转解析页
    uni.redirectTo({ url: '/pages/result/index' })
  }
}

// 返回首页
function goBack() {
  uni.navigateBack()
}

// 跳转解析页（已完成时使用）
function goToResult() {
  uni.redirectTo({ url: '/pages/result/index' })
}
</script>

<template>
  <view class="draft-page">

    <!-- 草稿纸（全屏） -->
    <SketchPad
      ref="sketchPadRef"
      :questionId="questionId || question?._id || 'default'"
      class="draft-page__canvas"
    />

    <!-- 悬浮题目卡片 -->
    <view
      class="float-card"
      :class="{ 'float-card--collapsed': cardCollapsed }"
    >
      <view class="float-card__header" @tap="cardCollapsed = !cardCollapsed">
        <view class="float-card__pin-row">
          <text class="float-card__pin">{{ isRescueMode ? `📅 补签 ${rescueDate}` : '📌 题目' }}</text>
          <text v-if="isAnswered" class="float-card__done-tag">✓ 已完成</text>
        </view>
        <text class="float-card__toggle">
          {{ cardCollapsed ? '展开 ↑' : '收起 ↓' }}
        </text>
      </view>

      <view v-if="!cardCollapsed" class="float-card__body">
        <text class="float-card__text" user-select>
          {{ question?.body ?? '题目加载中...' }}
        </text>
      </view>
    </view>

    <!-- 右下角操作按钮组 -->
    <view class="fab-group">
      <!-- 返回 -->
      <view class="fab fab--ghost" @tap="goBack">
        <text class="fab__icon">←</text>
      </view>
      <!-- 未作答：提交答案；已作答：查看解析 -->
      <view v-if="!isAnswered" class="fab fab--primary" @tap="openAnswer">
        <text class="fab__label">提交答案</text>
      </view>
      <view v-else class="fab fab--done" @tap="goToResult">
        <text class="fab__label">查看今日解析 →</text>
      </view>
    </view>

    <!-- 答题抽屉（从底部弹出） -->
    <view
      class="answer-drawer"
      :class="{ 'answer-drawer--visible': answerVisible }"
    >
      <!-- 遮罩 -->
      <view
        class="answer-drawer__mask"
        @tap="answerVisible = false"
      />
      <!-- 内容 -->
      <view class="answer-drawer__content">
        <view class="answer-drawer__handle" />
        <text class="answer-drawer__title">{{ question?.title }}</text>

        <AnswerInput
          v-if="question"
          :question="question"
          :submit-fn="isRescueMode ? rescueSubmitFn : undefined"
          @submitted="onSubmitted"
        />
      </view>
    </view>

  </view>
</template>

<style lang="scss">

.draft-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: $yellow;

  &__canvas {
    flex: 1;
    min-height: 0;
  }
}

// ── 悬浮题目卡片 ─────────────────────────────
.float-card {
  position: absolute;
  bottom: 180rpx;
  left: $space-md;
  right: $space-md;
  background: $white;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  border: 1rpx solid $ink-5;
  overflow: hidden;
  transition: all $duration-mid $ease-out;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18rpx 24rpx;
  }

  &__pin-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__pin {
    font-size: 24rpx;
    font-weight: 700;
    color: $ink-3;
  }

  &__done-tag {
    font-size: 20rpx;
    font-weight: 700;
    color: $green;
    background: $green-light;
    padding: 4rpx 12rpx;
    border-radius: $radius-full;
    border: 1rpx solid $green-border;
  }

  &__toggle {
    font-size: 22rpx;
    color: $ink-4;
    background: $paper;
    padding: 4rpx 14rpx;
    border-radius: $radius-full;
  }

  &__body {
    padding: 0 24rpx 20rpx;
  }

  &__text {
    font-size: 26rpx;
    color: $ink-2;
    line-height: 1.65;
    display: block;
  }
}

// ── FAB 按钮组 ───────────────────────────────
.fab-group {
  position: absolute;
  bottom: $space-xl;
  left: $space-md;
  right: $space-md;
  display: flex;
  gap: $space-sm;
  align-items: center;
}

.fab {
  height: 88rpx;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-md;
  transition: opacity $duration-fast;

  &:active { opacity: 0.8; transform: scale(0.98); }

  &--ghost {
    width: 88rpx;
    background: var(--fab-ghost-bg);
    border: 2rpx solid $ink-5;
    flex-shrink: 0;
  }

  &--primary {
    flex: 1;
    background: $ink;
  }

  &--done {
    flex: 1;
    background: $green;
  }

  &__icon {
    font-size: 32rpx;
    color: $ink-2;
  }

  &__label {
    font-size: 28rpx;
    font-weight: 700;
    color: $white;
    letter-spacing: 2rpx;
  }
}

// ── 答题抽屉 ─────────────────────────────────
.answer-drawer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;

  &--visible {
    pointer-events: auto;
  }

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0);
    transition: background $duration-mid;

    .answer-drawer--visible & {
      background: rgba(0,0,0,0.4);
    }
  }

  &__content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: $white;
    border-radius: $radius-xl $radius-xl 0 0;
    padding: $space-md $space-md $space-xl;
    transform: translateY(100%);
    transition: transform $duration-mid $ease-out;

    .answer-drawer--visible & {
      transform: translateY(0);
    }
  }

  &__handle {
    width: 80rpx;
    height: 8rpx;
    background: $ink-5;
    border-radius: $radius-full;
    margin: 0 auto $space-md;
  }

  &__title {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    color: $ink;
    margin-bottom: $space-md;
    text-align: center;
  }
}

</style>
