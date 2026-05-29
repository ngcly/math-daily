<script setup lang="ts">
import { ref } from 'vue'
import { submitFeedback, type FeedbackCategory } from '@/api/cloud'

const CATEGORIES: { key: FeedbackCategory; label: string; emoji: string }[] = [
  { key: 'bug',     label: '遇到 Bug',  emoji: '🐛' },
  { key: 'content', label: '题目问题',  emoji: '📝' },
  { key: 'feature', label: '功能建议',  emoji: '💡' },
  { key: 'other',   label: '其他',      emoji: '💬' },
]

const MAX_LENGTH = 500

const category    = ref<FeedbackCategory>('bug')
const content     = ref('')
const submitting  = ref(false)
const submitted   = ref(false)

function selectCategory(key: FeedbackCategory) {
  category.value = key
}

async function handleSubmit() {
  const text = content.value.trim()
  if (!text || submitting.value) return

  submitting.value = true
  try {
    await submitFeedback(category.value, text)
    submitted.value = true
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">
    <view class="content">

      <!-- 成功态 -->
      <view v-if="submitted" class="success">
        <text class="success__emoji">🎉</text>
        <text class="success__title">感谢反馈！</text>
        <text class="success__sub">我们会认真阅读每一条反馈</text>
        <view class="success__btn" @tap="goBack">返回</view>
      </view>

      <!-- 表单 -->
      <view v-else>
        <!-- 分类选择 -->
        <text class="form-label">反馈类型</text>
        <view class="category-list">
          <view
            v-for="cat in CATEGORIES"
            :key="cat.key"
            class="category-item"
            :class="{ 'category-item--active': category === cat.key }"
            @tap="selectCategory(cat.key)"
          >
            <text class="category-item__emoji">{{ cat.emoji }}</text>
            <text class="category-item__label">{{ cat.label }}</text>
          </view>
        </view>

        <!-- 内容输入 -->
        <text class="form-label">反馈内容</text>
        <view class="textarea-wrap">
          <textarea
            class="feedback-textarea"
            v-model="content"
            placeholder="请详细描述你遇到的问题或建议…"
            placeholder-class="feedback-textarea__placeholder"
            :maxlength="MAX_LENGTH"
            :disabled="submitting"
            auto-height
          />
          <text class="char-count">{{ content.length }}/{{ MAX_LENGTH }}</text>
        </view>

        <!-- 提交 -->
        <view
          class="submit-btn"
          :class="{
            'submit-btn--disabled': !content.trim() || submitting,
            'submit-btn--loading':  submitting,
          }"
          @tap="handleSubmit"
        >
          <text class="submit-btn__label">{{ submitting ? '提交中...' : '提交反馈' }}</text>
        </view>

        <text class="footer-note">反馈与个人账号关联，方便我们跟进处理</text>
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

// ── 成功态 ────────────────────────────────────
.success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-xl 0;
  gap: $space-md;

  &__emoji { font-size: 96rpx; }

  &__title {
    font-size: 40rpx;
    font-weight: 900;
    color: $ink;
    letter-spacing: -1rpx;
  }

  &__sub {
    font-size: 26rpx;
    color: $ink-3;
  }

  &__btn {
    margin-top: $space-sm;
    height: 88rpx;
    padding: 0 64rpx;
    background: $ink;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 700;
    color: $white;
    letter-spacing: 2rpx;

    &:active { opacity: 0.85; }
  }
}

// ── 表单标签 ──────────────────────────────────
.form-label {
  display: block;
  font-size: 22rpx;
  font-weight: 800;
  color: $ink-3;
  letter-spacing: 1px;
  margin-bottom: $space-sm;
  text-transform: uppercase;
}

// ── 分类选择 ──────────────────────────────────
.category-list {
  display: flex;
  gap: $space-sm;
  margin-bottom: $space-md;
  flex-wrap: wrap;
}

.category-item {
  flex: 1;
  min-width: 140rpx;
  height: 96rpx;
  background: $white;
  border: 2rpx solid $ink-5;
  border-radius: $radius-md;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  transition: all $duration-fast;

  &:active { opacity: 0.75; }

  &--active {
    background: $green-light;
    border-color: $green-border;
  }

  &__emoji { font-size: 32rpx; line-height: 1; }

  &__label {
    font-size: 22rpx;
    font-weight: 600;
    color: $ink-2;
  }

  &--active &__label { color: $green; }
}

// ── 文本输入 ──────────────────────────────────
.textarea-wrap {
  background: $white;
  border-radius: $radius-md;
  border: 2rpx solid $ink-5;
  padding: 20rpx $space-md;
  margin-bottom: $space-md;
  position: relative;
}

.feedback-textarea {
  width: 100%;
  min-height: 240rpx;
  font-size: 28rpx;
  color: $ink;
  line-height: 1.75;

  &__placeholder { color: $ink-4; }
}

.char-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: $ink-4;
  margin-top: 8rpx;
}

// ── 提交按钮 ──────────────────────────────────
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

  &--disabled { background: $ink-4; pointer-events: none; }
  &--loading  { opacity: 0.7; }
  &:active    { opacity: 0.85; }
}

// ── 底部说明 ──────────────────────────────────
.footer-note {
  display: block;
  text-align: center;
  font-size: 20rpx;
  color: $ink-4;
  margin-top: $space-sm;
}
</style>
