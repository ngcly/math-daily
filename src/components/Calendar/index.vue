<script setup lang="ts">
/**
 * Calendar 打卡日历组件
 * 展示当月每天是否完成，点击可查看当天题目
 */
import { ref, computed, watch } from 'vue'
import type { UserRecord } from '@/types'
import { daysInMonth, firstDayOfMonth, today } from '@/utils/date'

const props = defineProps<{
  year:    number
  month:   number           // 1-12
  records: UserRecord[]     // 当月答题记录
}>()

const emit = defineEmits<{
  dayClick: [date: string]
  prevMonth: []
  nextMonth: []
}>()

const todayStr = today()

// 该月天数 & 第一天是星期几（0=日 ~ 6=六）
const totalDays   = computed(() => daysInMonth(props.year, props.month))
const startWeekday = computed(() => firstDayOfMonth(props.year, props.month).getDay())

// 已完成日期 Set（快速查找）
const doneDates = computed(() => {
  const set = new Set<string>()
  props.records.forEach(r => set.add(r.date))
  return set
})

// 已答对日期 Set
const correctDates = computed(() => {
  const set = new Set<string>()
  props.records.filter(r => r.is_correct).forEach(r => set.add(r.date))
  return set
})

// 构建日历格子（前补空格）
interface CalDay {
  day:     number | null   // null = 占位空格
  dateStr: string
  isDone:  boolean
  isCorrect: boolean
  isToday: boolean
  isFuture: boolean
}

const calDays = computed<CalDay[]>(() => {
  const cells: CalDay[] = []

  // 前置空格
  for (let i = 0; i < startWeekday.value; i++) {
    cells.push({ day: null, dateStr: '', isDone: false, isCorrect: false, isToday: false, isFuture: false })
  }

  for (let d = 1; d <= totalDays.value; d++) {
    const dateStr = `${props.year}-${String(props.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({
      day:       d,
      dateStr,
      isDone:    doneDates.value.has(dateStr),
      isCorrect: correctDates.value.has(dateStr),
      isToday:   dateStr === todayStr,
      isFuture:  dateStr > todayStr,
    })
  }
  return cells
})

// 月份标题
const monthLabel = computed(() =>
  `${props.year} 年 ${props.month} 月`
)

// 本月完成率
const completionRate = computed(() => {
  const passedDays = calDays.value.filter(c => c.day && !c.isFuture).length
  if (passedDays === 0) return 0
  return Math.round((doneDates.value.size / passedDays) * 100)
})

function onDayTap(cell: CalDay) {
  if (!cell.day || cell.isFuture || !cell.isDone) return
  emit('dayClick', cell.dateStr)
}
</script>

<template>
  <view class="calendar">

    <!-- 月份导航 -->
    <view class="calendar__header">
      <view class="calendar__nav" @tap="emit('prevMonth')">
        <text class="calendar__nav-icon">‹</text>
      </view>
      <view class="calendar__month-wrap">
        <text class="calendar__month">{{ monthLabel }}</text>
        <text class="calendar__rate">完成率 {{ completionRate }}%</text>
      </view>
      <view class="calendar__nav" @tap="emit('nextMonth')">
        <text class="calendar__nav-icon">›</text>
      </view>
    </view>

    <!-- 星期标题 -->
    <view class="calendar__weekdays">
      <text v-for="w in ['日','一','二','三','四','五','六']" :key="w" class="calendar__wd">
        {{ w }}
      </text>
    </view>

    <!-- 日期格子 -->
    <view class="calendar__grid">
      <view
        v-for="(cell, i) in calDays"
        :key="i"
        class="calendar__cell"
        :class="{
          'calendar__cell--empty':   !cell.day,
          'calendar__cell--today':    cell.isToday,
          'calendar__cell--done':     cell.isDone && !cell.isToday,
          'calendar__cell--correct':  cell.isCorrect && !cell.isToday,
          'calendar__cell--future':   cell.isFuture,
          'calendar__cell--tappable': cell.isDone && !cell.isFuture,
        }"
        @tap="onDayTap(cell)"
      >
        <text class="calendar__day">{{ cell.day ?? '' }}</text>
        <!-- 答对绿点 -->
        <view v-if="cell.isDone && !cell.isToday" class="calendar__dot"
          :class="cell.isCorrect ? 'calendar__dot--green' : 'calendar__dot--red'"
        />
      </view>
    </view>

  </view>
</template>

<style lang="scss">

.calendar {
  background: $white;
  border-radius: $radius-lg;
  padding: 24rpx;
  box-shadow: $shadow-sm;

  // ── 月份导航 ──────────────────────────────
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-md;
  }

  &__nav {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-sm;
    background: $paper;

    &:active { background: $ink-5; }
  }

  &__nav-icon {
    font-size: 36rpx;
    color: $ink-3;
    line-height: 1;
  }

  &__month-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
  }

  &__month {
    font-size: 28rpx;
    font-weight: 800;
    color: $ink;
  }

  &__rate {
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 500;
  }

  // ── 星期标题 ──────────────────────────────
  &__weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    margin-bottom: 8rpx;
  }

  &__wd {
    font-size: 20rpx;
    color: $ink-4;
    font-weight: 700;
    padding: 4rpx 0;
  }

  // ── 日期格子 ──────────────────────────────
  &__grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4rpx;
  }

  &__cell {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: $radius-sm;
    position: relative;
    gap: 3rpx;
    transition: background $duration-fast;

    &--done     { background: $green-light; }
    &--today    { background: $ink; }
    &--future   { opacity: 0.3; }
    &--tappable:active { opacity: 0.7; }
    &--empty    { pointer-events: none; }
  }

  &__day {
    font-size: 22rpx;
    font-weight: 700;
    color: $ink-2;

    .calendar__cell--today &   { color: $white; }
    .calendar__cell--done &    { color: $green; }
    .calendar__cell--future &  { color: $ink-4; }
  }

  &__dot {
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;

    &--green { background: $green; }
    &--red   { background: $red; }
  }
}
</style>
