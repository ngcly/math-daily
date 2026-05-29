# 每日一题 · 微信小程序

> 每天一道思维题，让大脑不退化

---

## 项目结构

```
mathDaily/
├── src/
│   ├── pages/
│   │   ├── index/        # 今日一题（首页）
│   │   ├── draft/        # 草稿纸页（含补签模式）
│   │   ├── result/       # 解析页（提交后展示）
│   │   ├── review/       # 历史回顾页（查看过去的题目与解析）
│   │   ├── history/      # 历史记录（日历 + 列表）
│   │   └── settings/     # 设置（提醒时间、补签）
│   ├── components/
│   │   ├── SketchPad/    # 草稿纸画布（Canvas 2D，贝塞尔平滑）
│   │   ├── AnswerInput/  # 答题区（选择题 / 填空题自动切换）
│   │   ├── ResultBanner/ # 结果 Banner（正确率、用时、总答题数）
│   │   └── Calendar/     # 打卡日历（绿点=答对，红点=答错）
│   ├── custom-tab-bar/   # 自定义 TabBar（支持暗色模式图标切换）
│   ├── store/
│   │   ├── user.ts       # 用户状态（streak、补签、设置）
│   │   ├── question.ts   # 题目状态（加载、提交、缓存）
│   │   ├── draft.ts      # 草稿纸状态（本地存储）
│   │   └── theme.ts      # 主题状态（暗色模式、当前 Tab）
│   ├── api/
│   │   └── cloud.ts      # 云函数调用封装（统一错误处理）
│   ├── utils/
│   │   ├── date.ts       # 日期工具（dateToStr / today / formatDuration 等）
│   │   ├── answer.ts     # 答案判题工具（normalizeAnswer / checkFillAnswer）
│   │   ├── category.ts   # 分类副标题映射
│   │   ├── subscribe.ts  # 订阅消息工具
│   │   └── theme.ts      # 系统主题检测
│   ├── types/
│   │   └── index.ts      # 全局类型定义
│   └── uni.scss          # 全局样式变量（设计 Token）
├── cloudfunctions/
│   ├── getTodayQuestion/ # 获取今日题目（不含答案）
│   ├── getQuestionByDate/# 按日期获取题目（补签用）
│   ├── submitAnswer/     # 判题 + 写记录 + 更新统计
│   ├── initUser/         # 静默登录（首次自动创建用户）
│   ├── getUserHistory/   # 获取月度答题记录
│   ├── getHistoryDetail/ # 历史回顾（验证已提交后返回题目解析）
│   ├── updateSettings/   # 更新用户设置（白名单字段）
│   └── sendDailyPush/    # 定时推送（每小时触发）
├── questions.json        # 题目数据（每行一条 JSON，通过控制台导入）
└── README.md
```

