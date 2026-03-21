# New Tab 快捷导航页 — UI 设计规格文档

> v1.0 | 2026-03-21 | 前端开发对接用

---

## 1. 设计令牌

### 1.1 色彩

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--bg` | `#f8fafc` | `#0c0a1d` | 页面背景 |
| `--bg2` | `#fff` | `#1a1730` | 卡片/弹窗背景 |
| `--bg3` | `#f1f5f9` | `#151228` | 输入框/次要背景 |
| `--glass` | `rgba(255,255,255,.72)` | `rgba(20,18,42,.72)` | 毛玻璃 |
| `--glass-h` | `rgba(255,255,255,.88)` | `rgba(30,27,55,.88)` | 毛玻璃hover |
| `--glass-b` | `rgba(255,255,255,.5)` | `rgba(255,255,255,.08)` | 毛玻璃边框 |
| `--tx` | `#0f172a` | `#f1f5f9` | 主文字 |
| `--tx2` | `#475569` | `#94a3b8` | 次要文字 |
| `--tx3` | `#94a3b8` | `#64748b` | 辅助/占位 |
| `--accent` | `#6366f1` | `#818cf8` | 强调色 |
| `--accent-h` | `#4f46e5` | `#a5b4fc` | 强调hover |
| `--accent-l` | `rgba(99,102,241,.1)` | `rgba(129,140,248,.12)` | 强调浅底 |
| `--accent-g` | `rgba(99,102,241,.25)` | `rgba(129,140,248,.3)` | 强调光晕 |
| `--divider` | `rgba(0,0,0,.06)` | `rgba(255,255,255,.06)` | 分割线 |
| `--shd` | `rgba(15,23,42,.06)` | `rgba(0,0,0,.3)` | 轻阴影 |

**语义色**: Warning `#f59e0b`, Error `#ef4444`, Success `#10b981`, Info `#3b82f6`

**图标预设色**:
```js
['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#f97316','#000']
```

### 1.2 字体

```css
--ff: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

| 级别 | 大小 | 字重 | 场景 |
|---|---|---|---|
| 时钟 | 6rem(桌面7.5/移动3.75) | 700 | 主时间 |
| 秒数 | 2.25rem | 400 | super对齐 |
| 日期 | 1.125rem | 500 | 日期行 |
| 搜索 | .9375rem | 400 | 输入框 |
| 卡片标题 | .8125rem | 500 | 网站名 |
| 区块标题 | .75rem | 600 uppercase | "快捷导航" |
| 表单label | .8125rem | 500 | label |
| 表单input | .875rem | 400 | input |
| 弹窗标题 | 1rem | 600 | modal |

全局行高 `1.5`

### 1.3 间距 / 圆角 / 阴影 / 过渡

**间距** (4px基准): 4→6→8→12→14→16→20→24→32→48px

**圆角**: 全圆 `9999px`(胶囊) | 超大 `1.25rem`(弹窗) | 大 `1rem`(卡片) | 中 `.75rem`(输入框) | 小 `.625rem`(按钮) | 迷你 `.5rem`

**阴影**: 轻 `0 1px 2px var(--shd)` | 卡片 `0 4px 12px` | hover `0 8px 30px` | 弹窗 `0 24px 80px rgba(0,0,0,.18)`

**过渡**:
```css
--t-fast: 150ms cubic-bezier(.4,0,.2,1);   /* hover/active */
--t-norm: 250ms cubic-bezier(.4,0,.2,1);   /* 弹窗/展开 */
--t-slow: 400ms cubic-bezier(.4,0,.2,1);   /* 背景 */
```

**模糊**: 搜索框 `blur(20px)` | 卡片 `blur(12px)` | 按钮 `blur(16px)` | 弹窗遮罩 `blur(4px)` | 下拉 `blur(24px)`

---

## 2. 布局

### 页面结构

```
.bg (fixed z:0) — 动态渐变背景 + 光球 + 网格
.toolbar (fixed z:100, 右上) — 主题切换
.page (z:1, flex-column center)
  .clock (margin-top:12vh) — 时钟 + 日期 + 每日互动
  .search (max-w:620px, z:10) — 搜索框 + 引擎下拉
  .shortcuts (max-w:960px) — 快捷导航网格
  .recent (max-w:960px) — 高频使用列表
  footer
