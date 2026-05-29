# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mathDaily (每日一题)** is a WeChat Mini Program built with uni-app + Vue 3 + TypeScript. It presents one brain-training math/logic puzzle per day, backed by WeChat Cloud Development (cloud functions + database + storage).

## Commands

```bash
npm install               # Install dependencies
npm run dev:mp-weixin     # Compile and watch for WeChat Mini Program (use with WeChat DevTools)
npm run build:mp-weixin   # Production build
```

题目维护：编辑 `questions.jsonl`（每行一条 JSON），通过微信开发者工具云数据库控制台直接导入到 `questions` 集合。

No test or lint commands are configured. Node >= 16.0.0 is required.

> After building, open the `dist/dev/mp-weixin/` output directory in WeChat DevTools to preview.

### Dependency pinning

The dcloudio packages use a **`vue3` dist-tag** for their Vue 3 builds. The `"*"` wildcard resolves to the `latest` tag which is a Vue 2 prerelease — always use the exact pinned versions in `package.json`:
- `@dcloudio/uni-app`, `@dcloudio/uni-mp-weixin`, and `@dcloudio/vite-plugin-uni` → `3.0.0-alpha-5010120260525001`
- `vue` → `^3.4.21` — must be an explicit dependency; `@vitejs/plugin-vue` (bundled in `vite-plugin-uni`) requires it at runtime
- `vite` → `^5.2.8` (Vite 6+ breaks the dcloudio peer dependency)
- Do **not** add `@vitejs/plugin-vue` directly — `vite-plugin-uni` bundles it internally.
- `@dcloudio/uni-mp-weixin` **must** be a direct dependency — without it, Vite falls back to looking for `index.html` and the mp-weixin build fails.

## Architecture

### Frontend (`src/`)

**State management** (Pinia + `pinia-plugin-unistorage` for wx.Storage auto-persistence):
- `store/user.ts` — `UserProfile`, streak logic, cross-day detection, debounced cloud sync. `checkStreak()` is called both in `App.vue onShow` AND at the end of `init()` to handle the async race where `onShow` fires before `initUser` completes.
- `store/question.ts` — today's question, submit flow, cross-day answered guard (persists `hasSubmitted` + `submittedDate`). Uses stale-while-revalidate: serves local cache immediately, refreshes in background.
- `store/draft.ts` — stroke data CRUD in `uni.Storage` (always use `uni.*` not `wx.*` for consistency); auto-cleans drafts older than 30 entries.
- `store/theme.ts` — system dark/light mode detection, current tab index for custom tab bar.

**Pages** (routed via `src/pages.json`, 3-tab tabBar):
- `pages/index/` — home, today's question card + streak pill + weekly strip
- `pages/draft/` — full-screen `SketchPad` + floating question card + slide-up answer drawer. Also handles rescue mode (`?rescue_date=YYYY-MM-DD`).
- `pages/result/` — post-submit: `ResultBanner`, solution, aha-moment, share button, subscribe prompt
- `pages/history/` — `Calendar` component with monthly answer history; list items tap to `pages/review/`
- `pages/review/` — history replay: loads question + solution via `getHistoryDetail`, shows the user's past answer alongside the full solution breakdown. Reuses `ResultBanner` with a synthetic `SubmitResult`.
- `pages/settings/` — reminder time, streak rescue entry point

**Key components:**
- `components/SketchPad/` — Canvas 2D with Bézier smoothing, pinch-zoom/pan, undo/redo, dot-grid background. Uses incremental `drawLatestSegment` during `touchmove` and full `redrawAll` only on touch end and on eraser `touchstart`.
- `components/AnswerInput/` — polymorphic: renders 4-option choice cards OR free-form number/text input based on `question.type`
- `components/Calendar/` — monthly grid; green dot = correct, red dot = wrong; emits `dayClick` which history page wires to review navigation
- `components/ResultBanner/` — correct/wrong banner + stats (global correct rate, time spent, total submissions)
- `custom-tab-bar/` — custom tab bar that reads dark mode from `themeStore` and swaps icon variants

