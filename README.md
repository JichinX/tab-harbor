# Tab Harbor

> 自定义新标签页 — 时钟、搜索、快捷导航、高频使用。Glassmorphism UI，零依赖。

一款轻量美观的 Chrome 新标签页扩展。替换默认新标签页，提供时钟、每日趣味问答、多引擎搜索、快捷导航网格（支持文件夹和拖拽排序）、高频使用站点追踪，以及暗色/浅色/跟随系统/日出日落自动四种主题模式。

![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **自定义新标签页** — 替换 Chrome 默认新标签页，简洁高效
- **实时时钟** — 大号时钟 + 日期 + 星期，一目了然
- **每日互动** — "每日一个为什么"与"每日一个脑筋急转弯"交替，点击查看答案
- **多引擎搜索** — 支持 Google / Bing / 百度 / DuckDuckGo 切换，输入 URL 自动跳转
- **快捷导航** — 最多 20 个快捷链接，支持文件夹分组和拖拽排序
- **拖入文件夹** — 管理面板中拖拽快捷链接到文件夹即可移入
- **图标自动获取** — 添加网站时自动通过 DuckDuckGo 获取 favicon，支持加载动画、失败回退、自定义文字/Emoji 和自定义图标 URL
- **高频使用** — 自动追踪访问频率最高的 30 个站点，支持搜索过滤和删除
- **四种主题** — 深色 / 浅色 / 跟随系统 / 日出日落自动（基于时区 + 太阳赤纬方程计算）
- **Popup 快捷添加** — 点击扩展图标，自动获取当前页面信息，一键添加到快捷导航（可选目标文件夹）
- **Glassmorphism UI** — 毛玻璃卡片 + 动态渐变背景 + 流畅动画
- **数据本地** — 所有数据存储在本地，无需登录，保护隐私
- **零依赖** — Manifest V3 + Vanilla JS，纯净轻量

## Install

### 从源码安装（开发者模式）

1. 下载或克隆本项目
   ```bash
   git clone https://github.com/JichinX/tab-harbor.git
   ```
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目的 `tab-harbor` 目录

### Chrome Web Store（即将上线）

> 准备中...

## Usage

### 新标签页

- 打开新标签页即可看到时钟、搜索栏、快捷导航和高频使用列表
- 按 `/` 快速聚焦搜索栏
- 搜索栏输入 URL（如 `github.com`）自动在新标签页打开
- 点击快捷导航卡片直接访问网站，文件夹卡片打开子列表
- 点击「管理」按钮进入管理面板，支持拖拽排序、编辑、删除、创建文件夹

### Popup

- 点击浏览器工具栏的 Tab Harbor 图标（或 `Cmd/Ctrl + Shift + E`）
- 自动获取当前标签页的标题和网址
- 三种图标模式：**自动获取**（DuckDuckGo favicon）、**文字**（自定义文字或 Emoji）、**自定义地址**（任意图片 URL）
- 自动检测重复网站、图标加载失败提示
- 可选择添加到根目录或指定文件夹

### 主题切换

点击新标签页右上角的主题按钮，依次切换：

| 模式 | 图标 | 说明 |
|------|------|------|
| 深色 | 🌙 | 固定深色主题 |
| 浅色 | ☀️ | 固定浅色主题 |
| 跟随系统 | 🖥️ | 根据 `prefers-color-scheme` 自动切换 |
| 日出日落 | 🌅 | 基于时区和太阳赤纬方程，日出后浅色、日落后深色 |

## Tech Stack

- **Manifest V3** — Chrome 最新扩展标准
- **Service Worker** — 按需唤醒，低内存占用，所有数据操作集中处理
- **chrome.storage API** — 本地数据持久化
- **DuckDuckGo Favicon API** — `https://icons.duckduckgo.com/ip3/{domain}.ico` 获取网站图标
- **Vanilla JS** — 零依赖，轻量纯净
- **Glassmorphism CSS** — backdrop-filter 毛玻璃 + 动态渐变 + 流畅过渡

## Project Structure

```
tab-harbor/
├── manifest.json              # 扩展配置（MV3）
├── icon.svg                   # 扩展图标源文件（SVG）
├── background/
│   └── service-worker.js      # Service Worker（核心逻辑、消息处理）
├── newtab/
│   ├── newtab.html            # 新标签页 HTML
│   ├── newtab.css             # 新标签页样式（Glassmorphism）
│   └── newtab.js              # 新标签页逻辑（纯 UI 渲染层）
├── popup/
│   ├── popup.html             # Popup 页面（420×580）
│   ├── popup.css              # Popup 样式
│   └── popup.js               # Popup 逻辑
├── icons/
│   ├── icon16.png             # 16×16 扩展图标
│   ├── icon48.png             # 48×48 扩展图标
│   ├── icon128.png            # 128×128 扩展图标
│   ├── icon.svg               # 图标 SVG 备份
│   └── generate-icons.html    # 图标生成工具
├── test/
│   ├── mock-chrome.js         # Chrome API mock
│   └── newtab-test.html       # 本地测试页面
├── README.md
├── LICENSE
└── .gitignore
```

## Architecture

```
┌─────────────┐   sendMessage   ┌──────────────────┐
│  newtab.js  │ ──────────────→ │  service-worker   │
│  (UI 层)    │ ←────────────── │  (核心逻辑层)      │
└─────────────┘                 │                    │
                                │  loadData          │
┌─────────────┐   sendMessage   │  addShortcut       │
│  popup.js   │ ──────────────→ │  removeShortcut    │
│  (UI 层)    │ ←────────────── │  updateSettings    │
└─────────────┘                 │  ...               │
                                └────────┬──────────┘
                                         │
                                  chrome.storage.local
```

newtab.js 和 popup.js 都是纯 UI 渲染层，不直接读写 chrome.storage，所有数据操作通过 `chrome.runtime.sendMessage` 由 Service Worker 统一处理。

## Keyboard Shortcuts

| 快捷键 | 功能 |
|--------|------|
| `/` | 聚焦搜索栏 |
| `Enter` | 提交搜索 / 确认表单 |
| `Escape` | 关闭弹窗 / 清除搜索 |
| `Space` / `Enter` | 展开每日问答答案（焦点在问题上时） |

## License

[MIT](LICENSE)