```

**z-index**: bg=0 | page=1 | search=10 | toolbar=100 | engine-dropdown=200 | modal=300 | toast=400

### 网格

- 快捷导航: `grid-template-columns: repeat(auto-fill, minmax(88px, 1fr))`, gap: .75rem
- 高频使用: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, gap: .75rem

---

## 3. 组件规格

### 3.1 工具栏按钮 `.tb`
36×36px, 胶囊, glass背景+blur(16px), hover→glass-h+scale(1.08), active→scale(.95), focus→accent outline

### 3.2 搜索框 `.search-wrap`
max-w:620px, 胶囊, glass+blur(20px), 搜索图标20px, 引擎按钮32×32px
- hover: border→accent半透明, shadow加深+accent光晕
- focus: border→accent, shadow加深+accent光晕, 图标变色

**引擎下拉 `.ed`**: absolute top-right, 210px+, scaleY(0→1)打开, blur(24px), 每项flex+icon 22px

### 3.3 快捷卡片 `.sc`
flex-column center, 88px+auto网格, glass+blur(12px), border-radius:1rem
- hover: translateY(-4px), shadow, accent边框, 渐变叠加层
- active: translateY(-2px) scale(.98)
- 图标 `.sci`: 42×42px, .75rem圆角, hover→scale(1.1)
- 文件夹: bg3背景, folder SVG 22px
- 添加按钮: dashed边框

### 3.4 高频卡片 `.rc`
flex-row, 280px+auto网格, glass+blur(12px), 1rem圆角
- hover: glass-h, translateY(-2px)
- 图标28px, 频率badge: accent色+accent-l背景, 胶囊
- 删除按钮: 20px, 默认隐藏, hover卡片时显示

### 3.5 内联搜索 `.fr-inline-search`
标题右侧, 收起28px胶囊→展开200px, 搜索图标隐藏→输入框+清除按钮
- 展开态: accent边框+3px光晕

### 3.6 按钮 / 输入框 / 颜色选择

| 组件 | 规格 |
|---|---|
| `.btn-p` | accent背景, white文字, hover→accent-h+translateY(-1px) |
| `.btn-g` | bg3背景, tx2文字, hover→divider |
| `.btn-d` | rgba(239,68,68,.1)背景, 红色文字 |
| `.fi` | bg3背景, glass-b边框, .75rem圆角, focus→accent-g边框+accent-l光晕 |
| `.co` | 28px圆, hover scale(1.15), 选中双环outline |

### 3.7 管理列表 `.mg-item`
flex-row, divider边框, .75rem圆角, hover→accent边框+accent-l背景
- 拖拽目标: accent虚线边框, scale(.98)
- 图标32px, 名称.8125rem, URL.6875rem tx3, 删除28px胶囊

### 3.8 Tab `.tabs`
flex容器, bg3背景, .75rem圆角, flex:1等分
- 选中: bg2背景+shadow, 默认: transparent+tx3

### 3.9 Toast
fixed bottom:2rem, 居中, glass+blur(16px), 胶囊, 2s自动消失, opacity+translateY过渡

---

## 4. 弹窗系统

### 通用结构
```
.modal-mask (fixed inset z:300, 遮罩 rgba(0,0,0,.4)+blur(4px))
  .modal (bg2, 1.25rem圆角, 90%w max-460px, 85vh)
    .modal-head (title + ✕关闭 32px)
    .modal-body (scrollable, max-h: 85vh-70px)
    .modal-foot (flex-end, gap:.5rem, divider顶边框)