**API layer** (`src/api/cloud.ts`): thin wrappers over `wx.cloud.callFunction` for all cloud functions. All calls go through `callCloud<T>()` which throws on non-zero `result.code`.

**Utilities:**
- `utils/date.ts` — `dateToStr(d)`, `today()`, `formatDisplayDate()`, `isConsecutiveDay()`, `formatDuration()`, `daysInMonth()`, `firstDayOfMonth()`. Always use `dateToStr()` for `Date → 'YYYY-MM-DD'` conversion — do not inline the format string.
- `utils/answer.ts` — `normalizeAnswer()` + `checkFillAnswer()` handling %, fractions, units
- `utils/category.ts` — `CATEGORY_SUBTITLE` map (Category → short description string)
- `utils/subscribe.ts` — `requestDailySubscribe()`, `showSubscribeStatusToast()`, exports `DAILY_SUBSCRIBE_TEMPLATE_ID`
- `utils/theme.ts` — `getSystemIsDark()` with fallback chain for WeChat API version differences

**Types:** All TypeScript interfaces (`Question`, `UserProfile`, `UserRecord`, `HistoryDetail`, `Stroke`, …) are in `src/types/index.ts`.

**Global design tokens** (colors, spacing, typography, shadows, radii, transitions) live in `src/uni.scss`. Dark mode overrides via CSS `@media (prefers-color-scheme: dark)` on `page` selector in `App.vue`.

### Backend (`cloudfunctions/`)

| Function | Purpose |
|---|---|
| `getTodayQuestion` | Fetches today's question — **never** includes the `answer` field |
| `getQuestionByDate` | Fetches a question by date (rescue flow) — same field exclusions as above |
| `submitAnswer` | Grades answer server-side, writes `user_records`, atomically increments `questions.stats`, returns solution |
| `initUser` | Silent login — finds or creates `user_profiles` doc by openId |
| `getUserHistory` | Returns one month of `user_records` for the calendar; uses proper month-end date calculation |
| `getHistoryDetail` | History replay — verifies the user has a `user_records` entry for that date, then returns the full question (with solution fields) + the record + `correct_answer`. Safe to return answer because submission already exists. |
| `updateSettings` | Updates whitelisted fields on `user_profiles` (streak, remind_time, prefs, subscribed) |
| `sendDailyPush` | Cron (hourly): batch-sends WeChat Subscription Messages to users whose `remind_time` matches current hour |

Cloud database collections: `questions` (read: all, write: creator), `user_records` (read+write: creator), `user_profiles` (read+write: creator).

### Key Design Decisions

- **Answer security**: `answer` is never returned by `getTodayQuestion` or `getQuestionByDate`. `submitAnswer` returns it as `correct_answer` post-grading. `getHistoryDetail` also returns `correct_answer` — this is safe because the user's record proves they already submitted.
- **Streak rescue**: 1 rescue per month per user (`user_profiles.streak_rescue`); streak gaps are detected in `checkStreak()` which runs in both `App.vue onShow` AND after `initUser` resolves (to handle the async race on first launch).
- **Draft persistence**: Strokes serialized to `uni.Storage` as `draft_{questionId}`; max 30 drafts retained. Always use `uni.*` storage APIs (not `wx.*`) for consistency with the rest of the codebase.
- **History replay**: `getHistoryDetail` is a security-gated endpoint — it checks `user_records` before returning solutions, preventing users from fetching answers without submitting.
- **WeChat AppID**: The placeholder `__YOUR_APPID__` in `src/manifest.json` must be replaced with a real AppID before building.
- **Template ID**: `DAILY_SUBSCRIBE_TEMPLATE_ID` in `src/utils/subscribe.ts` and `TEMPLATE_ID` in `cloudfunctions/sendDailyPush/index.js` must be kept in sync — they are separate copies of the same value.
