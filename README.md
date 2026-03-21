# Tab Harbor 🚢

> One click to save all your tabs, free up memory, and restore them anytime. Your tab harbor.

一款轻量、美观的 Chrome 标签页管理扩展。一键保存所有标签页，释放内存，随时恢复。

![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **一键保存** — 将所有标签页保存到列表并关闭，最高释放 95% 内存
- **按域名分组** — 自动将同一网站的标签归为一组
- **搜索过滤** — 快速从大量保存的标签中找到目标
- **灵活恢复** — 支持恢复单个标签或整组恢复
- **右键菜单** — 右键页面直接保存当前标签或所有标签
- **快捷键** — `⌘⇧S` 保存 / `⌘⇧E` 打开
- **徽章计数** — 扩展图标上实时显示已保存标签数
- **暗色主题** — 精心设计的深色 UI，护眼舒适
- **设置面板** — 自定义保存行为（关闭标签、分组、排除固定标签）
- **数据本地** — 所有数据存储在本地，无需登录，保护隐私

## 📸 Preview

### 保存标签页
点击扩展图标或按 `⌘⇧S`，所有标签页被保存并关闭。

### 恢复标签页
在弹窗中点击「恢复全部」恢复整组，或点击单个标签的恢复按钮逐个恢复。

## 🚀 安装

### 从源码安装（开发者模式）

1. 下载或克隆本项目
   ```bash
   git clone https://github.com/YOUR_USERNAME/tab-harbor.git
   ```
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目的 `tab-harbor` 目录

### 从 Chrome Web Store 安装（即将上线）

> 🔨 准备中...

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `⌘/Ctrl + Shift + S` | 保存所有标签页 |
| `⌘/Ctrl + Shift + E` | 打开 Tab Harbor |
| `⌘/Ctrl + K` | 聚焦搜索框 |
| `Esc` | 清除搜索 / 关闭设置 |

## 🛠️ 技术栈

- **Manifest V3** — Chrome 最新扩展标准
- **Service Worker** — 按需唤醒，低内存占用
- **chrome.tabs API** — 标签页操作
- **chrome.storage API** — 本地数据持久化
- **Vanilla JS** — 零依赖，轻量纯净

## 📁 项目结构

```
tab-harbor/
├── manifest.json              # 扩展配置
├── background/
│   └── service-worker.js      # 后台服务（核心逻辑、菜单、快捷键、消息处理）
├── popup/
│   ├── popup.html             # 弹窗页面
│   ├── popup.css              # 暗色主题样式
│   └── popup.js               # UI 渲染层（通过消息与后台通信）
├── icons/
│   ├── icon16.png             # 16x16 图标
│   ├── icon48.png             # 48x48 图标
│   ├── icon128.png            # 128x128 图标
│   └── generate-icons.html    # 图标生成工具
├── README.md
├── LICENSE
└── .gitignore
```

## 📝 开发计划

- [ ] 数据导出/导入（JSON）
- [ ] 标签页过期自动清理
- [ ] 紧凑模式/列表模式切换
- [ ] 自定义主题色
- [ ] Chrome Web Store 上架

## 📜 License

[MIT](LICENSE)