---

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 安装微信开发者工具
# https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
```

### 2. 配置云开发

1. 在微信开发者工具中开通云开发
2. 复制环境 ID，替换 `src/App.vue` 中的云开发初始化配置
3. 替换 `src/manifest.json` 中的 `__YOUR_APPID__`

### 3. 创建云数据库集合

在云开发控制台创建三个集合：

| 集合名 | 权限 |
|--------|------|
| `questions` | 所有人可读，仅创建者可写 |
| `user_records` | 仅创建者可读写 |
| `user_profiles` | 仅创建者可读写 |

### 4. 导入题目数据

编辑 `questions.json`（每行一条 JSON 对象），在微信开发者工具 → 云开发控制台 → 数据库 → `questions` 集合 → 导入，选择该文件即可批量写入。

题目 JSON 格式：
```json
{
  "date": "2026-05-26",
  "category": "逻辑推理",
  "type": "choice",
  "difficulty": 3,
  "title": "题目标题",
  "body": "题目正文...",
  "options": [
    {"key": "A", "text": "选项一"},
    {"key": "B", "text": "选项二"},
    {"key": "C", "text": "选项三"},
    {"key": "D", "text": "选项四"}
  ],
  "answer": "A",
  "solution": "解题思路...",
  "aha_moment": "核心洞察...",
  "stats": {"total": 0, "correct": 0}
}
```

### 5. 部署云函数

在微信开发者工具中，右键点击 `cloudfunctions/` 下各目录 → 上传并部署（所有函数均需部署）。

### 6. 本地开发

```bash
npm run dev:mp-weixin
```

构建产物在 `dist/dev/mp-weixin/`，在微信开发者工具中导入该目录预览。

### 7. 申请订阅消息模板

1. 微信公众平台 → 功能 → 订阅消息
2. 申请模板，需包含字段：`thing1`（题目）、`thing2`（分类）、`phrase3`（状态）
3. 将模板 ID 同步更新到两处：
   - `src/utils/subscribe.ts` → `DAILY_SUBSCRIBE_TEMPLATE_ID`
   - `cloudfunctions/sendDailyPush/index.js` → `TEMPLATE_ID`

### 8. 配置定时触发器

在云开发控制台 → 云函数 → `sendDailyPush` → 定时触发器：

```
0 * * * * *    # 每小时整点触发
```

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 每日一题 | 按日期从云数据库取题，首页展示题目卡片 |
| 草稿纸 | 全屏 Canvas 手写演算，支持缩放/撤销/橡皮擦，自动保存本地 |
| 答题提交 | 选择题/填空题，答案在云端判题（不经过客户端），防止抓包获取答案 |
| 解析展示 | 提交后展示解题思路、核心洞察、常见陷阱、另一种解法 |
| 连续打卡 | 每日作答维护 streak，支持每月 1 次补签 |
| 历史回顾 | 历史页点击任意已答日期，可回顾题目原文 + 当时的作答 + 完整解析 |
| 订阅推送 | 用户订阅后，在设定时间收到当日题目的微信订阅消息 |
| 暗色模式 | 跟随系统，全局 CSS Token 切换，SketchPad 画笔颜色自动映射 |

---

## 数据模型速查

### questions（题目）
```typescript
{
  _id, date, category, type, difficulty,
  title, body, image_url?,
  options?,           // 选择题
  answer,             // ⚠️ 永远不返回给前端（getTodayQuestion / getQuestionByDate 排除此字段）
  answer_unit?,       // 填空题单位提示
  answer_variants?,   // 等价答案列表
  solution, aha_moment, alt_solution?, trap?,
  quote?,             // 每日题眼短句
  stats: { total, correct }
}
```

### user_records（答题记录）
```typescript
{
  _id, openid, question_id, date,
  title, category, type,
  selected?,          // 选择题用户选项
  fill_answer?,       // 填空题用户输入
  is_correct, time_spent,
  created_at
}
```

### user_profiles（用户设置）
```typescript
{
  _id,                // = openId
  remind_time,        // "08:00"
  subscribed,
  streak, streak_rescue,   // streak_rescue 每月重置为 1
  pref_categories, pref_difficulty,
  created_at
}
```

---

## 安全说明

- **答案保护**：`answer` 字段在 `getTodayQuestion` 和 `getQuestionByDate` 中通过 `.field({ answer: false })` 排除，前端无法通过抓包获取。判题在云函数 `submitAnswer` 服务端完成。
- **历史回顾安全门禁**：`getHistoryDetail` 先查询该用户在 `user_records` 中是否有该日提交记录，无记录则返回 404。只有已提交的题目才返回解析和正确答案。
- **设置写入白名单**：`updateSettings` 仅允许更新 `ALLOWED_FIELDS` 中的字段，防止意外覆盖 `_id`、`created_at` 等系统字段。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | uni-app + Vue 3 + TypeScript |
| 状态管理 | Pinia + pinia-plugin-unistorage |
| 后端 | 微信云开发（云函数 + 云数据库） |
| 草稿纸 | Canvas 2D API（贝塞尔曲线平滑） |
| 题目管理 | questions.json 手动维护，控制台导入 |
| 推送 | 微信订阅消息 |
