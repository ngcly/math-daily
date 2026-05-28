# 每日一题 · 微信小程序

> 每天一道思维题，让大脑不退化

---

## 项目结构

```
mathDaily/
├── src/
│   ├── pages/
│   │   ├── index/        # 今日一题（首页）
│   │   ├── draft/        # 草稿纸页
│   │   ├── result/       # 解析页
│   │   ├── history/      # 历史记录
│   │   └── settings/     # 设置
│   ├── components/
│   │   ├── SketchPad/    # 草稿纸画布（核心）
│   │   ├── QuestionCard/ # 题目卡片
│   │   ├── AnswerInput/  # 答题区（选择/填空）
│   │   ├── ResultBanner/ # 结果 Banner
│   │   └── Calendar/     # 打卡日历
│   ├── store/
│   │   ├── user.ts       # 用户状态（streak、设置）
│   │   ├── question.ts   # 题目状态（加载、提交）
│   │   └── draft.ts      # 草稿纸状态（本地存储）
│   ├── api/
│   │   └── cloud.ts      # 云函数调用封装
│   ├── utils/
│   │   ├── date.ts       # 日期工具
│   │   └── answer.ts     # 答案判题工具
│   ├── types/
│   │   └── index.ts      # 全局类型定义
│   └── uni.scss          # 全局样式变量
├── cloudfunctions/
│   ├── getTodayQuestion/ # 获取今日题目（不含答案）
│   ├── submitAnswer/     # 判题 + 写记录
│   ├── getUserHistory/   # 获取历史记录
│   ├── sendDailyPush/    # 定时推送（每小时触发）
│   └── syncFromNotion/   # Notion 题库同步脚本
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
2. 复制环境 ID，替换 `src/App.vue` 中的 `__YOUR_ENV_ID__`
3. 替换 `src/manifest.json` 中的 `__YOUR_APPID__`

### 3. 创建云数据库集合

在云开发控制台创建三个集合：
- `questions`：权限设置为"仅创建者可写，所有人可读"
- `user_records`：权限设置为"仅创建者可读写"
- `user_profiles`：权限设置为"仅创建者可读写"

### 4. 配置 Notion 题库同步

```bash
# 创建 .env 文件
echo "NOTION_TOKEN=secret_xxx" > .env
echo "NOTION_DB_ID=xxx" >> .env

# 运行同步脚本
npm run sync-notion
```

Notion 数据库需包含以下字段：
| 字段名 | 类型 | 说明 |
|--------|------|------|
| 题目标题 | 标题 | 题目名称 |
| 发布日期 | 日期 | "2026-05-26" |
| 分类 | 单选 | 逻辑推理/空间想象/... |
| 题型 | 单选 | choice / fill_number |
| 难度 | 数字 | 1-5 |
| 题目正文 | 文本 | 题目内容 |
| 选项(A\|B\|C\|D格式) | 文本 | "A.选项一\|B.选项二\|..." |
| 正确答案 | 文本 | "A" 或数字 |
| 等价答案(逗号分隔) | 文本 | "0.5,50%" |
| 单位 | 文本 | "个" |
| 解题思路 | 文本 | 解析内容 |
| 啊哈时刻 | 文本 | 一句核心洞察 |
| 另一种解法 | 文本 | 可选 |
| 已审核 | 勾选框 | 勾选后才会同步 |

### 5. 本地开发

```bash
# 编译并在微信开发者工具中预览
npm run dev:mp-weixin
```

### 6. 申请订阅消息模板

1. 微信公众平台 → 功能 → 订阅消息
2. 申请模板，包含字段：thing1（题目）、thing2（分类）、phrase3（状态）
3. 将模板 ID 替换 `cloudfunctions/sendDailyPush/index.js` 中的 `__YOUR_TEMPLATE_ID__`

### 7. 配置定时触发器

在云开发控制台 → 云函数 → sendDailyPush → 定时触发器：
```
0 * * * * *    # 每小时整点触发
```

---

## 开发顺序（推荐）

```
Step 1  草稿纸 Demo          src/components/SketchPad/
        单独调试，不依赖接口

Step 2  云函数 getTodayQuestion
        + 首页题目展示

Step 3  云函数 submitAnswer
        + AnswerInput 组件
        + 解析页

Step 4  Streak 打卡
        + 历史记录日历

Step 5  订阅消息推送
        + sendDailyPush 云函数

Step 6  分享图生成
        + 上线
```

---

## 数据模型速查

### questions（题目，由 Notion 同步）
```typescript
{
  _id, date, category, type, difficulty,
  title, body, image_url?,
  options?,          // 选择题
  answer_unit?,      // 填空题单位
  solution, aha_moment, alt_solution?,
  stats: { total, correct },
  // 预留（终极形态）
  thought_prompt?, ai_grading_rubric?, answer_variants?
}
// ⚠️ answer 字段永远不返回给前端
```

### user_records（答题记录）
```typescript
{
  _id, openid, question_id, date,
  title, category, type,
  selected?, fill_answer?,
  is_correct, time_spent,
  // 预留（终极形态）
  user_thought?, ai_feedback?,
  created_at
}
```

### user_profiles（用户设置）
```typescript
{
  _id,           // = openId
  remind_time,   // "08:00"
  subscribed,
  streak, streak_rescue,
  pref_categories, pref_difficulty,
  created_at
}
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | uni-app + Vue 3 + TypeScript |
| 状态管理 | Pinia + pinia-plugin-unistorage |
| 后端 | 微信云开发（云函数 + 云数据库 + 云存储） |
| 草稿纸 | Canvas 2D API |
| 题库管理 | Notion + 同步脚本 |
| 推送 | 微信订阅消息 |
