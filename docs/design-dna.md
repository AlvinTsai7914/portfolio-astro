# Design DNA - Portfolio Astro

> 基於 [good-fella.com](https://good-fella.com/) 的 CSS 設計系統，結合專案自身需求調整

**分析日期**：2026-03-19

---

## 1. 色彩系統（CSS Custom Properties）

### Light 主題 `[data-theme="light"]`

| 變數名 | 色碼 | 用途 |
|--------|------|------|
| `--color-background` | `#eee` | 頁面背景 |
| `--color-foreground` | `#141314` | 主要文字 |
| `--color-background-muted` | `#f7f7f7` | 次要背景（卡片等） |
| `--color-foreground-muted` | `#696869` | 次要文字 |
| `--color-brand` | `#fb460d` | 品牌強調色 |
| `--color-brand-muted` | `#fd8d68` | 品牌色淡化 |
| `--color-border` | `rgba(0,0,0,0.019)` | 邊框 |
| `--color-border-muted` | `rgba(0,0,0,0.102)` | 次要邊框 |
| `--color-surface` | `#d5d5d5` | 表面色 |
| `--color-selection-bg` | `#fb460d` | 文字選取背景 |
| `--color-selection-text` | `#eee` | 文字選取文字色 |

### Dark 主題 `[data-theme="dark"]`

| 變數名 | 色碼 | 用途 |
|--------|------|------|
| `--color-background` | `#141314` | 頁面背景 |
| `--color-foreground` | `#eee` | 主要文字 |
| `--color-background-muted` | `#1a1a1a` | 次要背景 |
| `--color-foreground-muted` | `#818081` | 次要文字 |
| `--color-brand` | `#fd551d` | 品牌強調色（dark 稍亮） |
| `--color-border` | `rgba(238,238,238,0.102)` | 邊框 |
| `--color-border-muted` | `rgba(238,238,238,0.051)` | 次要邊框 |
| `--color-surface` | `#333` | 表面色 |
| `--color-selection-bg` | `#fd551d` | 文字選取背景 |
| `--color-selection-text` | `#141314` | 文字選取文字色 |

### 基礎色

| 變數名 | 色碼 |
|--------|------|
| `--color-black` | `#141314` |
| `--color-white` | `#eee` |

> 注意：good-fella 的「黑」不是純黑 `#000`，「白」不是純白 `#fff`，而是帶有微妙色調的 `#141314` 和 `#eee`

---

## 2. 字體系統

### 字體家族

| 變數名 | 值 | 本專案對應 |
|--------|-----|-----------|
| `--font-sans` | `"aktiv-grotesk", ui-sans-serif, system-ui` | `"Geist Sans", "Noto Sans TC", ui-sans-serif, system-ui` |
| `--font-mono` | `var(--font-geist-mono), ui-monospace, "Fira Code"` | `"Geist Mono", "Noto Sans Mono CJK TC", ui-monospace` |

### 字體大小（Fluid Typography with clamp）

| 變數名 | 值 | 說明 |
|--------|-----|------|
| `--text-display` | `clamp(3rem, 3rem + 5vw, 8rem)` | 超大展示標題（48px → 128px） |
| `--text-h1` | `clamp(2rem, 2rem + 4vw, 6rem)` | H1（32px → 96px） |
| `--text-h2` | `clamp(2.25rem, 2.25rem + 1.75vw, 4rem)` | H2（36px → 64px） |
| `--text-h3` | `clamp(1.75rem, 1.75rem + 1.25vw, 3rem)` | H3（28px → 48px） |
| `--text-h4` | `clamp(1.75rem, 1.75rem + 0.25vw, 2rem)` | H4（28px → 32px） |
| `--text-h5` | `clamp(1.25rem, 1.25rem, 1.25rem)` | H5（20px，固定） |
| `--text-h6` | `clamp(1rem, 1rem, 1rem)` | H6（16px，固定） |
| `--text-body` | `1rem` | 內文（16px） |
| `--text-body-lg` | `clamp(1.125rem, 1.125rem + 0.125vw, 1.25rem)` | 大內文（18px → 20px） |
| `--text-body-sm` | `0.875rem` | 小內文（14px） |

### 字重

| 變數名 | 值 |
|--------|-----|
| `--font-weight-light` | `300` |
| `--font-weight-medium` | `500` |
| `--font-weight-bold` | `700` |

### 標題排版細節

| 標題 | font-weight | line-height | letter-spacing |
|------|------------|-------------|----------------|
| h1 | 400 | 1.1 | -0.035em |
| h2 | 500 | 1.125 | -0.05em |
| h3 | 500 | 1.083 | -0.05em |
| h4 | 500 | 1.25 | -0.025em |
| h5 | 500 | 1.4 | -0.025em |
| h6 | 400 | 1.0 | -0.05em |

### 內文排版

- font-size: `1rem`（16px）
- line-height: `1.5`
- font-weight: `400`

---

## 3. 間距系統

### Section 間距

| 螢幕尺寸 | padding-top / padding-bottom |
|----------|------------------------------|
| Base（mobile） | `64px`（4rem） |
| Large（≥1024px） | `128px`（8rem） |

### 間距級距（Spacing Scale）

基礎單位：`0.0625rem`（1px）

常用值：`4px` / `8px` / `12px` / `16px` / `24px` / `32px` / `48px` / `64px` / `80px` / `96px` / `128px` / `160px`

---

## 4. Grid 系統

| 屬性 | 值 |
|------|-----|
| 欄數 | `12` |
| Gutter | `1rem`（16px） |
| Margin（mobile） | `1rem`（16px） |
| Margin（≥640px） | `1.5rem`（24px） |
| Margin（≥1024px） | `2rem`（32px） |
| 最大寬度 | `1920px` |
| 內容容器（xl） | `36rem`（576px） |
| 內容容器（2xl） | `42rem`（672px） |

### 容器寬度層級

good-fella.com 不使用多個 container class，而是在**同一個 12 欄 Grid 內用 grid-column 控制內容寬度**：

| 層級 | 做法 | 適用場景 |
|------|------|---------|
| **全寬** | `grid-column: 1 / span 12` | Hero、Projects 等大型展示區塊 |
| **窄版居中** | `grid-column: 3 / span 8`（中間 8 欄） | 文字為主的區塊（About、Process） |
| **文字限寬** | `max-width: 42rem`（672px） | 段落文字最大寬度 |
| **更窄文字** | `max-width: 36rem`（576px） | 特別窄的文字區域 |

### 本專案各 Section 容器規劃

| Section | 容器層級 |
|---------|---------|
| Hero | 全寬（12 欄） |
| About | 窄版居中（8 欄），含頭像 + 文字 |
| Skills | 全寬（12 欄） |
| Projects | 全寬（12 欄） |
| Experience | 全寬（12 欄） |
| Contact | 全寬（12 欄） |
| Footer | 全寬（12 欄） |

---

## 5. 圓角（Border Radius）

| 變數名 | 值 |
|--------|-----|
| `--radius-4` | `0.25rem`（4px） |
| `--radius-8` | `0.5rem`（8px） |
| `--radius-12` | `0.75rem`（12px） |
| `--radius-full` | `9999px` |

---

## 6. 動畫緩動函數

| 變數名 | 值 | 用途 |
|--------|-----|------|
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | 一般動畫結束 |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | 進出動畫 |
| `--ease-out-quad` | `cubic-bezier(0.5, 1, 0.89, 1)` | 柔和結束 |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | 快速減速 |
| `--ease-out-back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 帶回彈效果 |

- 預設 transition duration：`0.15s`
- 預設 timing function：`cubic-bezier(0.4, 0, 0.2, 1)`
- 脈衝動畫：`pulse 2s ease-in-out infinite`

---

## 7. Header（三種狀態）

- 高度：`104px`（`--site-header-height`）
- 固定式頂部（`position: fixed`）
- 內容：Logo（左）、Nav 連結（中：About / Skills / Projects / Experience / Contact）、語言切換 ZH/EN（右）
- **不含主題切換按鈕** — 各 Section 用 `data-theme` 自帶深淺色，不提供使用者手動切換

### 狀態切換

| 狀態 | 觸發條件 | 樣式 |
|------|---------|------|
| **頂部初始** | `scrollY === 0` | 透明背景，寬鬆間距 |
| **滾動後** | `scrollY > 100px`（約） | 帶背景色，較緊湊（高度縮小或 padding 減少） |
| **淺色區塊** | Header 與 `data-theme="light"` Section 重疊 | 深色文字（`#141314`）+ 對應背景 |
| **深色區塊** | Header 與 `data-theme="dark"` Section 重疊 | 淺色文字（`#eee`）+ 對應背景 |

### 技術實作

- 滾動偵測：JS `scroll` event 或 GSAP ScrollTrigger → 加/移除 `.header--scrolled` class
- 區塊顏色偵測：`IntersectionObserver` 偵測 Header 重疊的 Section `data-theme` → 動態切換 `.header--light` / `.header--dark` class

---

## 8. 浮動社群連結

- 位置：頁面**右側**，垂直置中，`position: fixed`
- 內容：GitHub icon + LinkedIn icon（垂直排列）
- 樣式：隨當前重疊 Section 的 `data-theme` 切換文字色（與 Header 相同邏輯）
- 不佔用 Grid 欄位，浮在內容之上

---

## 9. 視覺節奏（Section 深淺交替）

### 本專案規劃

```
Header     → 固定，透明或配合當前 Section
Hero       → dark
About      → light
Skills     → dark
Projects   → light
Experience → dark
Contact    → light
Footer     → dark
```

---

## 9. Section 標籤風格

```
// About
// Skills
// Projects
// Experience
// Contact
```

- 字體：`--font-mono`（Geist Mono）
- 字級：`--text-body-sm`（0.875rem / 14px）
- 色彩：`--color-foreground-muted`
- 放置於 Section 標題上方

---

## 10. 整體設計原則

1. **極簡主義 + 技術感** — 大量留白、等寬字體、代碼風格標籤
2. **有意識的動態** — 每個滾動、每個轉場都是刻意設計的
3. **黑白對比節奏** — 深淺 Section 交替產生視覺韻律
4. **強調色點睛** — 品牌色（`#fb460d`）僅用於按鈕、互動元素、重點標示
5. **內容優先** — 設計服務於內容展示，不喧賓奪主
6. **大間距呼吸感** — 64-128px 的 Section padding
7. **非純黑純白** — 黑用 `#141314`，白用 `#eee`，視覺更柔和

---

## 12. 設計稿修正紀錄（Stitch → 實作差異）

Stitch 生成的原型與實際實作之間的差異，以下為準：

| 項目 | Stitch 生成 | 實作時 |
|------|------------|--------|
| About 背景「01」裝飾數字 | 有 | **不加** — 其他區塊沒有，不一致 |
| About Download 連結 | 有 | **不加** — 聯繫方式只有 Email / LinkedIn / GitHub |
| Skills 技術前方標記 | 橘色圓點 `●` | **改正方形** `■` |
| Hero 左下浮動社群連結 | 左下角 | **改為右側** `position: fixed`，垂直排列 |
| Header / Footer 跨區塊樣式 | 各 Screen 不一致 | **統一樣式** — Header 見第 7 節，Footer 以 Contact+Footer Screen 為準 |
| Header 主題切換按鈕 | 部分 Screen 有 | **移除** — 不提供使用者手動切換深淺色，各 Section 用 `data-theme` 自帶 |

---

**最後更新**：2026-03-19
