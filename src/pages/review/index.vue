<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ResultBanner from '@/components/ResultBanner/index.vue'
import { getHistoryDetail } from '@/api/cloud'
import { formatDisplayDate, formatDuration } from '@/utils/date'
import { CATEGORY_SUBTITLE } from '@/utils/category'
import type { HistoryDetail, SubmitResult } from '@/types'

const detail  = ref<HistoryDetail | null>(null)
const loading = ref(false)
const altExpanded = ref(false)

onLoad(async (options) => {
  const date = options?.date
  if (!date) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    uni.navigateBack()
    return
  }

  uni.setNavigationBarTitle({ title: formatDisplayDate(date).split(' · ')[0] })

  loading.value = true
  try {
    detail.value = await getHistoryDetail(date)
  } catch (e) {
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
    uni.navigateBack()
  } finally {
    loading.value = false
  }
})

// 将历史记录 + 题目合成为 ResultBanner 所需的 SubmitResult
const syntheticResult = computed((): SubmitResult | null => {
  const d = detail.value
  if (!d) return null
  return {
    is_correct:     d.record.is_correct,
    correct_answer: d.correct_answer,
    solution:       d.question.solution ?? '',
    aha_moment:     d.question.aha_moment ?? '',
    alt_solution:   d.question.alt_solution,
    trap:           d.question.trap,
    stats:          d.question.stats,
  }
})
</script>

<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">

    <!-- 加载中 -->
    <view v-if="loading" class="loading">
      <text class="loading__text">加载中...</text>
    </view>

    <view v-else-if="detail && syntheticResult" class="content">

      <!-- 题目信息头 -->
      <view class="q-header">
        <view class="q-header__tags">
          <view class="tag tag--green">{{ detail.question.category }}</view>
          <text class="q-header__sub">{{ CATEGORY_SUBTITLE[detail.question.category] }}</text>
        </view>
        <view class="q-header__dots">
          <view
            v-for="i in 5" :key="i"
            class="q-header__dot"
            :class="{ 'q-header__dot--filled': i <= detail.question.difficulty }"
          />
        </view>
      </view>

      <!-- 题目正文 -->
      <view class="q-body">
        <text class="q-body__title">{{ detail.question.title }}</text>
        <text class="q-body__text" user-select>{{ detail.question.body }}</text>
        <image
          v-if="detail.question.image_url"
          class="q-body__image"
          :src="detail.question.image_url"
          mode="widthFix"
        />
      </view>

      <!-- 我的作答 -->
      <view class="my-answer">
        <text class="my-answer__label">我的作答</text>
        <view class="my-answer__row">
          <text class="my-answer__value">
            {{ detail.record.selected ?? detail.record.fill_answer ?? '—' }}
          </text>
          <text class="my-answer__badge" :class="detail.record.is_correct ? 'my-answer__badge--correct' : 'my-answer__badge--wrong'">
            {{ detail.record.is_correct ? '✓ 正确' : '✗ 错误' }}
          </text>
        </view>
        <text class="my-answer__time">用时 {{ formatDuration(detail.record.time_spent) }}</text>
      </view>

      <!-- 结果 Banner -->
      <ResultBanner :result="syntheticResult" :timeSpent="detail.record.time_spent" />

      <!-- 解题思路 -->
      <view class="section">
        <text class="section__title">💡 解题思路</text>
        <view class="analysis-card">
          <text class="analysis-card__text">{{ syntheticResult.solution }}</text>
        </view>
      </view>

      <!-- 啊哈时刻 -->
      <view v-if="syntheticResult.aha_moment" class="aha-box">
        <text class="aha-box__label">✨ 核心洞察</text>
        <text class="aha-box__text">{{ syntheticResult.aha_moment }}</text>
      </view>

      <!-- 常见陷阱 -->
      <view v-if="syntheticResult.trap" class="trap-box">
        <text class="trap-box__label">⚠️ 大多数人栽在这里</text>
        <text class="trap-box__text">{{ syntheticResult.trap }}</text>
      </view>

      <!-- 另一种解法（折叠） -->
      <view
        v-if="syntheticResult.alt_solution"
        class="alt-solution"
        @tap="altExpanded = !altExpanded"
      >
        <view class="alt-solution__header">
          <text class="alt-solution__label">💭 还有另一种思路</text>
          <text class="alt-solution__arrow">{{ altExpanded ? '↑' : '↓' }}</text>
        </view>
        <view v-if="altExpanded" class="alt-solution__body">
          <text class="alt-solution__text">{{ syntheticResult.alt_solution }}</text>
        </view>
      </view>

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

// ── 加载态 ────────────────────────────────────
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50vh;

  &__text { font-size: 28rpx; color: $ink-4; }
}

// ── 题目头 ────────────────────────────────────
.q-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-sm;

  &__tags {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__sub {
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 500;
  }

  &__dots {
    display: flex;
    gap: 6rpx;
  }

  &__dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: $ink-5;

    &--filled { background: $ink-3; }
  }
}

// ── 题目正文 ──────────────────────────────────
.q-body {
  background: $paper;
  border-radius: $radius-lg;
  padding: 24rpx 28rpx;
  margin-bottom: $space-md;
  border-left: 6rpx solid $ink-3;

  &__title {
    display: block;
    font-size: 22rpx;
    font-weight: 700;
    color: $ink-4;
    letter-spacing: 1rpx;
    margin-bottom: 10rpx;
  }

  &__text {
    display: block;
    font-size: 30rpx;
    color: $ink;
    line-height: 1.7;
  }

  &__image {
    width: 100%;
    margin-top: $space-md;
    border-radius: $radius-md;
  }
}

// ── 我的作答 ──────────────────────────────────
.my-answer {
  background: $paper;
  border-radius: $radius-md;
  padding: 20rpx 24rpx;
  margin-bottom: $space-md;

  &__label {
    display: block;
    font-size: 20rpx;
    font-weight: 700;
    color: $ink-4;
    letter-spacing: 2rpx;
    margin-bottom: 10rpx;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $space-sm;
    margin-bottom: 6rpx;
  }

  &__value {
    font-size: 30rpx;
    font-weight: 700;
    color: $ink;
  }

  &__badge {
    font-size: 20rpx;
    font-weight: 700;
    padding: 4rpx 14rpx;
    border-radius: $radius-full;

    &--correct {
      color: $green;
      background: $green-light;
      border: 1rpx solid $green-border;
    }

    &--wrong {
      color: $red;
      background: $red-light;
      border: 1rpx solid $red;
    }
  }

  &__time {
    font-size: 22rpx;
    color: $ink-4;
  }
}

// ── 以下与 result 页样式相同 ──────────────────
.section {
  margin-bottom: $space-md;

  &__title {
    display: block;
    font-size: 26rpx;
    font-weight: 800;
    color: $ink;
    margin-bottom: $space-sm;
  }
}

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
</style>
