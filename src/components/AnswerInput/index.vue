<script setup lang="ts">
/**
 * AnswerInput 答题组件
 * 根据 question.type 自动切换：
 *   choice      → 四选一卡片
 *   fill_number → 数字输入框 + 单位
 *   fill_expr   → 文本输入框（支持分数等）
 */
import { ref, computed, onMounted } from 'vue'
import type { Question, SubmitPayload } from '@/types'
import { useQuestionStore } from '@/store/question'

type SubmitPayloadPartial = Omit<SubmitPayload, 'question_id' | 'date'>

const props = defineProps<{
  question: Question
  // 补签模式传入此函数覆盖默认的 submit，返回 truthy 表示成功
  submitFn?: (payload: SubmitPayloadPartial) => Promise<any>
}>()

const emit = defineEmits<{
  submitted: []
}>()

const questionStore = useQuestionStore()

// ── 答题状态 ───────────────────────────────────────────
const selectedOption = ref<string>('')        // 选择题选中项
const fillInput      = ref<string>('')        // 填空题输入
const submitting     = computed(() => questionStore.submitting)
const inputFocused   = ref(false)             // 控制填空题输入框 :focus 属性

// ── 计时 ───────────────────────────────────────────────
const startTime = Date.now()
function getTimeSpent(): number {
  return Math.round((Date.now() - startTime) / 1000)
}

// ── 选择题 ─────────────────────────────────────────────
function selectOption(key: string) {
  if (submitting.value) return
  selectedOption.value = key
}

// ── 提交校验 ───────────────────────────────────────────
const canSubmit = computed(() => {
  if (props.question.type === 'choice') {
    return !!selectedOption.value
  }
  return fillInput.value.trim().length > 0
})

// ── 提交 ───────────────────────────────────────────────
async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return

  const payload: SubmitPayloadPartial = props.question.type === 'choice'
    ? { selected: selectedOption.value, time_spent: getTimeSpent() }
    : { fill_answer: fillInput.value.trim(), time_spent: getTimeSpent() }

  const doSubmit = props.submitFn ?? questionStore.submit
  const result = await doSubmit(payload)
  if (result) {
    emit('submitted')
  }
}

onMounted(() => {
  // 填空题：用 :focus 属性触发键盘弹出
  // 微信小程序没有 document.querySelector，不能调用 DOM focus()
  if (props.question.type !== 'choice') {
    // 延迟 300ms，等抽屉动画结束后再弹键盘，避免动画卡顿
    setTimeout(() => { inputFocused.value = true }, 300)
  }
})
</script>

<template>
  <view class="answer-input">

    <!-- ── 选择题 ── -->
    <view v-if="question.type === 'choice'" class="choice-list">
      <view
        v-for="opt in question.options"
        :key="opt.key"
        class="choice-item"
        :class="{
          'choice-item--selected': selectedOption === opt.key,
          'choice-item--disabled': submitting,
        }"
        @tap="selectOption(opt.key)"
      >
        <view
          class="choice-item__key"
          :class="{ 'choice-item__key--selected': selectedOption === opt.key }"
        >
          <text>{{ opt.key }}</text>
        </view>
        <text class="choice-item__text">{{ opt.text }}</text>
      </view>
    </view>

    <!-- ── 填空题 ── -->
    <view v-else class="fill-wrap">
      <text class="fill-wrap__label">你的答案是</text>
      <view class="fill-wrap__row">
        <input
          class="answer-input__field"
          v-model="fillInput"
          :type="question.type === 'fill_number' ? 'number' : 'text'"
          :placeholder="question.type === 'fill_number' ? '输入数字' : '输入答案'"
          :disabled="submitting"
          :focus="inputFocused"
          :adjust-position="true"
          confirm-type="done"
          @confirm="handleSubmit"
        />
        <text v-if="question.answer_unit" class="fill-wrap__unit">
          {{ question.answer_unit }}
        </text>
      </view>
      <text v-if="question.type === 'fill_expr'" class="fill-wrap__hint">
        支持分数（如 1/8）和百分比（如 12.5%）
      </text>
    </view>

    <!-- 提交按钮 -->
    <view
      class="submit-btn"
      :class="{
        'submit-btn--disabled': !canSubmit || submitting,
        'submit-btn--loading':  submitting,
      }"
      @tap="handleSubmit"
    >
      <text class="submit-btn__label">{{ submitting ? '提交中...' : '确认提交' }}</text>
    </view>

    <!-- 提示文案 -->
    <text class="answer-input__notice">提交后不可修改</text>

  </view>
</template>

<style lang="scss">

.answer-input {
  &__notice {
    display: block;
    text-align: center;
    font-size: 22rpx;
    color: $ink-4;
    margin-top: $space-sm;
  }

  &__field {
    flex: 1;
    height: 88rpx;
    background: $paper;
    border-radius: $radius-md;
    padding: 0 $space-md;
    font-size: 32rpx;
    font-weight: 600;
    color: $ink;
    border: 2rpx solid $ink-5;
    transition: border-color $duration-fast;

    &:focus { border-color: $ink-3; }
  }
}

// ── 选择题 ──────────────────────────────────────────────
.choice-list {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  margin-bottom: $space-md;
}

.choice-item {
  display: flex;
  align-items: center;
  gap: $space-md;
  padding: $space-md;
  background: $paper;
  border-radius: $radius-md;
  border: 2rpx solid $ink-5;
  transition: all $duration-fast;

  &--selected {
    background: $green-light;
    border-color: $green-border;
  }

  &--disabled { opacity: 0.7; }

  &:active { opacity: 0.8; }

  &__key {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: $white;
    border: 2rpx solid $ink-5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    font-weight: 800;
    color: $ink-3;
    flex-shrink: 0;
    transition: all $duration-fast;

    &--selected {
      background: $green;
      border-color: $green;
      color: $white;
    }
  }

  &__text {
    font-size: 28rpx;
    color: $ink;
    line-height: 1.5;
    flex: 1;
  }
}

// ── 填空题 ──────────────────────────────────────────────
.fill-wrap {
  margin-bottom: $space-md;

  &__label {
    display: block;
    font-size: 26rpx;
    color: $ink-3;
    margin-bottom: $space-sm;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__unit {
    font-size: 28rpx;
    color: $ink-2;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__hint {
    display: block;
    font-size: 22rpx;
    color: $ink-4;
    margin-top: 10rpx;
  }
}

// ── 提交按钮 ────────────────────────────────────────────
.submit-btn {
  height: 96rpx;
  background: $ink;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $space-sm;
  transition: opacity $duration-fast;

  &__label {
    font-size: 30rpx;
    font-weight: 700;
    color: $white;
    letter-spacing: 2rpx;
  }

  &--disabled {
    background: $ink-4;
    pointer-events: none;
  }

  &--loading { opacity: 0.7; }

  &:active { opacity: 0.85; }
}
</style>
