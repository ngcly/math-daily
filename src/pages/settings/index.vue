<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { useDraftStore } from '@/store/draft'
import { requestDailySubscribe, showSubscribeStatusToast } from '@/utils/subscribe'

// ── WeChat 小程序事件类型定义（uni-app @dcloudio/types 未覆盖）──
interface ChooseAvatarEvent {
  detail: { avatarUrl: string }
}
interface InputBlurEvent {
  detail: { value: string }
}
interface PickerChangeEvent {
  detail: { value: number }
}

const userStore  = useUserStore()
const themeStore = useThemeStore()
const draftStore = useDraftStore()

const profile    = computed(() => userStore.profile)

// ── 用户资料 ─────────────────────────────────────────
const avatarUrl = ref('')
const nickname  = ref('')

// ── 提醒时间 ─────────────────────────────────────────
const REMIND_HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
)
const remindTime  = ref('08:00')
const remindIndex = ref(8)

onShow(() => {
  themeStore.setCurrentTab(2)
})

// 监听 profile 变化，自动填充表单（解决 init() 异步加载完比 onShow 晚的问题）
watch(profile, (p) => {
  if (!p) return
  avatarUrl.value   = p.avatar_url  || ''
  nickname.value    = p.nickname    || ''
  remindTime.value  = p.remind_time
  const idx = REMIND_HOURS.indexOf(p.remind_time)
  remindIndex.value = idx >= 0 ? idx : 8
}, { immediate: true })

