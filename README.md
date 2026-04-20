# 智能求职助手 (ZhiPin Helper)

Boss直聘自动化投递浏览器插件，支持智能筛选和AI辅助投递。

## 功能特性

- **薪资范围筛选** - 支持快捷预设和自定义输入，单位为K（千元）
- **公司黑名单** - 排除特定公司（如外包、不良企业）
- **工作内容匹配** - 关键字包含/排除筛选
- **公司规模筛选** - 选择合适的企业规模范围
- **学历要求筛选** - 过滤不符合学历要求的岗位
- **Boss活跃度过滤** - 过滤不活跃的Boss/职位
- **自定义AI模型** - 支持国内主流AI模型（通义千问、DeepSeek、Kimi等）
- **智能问候语** - 根据岗位JD自动生成个性化打招呼内容
- **自动回复消息** - AI自动回复HR的消息
- **反调试保护** - 绕过Boss直聘的开发者工具检测机制

## 技术栈

- **框架**: WXT (浏览器插件开发框架)
- **UI**: React + Tailwind CSS v4
- **语言**: TypeScript
- **存储**: Chrome Storage API

## 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build        # Chrome
npm run build:firefox  # Firefox
```

### 打包发布

```bash
npm run zip          # Chrome
npm run zip:firefox  # Firefox
```

## 安装使用

1. 运行 `npm run build` 构建插件
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `.output/chrome-mv3` 目录

## 配置说明

### 筛选配置

在插件弹窗的"筛选"标签页中配置：
- **薪资范围**: 点击预设按钮快速选择，或手动输入数值（单位K）
  - 示例：输入 10 表示 10K = 1万元/月
  - 输入 15-20 表示期望薪资 15K-20K
- **Boss活跃时间**: 点击预设按钮或手动输入小时数
  - 不限：投递所有职位
  - 今日：只投递今日活跃的Boss
  - 3日内：Boss在72小时内活跃过
  - 本周：Boss在168小时内活跃过
- **公司规模**: 选择企业人数范围
- **学历要求**: 多选符合的学历要求
- **工作内容关键字**: 包含/排除的关键字筛选

### AI配置

在"AI配置"标签页中配置：
1. 选择AI提供商（通义千问、DeepSeek、Kimi等）
2. 输入API Key
3. 选择模型版本

### 简历设置

在"设置"标签页中：
- 粘贴简历内容（用于生成个性化问候语）
- 配置公司黑名单
- 启用/禁用自动投递

## 支持的AI模型

| 提供商 | 模型 |
|--------|------|
| 通义千问 | qwen-turbo, qwen-plus, qwen-max |
| DeepSeek | deepseek-chat, deepseek-coder |
| Kimi | moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k |
| 文心一言 | eb-instant, eb, eb-4 |
| 智谱AI | glm-4, glm-4-flash, glm-3-turbo |

## 调试方法

Boss直聘有反调试机制，打开F12会导致页面闪烁退出。推荐以下调试方式：

### 方法1：使用扩展后台页面

```
1. chrome://extensions/
2. 找到「智能求职助手」
3. 点击「service worker: background.js」链接
4. 在打开的DevTools中查看日志输出
```

日志格式：
```
[智能求职助手] Background 已启动
[Content Script] Content Script 已加载
[职位数据] 已更新: 10 个职位
[职位示例] {title: "前端开发工程师", salary: "15-25K", ...}
```

### 方法2：先打开DevTools再进入页面

```
1. 打开空白标签页
2. 按 F12 打开 DevTools
3. 保持 DevTools 打开
4. 在地址栏输入 Boss直聘网址
5. 观察页面是否稳定
```

## 注意事项

- 本插件仅读取页面DOM数据，不调用后台API
- 使用**动态特征匹配**技术识别职位信息，不依赖固定class名
- 已内置反调试保护，可绕过Boss的开发者工具检测
- 建议设置合理的投递间隔（5-10秒），避免被检测
- AI功能需要用户提供自己的API Key
- 数据存储在本地，不上传服务器

## 数据抓取原理

本插件采用**动态特征匹配**方式识别职位信息，原理如下：

| 字段 | 匹配规则 |
|------|----------|
| **职位链接** | href 包含 `/job/` 的 `<a>` 元素 |
| **薪资** | 文本匹配 `\d+-\d+K` 或 `\d+K` 格式 |
| **公司** | href 包含 `/gongsi/` 的链接，或文本特征推断 |
| **学历** | 文本包含 "本科/硕士/博士/大专" |
| **经验** | 文本包含 "经验/应届/\d+年" |
| **Boss活跃** | 文本包含 "刚刚/今日/本周/活跃" |

这种方式的优点：
- 页面结构变化时仍能工作
- 不依赖具体的CSS class名称
- 通过内容特征智能识别元素

## 备选方案：截图+LLM视觉识别（未实现）

当DOM抓取方案不可行时，可考虑以下备选方案：

### 方案原理

```
┌─────────────────────────────────────────────┐
│  工作流程                                    │
├─────────────────────────────────────────────┤
│  1. Content Script 截取页面截图              │
│  2. 发送截图到 Background                    │
│  3. Background 调用 LLM 视觉模型 API          │
│  4. LLM 返回职位卡片坐标和内容                │
│  5. Content Script 模拟点击对应位置          │
└─────────────────────────────────────────────┘
```

### Prompt 示例

```text
这是一张Boss直聘职位列表页面的截图。
请识别所有职位卡片的位置，返回JSON格式：
[
  {
    "index": 1,
    "x": 200,    // 卡片中心X坐标
    "y": 150,    // 卡片中心Y坐标  
    "title": "前端开发工程师",
    "salary": "15-25K",
    "company": "XX公司",
    "bossActive": "今日活跃"
  },
  ...
]
只返回JSON，不要其他说明。
```

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **DOM动态匹配**（当前） | 无额外成本、速度快 | 可能因页面结构变化失效 |
| **截图+LLM识别**（备选） | 不依赖DOM、适应性强 | API成本高、延迟大 |

### 适用场景

截图+LLM方案适合以下情况：
- DOM结构大幅改版，无法通过特征匹配识别
- 需要理解复杂页面布局（如推荐页、详情页）
- 需要模拟更真实的人类操作行为

### 成本估算

| LLM视觉模型 | 单次识别成本 | 说明 |
|-------------|-------------|------|
| DeepSeek VL | ~0.01元 | 性价比高 |
| 通义千问 VL | ~0.02元 | 阿里云服务 |
| GPT-4V | ~0.05元 | 最贵但最准确 |

每页识别约消耗几分钱，高频使用成本较高。

### 支持的视觉模型

- DeepSeek Vision
- 通义千问 VL (qwen-vl-plus, qwen-vl-max)
- Claude Vision (需海外API)
- GPT-4V (需海外API)

## 项目结构

```
zhi-pin-helper/
├── entrypoints/
│   ├── popup/              # 弹窗界面
│   │   ├── index.html      # HTML入口
│   │   ├── main.tsx        # React入口
│   │   ├── App.tsx         # 主组件
│   │   └── style.css       # 样式文件
│   ├── content/            # Content Script (页面监听)
│   │   └── index.ts        # DOM数据抓取 + 反调试保护
│   └── background/         # Background Service Worker
│       └── index.ts        # AI调用、筛选逻辑、日志处理
├── components/             # React 组件
│   ├── FilterPanel.tsx     # 筛选配置面板（含薪资预设）
│   ├── SettingsPanel.tsx   # 设置面板
│   └── AIConfigPanel.tsx   # AI配置面板
├── utils/
│   ├── types.ts            # TypeScript类型定义
│   └── storage.ts          # Chrome Storage封装
├── wxt.config.ts           # WXT配置文件
├── tailwind.config.ts      # Tailwind配置
├── tsconfig.json           # TypeScript配置
├── postcss.config.js       # PostCSS配置
├── package.json            # 项目依赖
├── .gitignore              # Git忽略文件
└── README.md               # 项目文档
```

## 开发进度

### Phase 1: 项目基础 (已完成)

| 任务 | 状态 | 说明 |
|------|------|------|
| 初始化WXT项目框架 | ✅ 完成 | 配置 TypeScript + React + Tailwind CSS v4 |
| Popup UI基础结构 | ✅ 完成 | 三标签页布局（筛选/设置/AI配置） |
| 配置存储功能 | ✅ 完成 | Chrome Storage API封装 |
| 职位筛选逻辑 | ✅ 完成 | 薪资/学历/公司规模/黑名单/活跃度筛选 |
| AI模型配置界面 | ✅ 完成 | 支持国内5大AI提供商 |
| Content Script数据抓取 | ✅ 完成 | 动态特征匹配识别职位信息 |
| 薪资输入优化 | ✅ 完成 | 快捷预设按钮 + 字符串输入保留格式 |
| Boss活跃时间优化 | ✅ 完成 | 快捷预设按钮 + 字符串输入修复 |
| 反调试保护 | ✅ 完成 | 绕过Boss直聘DevTools检测机制 |
| 调试日志系统 | ✅ 完成 | Content Script日志发送到Background显示 |

### Phase 2: AI功能集成 (待开发)

| 任务 | 状态 | 说明 |
|------|------|------|
| 简历解析与存储 | ⏳ 待开发 | 用户简历内容管理 |
| 智能问候语生成 | ⏳ 待开发 | 基于岗位JD + 用户简历生成 |
| 自动回复消息功能 | ⏳ 待开发 | AI自动回复HR消息 |
| Prompt模板管理 | ⏳ 待开发 | 可自定义问候语模板 |

### Phase 3: 高级筛选与自动化 (待开发)

| 任务 | 状态 | 说明 |
|------|------|------|
| 批量投递功能 | ⏳ 待开发 | 自动批量投递符合条件的职位 |
| 投递历史记录 | ⏳ 待开发 | 记录投递历史和统计 |
| 防检测机制增强 | ⏳ 待开发 | 随机延迟、模拟人类行为 |
| 职位详情抓取 | ⏳ 待开发 | 点击职位卡片获取JD详情 |

### Phase 4: 优化与完善 (待开发)

| 任务 | 状态 | 说明 |
|------|------|------|
| 性能优化 | ⏳ 待开发 | 缓存、懒加载 |
| 错误处理 | ⏳ 待开发 | 完善错误处理和日志 |
| Chrome Web Store上架 | ⏳ 待开发 | 准备上架素材和隐私政策 |

## License

MIT