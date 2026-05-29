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
- `store/user.ts` — `UserProfile`, streak logic, cross-day detection, debounced cloud sync
- `store/question.ts` — today's question, submit flow, cross-day answered guard (persists `hasSubmitted` + `submittedDate`)
- `store/draft.ts` — stroke data CRUD in wx.Storage; auto-cleans drafts older than 30 days

**Pages** (routed via `src/pages.json`, 3-tab tabBar):
- `pages/index/` — home, today's question card + streak pill
- `pages/draft/` — full-screen `SketchPad` + floating question card + slide-up answer drawer
- `pages/result/` — post-submit: `ResultBanner`, solution, aha-moment, share button
- `pages/history/` — `Calendar` component with monthly answer history
- `pages/settings/` — reminder time, category/difficulty prefs, streak rescue

**Key components:**
- `components/SketchPad/` — Canvas 2D with Bézier smoothing, pinch-zoom/pan, undo/redo, dot-grid background. Uses incremental `drawLatestSegment` during `touchmove` and full `redrawAll` only on touch end for performance.
- `components/AnswerInput/` — polymorphic: renders 4-option choice cards OR free-form number/text input based on `question.type`
- `components/Calendar/` — monthly grid; green dot = correct, red dot = wrong

**API layer** (`src/api/cloud.ts`): thin wrappers over `wx.cloud.callFunction` for all 5 cloud functions.

**Utilities:**
- `utils/date.ts` — `today()`, `formatDisplayDate()`, `isConsecutiveDay()`, `formatDuration()`, `daysInMonth()`
- `utils/answer.ts` — `normalizeAnswer()` + `checkFillAnswer()` handling %, fractions, units

**Types:** All TypeScript interfaces (`Question`, `UserProfile`, `UserRecord`, `Stroke`, …) are in `src/types/index.ts`.

**Global design tokens** (colors, spacing, typography, shadows, radii, transitions) live in `src/uni.scss`.

### Backend (`cloudfunctions/`)

| Function | Purpose |
|---|---|
| `getTodayQuestion` | Fetches today's question — **never** includes the `answer` field |
| `submitAnswer` | Grades answer server-side, writes `user_records`, atomically increments `questions.stats`, returns solution |
| `initUser` | Silent login — finds or creates `user_profiles` doc by openId |
| `getUserHistory` | Returns one month of `user_records` for the calendar |
| `sendDailyPush` | Cron (hourly): batch-sends WeChat Subscription Messages to users whose `remind_time` matches current hour |

Cloud database collections: `questions` (read: all, write: creator), `user_records` (read+write: creator), `user_profiles` (read+write: creator).

### Key Design Decisions

- **Answer security**: `answer` is never returned by `getTodayQuestion`; only returned as `correct_answer` post-submission by `submitAnswer`.
- **Streak rescue**: 1 rescue per month per user (`user_profiles.streak_rescue`); streak gaps are detected on app `onShow`.
- **Draft persistence**: Strokes serialized to wx.Storage as `draft_{questionId}`; max 30 drafts retained.
- **WeChat AppID**: The placeholder `__YOUR_APPID__` in `src/manifest.json` must be replaced with a real AppID before building.