// 选择头像后上传到云存储并保存文件 ID
async function onChooseAvatar(e: ChooseAvatarEvent) {
  const tempPath = e.detail.avatarUrl
  if (!tempPath || !profile.value) return

  uni.showLoading({ title: '保存中...' })
  try {
    const fileID = await new Promise<string>((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: `avatars/${profile.value!._id}.jpg`,
        filePath:  tempPath,
        success:   (res: { fileID: string }) => resolve(res.fileID),
        fail:      reject,
      })
    })
    avatarUrl.value = fileID
    await userStore.updatePrefs({ avatar_url: fileID })
    uni.showToast({ title: '头像已更新', icon: 'success' })
  } catch {
    uni.showToast({ title: '头像保存失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 昵称失焦后保存（仅值变化时才写云端）
async function onNicknameBlur(e: InputBlurEvent) {
  const name = (e.detail.value ?? '').trim()
  if (!name || name === profile.value?.nickname) return
  nickname.value = name
  try {
    await userStore.updatePrefs({ nickname: name })
    uni.showToast({ title: '昵称已保存', icon: 'success' })
  } catch {
    nickname.value = profile.value?.nickname || ''
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

async function onRemindChange(e: PickerChangeEvent) {
  remindIndex.value = e.detail.value
  remindTime.value  = REMIND_HOURS[e.detail.value]
  try {
    await userStore.updatePrefs({ remind_time: remindTime.value })
  } catch {
    console.warn('[Settings] remind_time 保存失败')
  }
}

// ── 订阅推送 ─────────────────────────────────────────
async function requestSubscribe() {
  const status = await requestDailySubscribe()
  if (status === 'accept') {
    try {
      await userStore.updatePrefs({ subscribed: true })
    } catch {
      console.warn('[Settings] subscribed 保存失败')
    }
  }
  showSubscribeStatusToast(status, '订阅成功 🔔')
}

// ── Streak 补签 ──────────────────────────────────────
const pendingRescueDate = computed(() => userStore.pendingRescueDate)
const canRescue = computed(() => !!pendingRescueDate.value)

function goRescue() {
  if (!canRescue.value) return
  uni.navigateTo({ url: `/pages/draft/index?rescue_date=${pendingRescueDate.value}` })
}

// ── 意见反馈 ─────────────────────────────────────────
function goFeedback() {
  uni.navigateTo({ url: '/pages/feedback/index' })
}

// ── 清除草稿缓存 ──────────────────────────────────────
function clearDrafts() {
  uni.showModal({
    title: '清除草稿缓存',
    content: '将删除所有本地演算草稿，无法恢复。',
    confirmText: '清除',
    confirmColor: '#c62828',
    success: (res) => {
      if (!res.confirm) return
      draftStore.clearAll()
      uni.showToast({ title: '已清除', icon: 'success' })
    },
  })
}
</script>

<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">
    <view class="content">

      <text class="page-title">设置</text>

      <!-- ── 用户资料 ── -->
      <view class="section-card">
        <text class="section-card__title">👤 我的资料</text>

        <!-- 单行：左侧头像（可点击更换） + 右侧昵称（可编辑） -->
        <view class="profile-row">
          <button
            class="profile-avatar-btn"
            open-type="chooseAvatar"
            @chooseavatar="onChooseAvatar"
          >
            <image
              v-if="avatarUrl"
              class="profile-avatar"
              :src="avatarUrl"
              mode="aspectFill"
            />
            <view v-else class="profile-avatar profile-avatar--empty">
              <text class="profile-avatar__icon">👤</text>
            </view>
          </button>
          <view class="profile-info">
            <text class="profile-info__hint">微信昵称</text>
            <input
              class="profile-info__input"
              type="nickname"
              :value="nickname"
              placeholder="点击填写"
              placeholder-class="profile-info__placeholder"
              @blur="onNicknameBlur"
            />
          </view>
          <text class="profile-arrow">›</text>
        </view>
      </view>

      <!-- ── 每日提醒 ── -->
      <view class="section-card">
        <text class="section-card__title">🔔 每日提醒时间</text>
        <view class="section-card__row">
          <text class="section-card__label">提醒时间</text>
          <picker
            mode="selector"
            :range="REMIND_HOURS"
            :value="remindIndex"
            @change="onRemindChange"
          >
            <view class="picker-value">
              <text>{{ remindTime }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
        <view class="section-card__row">
          <text class="section-card__label">推送状态</text>
          <text class="section-card__value" :class="{ 'section-card__value--active': profile?.subscribed }">
            {{ profile?.subscribed ? '✅ 已开启' : '未开启' }}
          </text>
        </view>
        <view class="section-card__row section-card__row--btn">
          <view class="outline-btn" @tap="requestSubscribe">
            <text>{{ profile?.subscribed ? '重新订阅' : '订阅每日推送通知' }}</text>
          </view>
        </view>
      </view>

      <!-- ── Streak 管理 ── -->
      <view class="section-card">
        <text class="section-card__title">🔥 连续打卡</text>
        <view class="section-card__row">
          <text class="section-card__label">当前连续</text>
          <text class="section-card__value">{{ profile?.streak ?? 0 }} 天</text>
        </view>
        <view class="section-card__row">
          <text class="section-card__label">补签机会</text>
          <text class="section-card__value">{{ profile?.streak_rescue ?? 0 }} 次（每月重置）</text>
        </view>
        <view class="section-card__row section-card__row--btn">
          <view
            class="outline-btn"
            :class="{ 'outline-btn--disabled': !canRescue }"
            @tap="goRescue"
          >
            <text>{{ canRescue ? `补签 ${pendingRescueDate}` : '暂无可补签的日期' }}</text>
          </view>
        </view>
      </view>

      <!-- ── 关于 ── -->
      <view class="section-card section-card--about">
        <text class="section-card__title">关于</text>

        <view class="section-card__row">
          <text class="section-card__label">版本</text>
          <text class="section-card__value">1.0.0</text>
        </view>

        <view class="section-card__row">
          <text class="section-card__label">开发者</text>
          <text class="section-card__value">LinChen</text>
        </view>

        <view class="section-card__row section-card__row--btn">
          <view class="outline-btn" @tap="goFeedback">
            <text>意见反馈</text>
          </view>
        </view>

        <view class="section-card__row section-card__row--btn">
          <view class="outline-btn" @tap="clearDrafts">
            <text>清除草稿缓存</text>
          </view>
        </view>

        <view class="about-footer">
          <text class="about-footer__quote">每天一道思考题，别让脑袋生锈 ✨</text>
          <text class="about-footer__copy">© 2026 别让你的脑生锈</text>
        </view>
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

.page-title {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  color: $ink;
  letter-spacing: -1rpx;
  margin-bottom: $space-md;
}

// ── 区块卡片 ────────────────────────────────
.section-card {
  background: $white;
  border-radius: $radius-lg;
  padding: $space-md;
  margin-bottom: $space-md;
  box-shadow: $shadow-sm;

  &__title {
    display: block;
    font-size: 26rpx;
    font-weight: 800;
    color: $ink;
    margin-bottom: $space-md;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;
    border-bottom: 1rpx solid $ink-5;

    &:last-child { border-bottom: none; }
    &--btn { border-bottom: none; padding-top: $space-sm; }
  }

  &__label {
    font-size: 28rpx;
    color: $ink-2;
    flex-shrink: 0;
  }

  &__value {
    font-size: 26rpx;
    color: $ink-3;
    font-weight: 600;
    max-width: 55%;
    text-align: right;

    &--active { color: $green; }
  }

  &--about .section-card__title { color: $ink-3; }
}

// ── 用户资料 ────────────────────────────────
.profile-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 6rpx 0;
}

.profile-avatar-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  padding: 0;
  border: none;
  background: none;
  flex-shrink: 0;
  overflow: hidden;

  &::after { display: none; }
  &:active { opacity: 0.75; }
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
  background: $paper;
  border: 2rpx solid $ink-5;

  &--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
  }
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;

  &__hint {
    font-size: 22rpx;
    color: $ink-4;
    line-height: 1;
  }

  &__input {
    width: 100%;
    min-height: 48rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: $ink;
  }
}

.profile-info__placeholder {
  color: $ink-4;
  font-weight: 400;
}

.profile-arrow {
  font-size: 40rpx;
  color: $ink-5;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 12rpx;
}

// ── 关于 ────────────────────────────────────
.about-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: $space-md 0 $space-sm;

  &__quote {
    font-size: 22rpx;
    font-weight: 400;
    color: $ink-3;
    line-height: 1.75;
    text-align: center;
    letter-spacing: 0.5rpx;
  }

  &__copy {
    font-size: 22rpx;
    color: $ink-4;
  }
}

// ── Picker ──────────────────────────────────
.picker-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: $ink-2;
  font-weight: 700;
}

.picker-arrow {
  font-size: 32rpx;
  color: $ink-4;
}

// ── 线框按钮 ────────────────────────────────
.outline-btn {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid $ink-5;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: $ink-2;
  font-weight: 600;
  transition: all $duration-fast;

  &:active { background: $paper; }

  &--disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}
</style>