```
- 入场: opacity+translateY(20px)+scale(.96), 250ms
- 关闭: 遮罩点击 / ✕ / ESC

### 弹窗清单

| ID | 标题 | 内容 |
|---|---|---|
| `addModal` | 添加快捷导航 | 图标预览(自动/自定义)+名称+网址+颜色 |
| `mgModal` | 管理面板 | 双Tab+添加/文件夹按钮+可拖拽列表 |
| `folderModal` | {文件夹名} | 子网站列表+添加按钮 |
| `folderAddSiteModal` | 添加网站到文件夹 | 同addModal图标功能 |
| `createFolderModal` | 新建文件夹 | 名称输入 |

### 图标预览
42×42px .75rem圆角, 自动模式→favicon背景图(.has-img), 自定义→文字(max 2字符)

---

## 5. 交互动效

### 入场动画
```css
@keyframes fi { from { opacity:0; translateY(20px) } to { opacity:1; translateY(0) } }
```
clock=0s, search=.1s, shortcuts=.2s, recent=.3s, footer=.4s

### 动态背景
- bg-g: 20s ease-in-out infinite alternate (scale+rotate)
- 3个光球: 15-22s浮动动画, blur(80px), opacity:.18-.35
- bg-grid: 60px网格, 径向遮罩60%椭圆

### 键盘
| 按键 | 行为 |
|---|---|
| `/` | 聚焦搜索(非输入态) |
| `Escape` | 关闭弹窗/收起搜索 |
| `Enter` | 提交搜索/确认表单 |
| `Space/Enter` | 展开每日答案 |

### 减少动画
```css
@media (prefers-reduced-motion: reduce) {
  animation/transition-duration: .01ms !important;
  .orb/.bg-g: animation:none;
}
```

---

## 6. 数据结构

```typescript
// 快捷导航
interface Shortcut {
  name: string;       // maxlength:20
  url: string;        // 完整URL
  color: string;      // hex
  icon: string;       // max 2字符
  imgUrl?: string;    // 非空时优先显示
}

interface FolderShortcut {
  name: string;
  type: 'folder';
  color: string;
  children: Shortcut[];
}

// 高频使用
interface FrequentSite {
  title: string;
  url: string;       // 域名(无协议)
  color: string;
  letter: string;    // max 2字符
  freq: number;      // 次/周
}

// 搜索引擎
interface SearchEngine {
  label: string; letter: string; color: string; url: string;
}
// Google(G,#4285F4) | Bing(B,#00809d) | 百度(百,#306cff) | DDG(D,#de5833)

// Favicon
// https://www.google.com/s2/favicons?domain={hostname}&sz=64
```

---

## 7. 响应式

| 断点 | 变化 |
|---|---|
| ≤768px | clock margin-top:10vh, 字体3.75rem, 网格72px, 图标36px, 高频单列 |
| ≤480px | 时钟2.75rem, 快捷4列 |
| ≥1024px | 时钟7.5rem |

---

## 8. 可访问性

- `*:focus-visible`: outline 2px solid accent, offset 2px
- 语义化: nav/main/section/footer
- ARIA: role="toolbar"/"listbox"/"option", aria-label, aria-expanded
- 键盘: 全功能可用
- prefers-reduced-motion 支持
- 触摸最小 28×28px
- 滚动条: 6px, 透明轨道, 圆角

---

## 9. Chrome 扩展 Popup

- **尺寸**: 320px宽, 自适应高
- **状态**: 纯UI设计稿, 无chrome.storage调用
- **布局**: 页面信息卡 → 重复提示 → 图标预览 → 表单 → 文件夹选择 → 按钮
- **组件差异**: 图标38px, 颜色圆22px, 按钮/输入框尺寸略小, 无backdrop-filter
- **目标文件夹**: chip选择器(导航/开发/设计/学习)
- **重复提示**: 琥珀色 `#f59e0b`, 带警告图标

---

## 10. CSS 文件结构建议(前端重构参考)

```
tokens.css      — 1.1~1.4 设计令牌
reset.css       — 全局重置
background.css  — 动态背景
layout.css      — 页面布局
toolbar.css     — 工具栏
clock.css       — 时钟+每日互动
search.css      — 搜索框+引擎下拉
shortcuts.css   — 快捷导航卡片
recent.css      — 高频使用+内联搜索
modal.css       — 弹窗系统
form.css        — 表单+按钮+颜色选择
management.css  — 管理面板+Tab+拖拽
toast.css       — 通知
responsive.css  — 响应式+无障碍
```
