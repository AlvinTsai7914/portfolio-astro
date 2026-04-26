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

## 13. Responsive 設計（來源：good-fella.com CSS `8c2d0c1936913601.css`）

### Breakpoints

| 名稱 | 寬度 | 用途 |
|------|------|------|
| **Base（mobile）** | `< 640px` | 預設樣式，手機優先 |
| `sm` | `≥ 640px`（40rem） | Grid margin 調整 |
| `md` | `≥ 768px`（48rem） | Grid span 切換、flex/hidden 切換 |
| `lg` | `≥ 1024px`（64rem） | 主要桌面佈局切換、Grid span/start、subgrid |
| `xl` | `≥ 1280px`（80rem） | parallax/slider 微調 |
| `2xl` | `≥ 1536px`（96rem） | parallax/slider 微調 |

### Fluid Typography 系統

所有文字尺寸使用 `clamp()` + CSS 自訂 `--fluid-slope` 實現流體縮放：

```css
--fluid-min-w: 375;   /* 最小視窗寬度 */
--fluid-max-w: 1600;  /* 最大視窗寬度 */
--fluid-slope: calc((100vw - 375px) / (1600 - 375));
```

| Token | 手機（375px） | 桌面（1600px） | 用途 |
|-------|-------------|--------------|------|
| `--text-display` | `48px` | `128px` | Hero 主標題 |
| `--text-h1` | `32px` | `96px` | 大標題 |
| `--text-h2` | `36px` | `64px` | Section 標題 |
| `--text-h3` | `28px` | `48px` | 子標題 |
| `--text-h4` | `28px` | `32px` | 小標題 |
| `--text-h5` | `20px` | `20px` | 固定大小 |
| `--text-body-lg` | `18px` | `20px` | 大號內文 |
| `--text-body` | `16px` | `16px` | 內文（固定） |
| `--text-body-sm` | `14px` | `14px` | 小號內文（固定） |

### Grid 系統 Responsive

```css
--site-grid-columns: 12;
--site-grid-gutter: 1rem;
--site-grid-margin: 1rem;      /* mobile */
--site-grid-margin: 1.5rem;    /* ≥ 640px */
--site-grid-margin: 2rem;      /* ≥ 1024px */
--site-max-width: 1920px;
```

Grid span 在不同 breakpoint 的切換：
- **Mobile（< 768px）**：所有內容預設 `grid-span-12`（全寬）
- **md（≥ 768px）**：開始出現 `md:grid-span-*`（如 2 欄分割）
- **lg（≥ 1024px）**：完整 12 欄佈局（`lg:grid-span-*` + `lg:grid-start-*`）、啟用 `subgrid`

### Hero Responsive

```css
--hero-padding-top: 256px;
--hero-padding-bottom: 164px;
--site-header-height: 104px;
```

根據截圖分析（手機 375px）：
- 佈局：文字在上、ASCII 在下（垂直堆疊）
- 文字區塊使用全寬（12 欄）
- ASCII 區塊保留，非全寬（有左右 margin）
- CTA 按鈕水平排列（橘色按鈕 + 底線連結）
- 高度：非強制 100vh，自然撐開

### Header Responsive

```css
/* ≤ 1023px：Header 隱藏時完全移出視窗 */
@media (max-width: 1023px) {
  header.header-hidden { --header-y: -200%; }
}
/* ≥ 1024px：預設 -100% 隱藏 */
```

- **Mobile**：漢堡選單（MENU + 三線圖標）
- **Desktop（≥ 1024px）**：展開式導覽列

### 關鍵 lg（≥ 1024px）切換

桌面版才啟用的樣式：
- `lg:flex` / `lg:grid` / `lg:hidden` / `lg:block`：佈局切換
- `lg:order-none`：重置手機版的 order 排序
- `lg:col-span-*` / `lg:grid-start-*`：Grid 欄位定位
- `lg:grid-subgrid`：子元素繼承父 Grid
- `lg:mt-*` / `lg:mb-*`：間距調整
- `lg:inline-flex`：CTA 按鈕等元素的顯示方式
- `lg:relative` / `lg:inset-auto` / `lg:top-header`：定位切換
- `lg:--gap: 8`（桌面 gap 加大，mobile 為 4）

### 效能相關

```css
@media (prefers-reduced-motion: reduce) {
  *, :before, :after {
    transition-duration: 0.01ms;
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
```

### Brand 主題（第三套色彩）

good-fella 有一套額外的品牌色主題（用於特殊區塊）：

| 變數 | 色碼 |
|------|------|
| `--color-background` | `#fb460d`（品牌橘） |
| `--color-foreground` | `#141314`（黑） |
| `--color-background-muted` | `#fd7142` |
| `--color-foreground-muted` | `#1a1a1a` |
| `--color-surface` | `#fd8d68` |

---

## 14. 專案 Responsive 實作規範（本專案適用）

> 此節為本專案的實際實作標準，採 **Mobile-first** 策略。

### 14.1 Breakpoint 系統

| 名稱 | 寬度 | 使用時機 |
|------|------|---------|
| **Base（Mobile）** | 預設 | 所有元件的基礎樣式 |
| **Tablet** | `@media (min-width: 768px)` | 多欄佈局切換、按鈕變大 |
| **Desktop** | `@media (min-width: 1024px)` | Skills 4 欄、FloatingSocial 顯示、更大間距 |

**原則**：
- 所有新元件**必須 mobile-first**（`min-width` 寫法）
- 避免使用 `max-width` 除非有非寫不可的例外（需註解說明）
- Tablet 與 Desktop 之間只差「細節」（如欄數、間距），不改大佈局

### 14.2 流體間距 Token（統一使用）

| Token | 手機值 | 桌面值 | 典型用途 |
|-------|--------|--------|---------|
| `--space-fluid-xs` | 4px | 8px | 極小 gap（圖標之間） |
| `--space-fluid-sm` | 8px | 16px | 按鈕 gap、段落間 |
| `--space-fluid-md` | 16px | 32px | 元素間、卡片 padding |
| `--space-fluid-lg` | 24px | 48px | 標題下方、元件間距 |
| `--space-fluid-xl` | 32px | 64px | 區塊內大分隔 |
| `--space-fluid-2xl` | 48px | 96px | Section 內主要分隔 |

**流體縮放範圍**：375px → 1600px（線性插值）

### 14.3 Typography 預設 Margin

h1-h6 與 p 元素已在 `_typography.scss` 設定預設 `margin-bottom`（流體）：

| 元素 | Token | 值 |
|------|-------|-----|
| h1 | `--space-fluid-lg` | 24→48px |
| h2, h3 | `--space-fluid-md` | 16→32px |
| h4, h5, h6, p | `--space-fluid-sm` | 8→16px |

元件內有特殊需求可用本地 `margin-bottom` 覆蓋。

### 14.4 按鈕尺寸規範

| Token | Mobile | Tablet+ |
|-------|--------|---------|
| `--btn-size` | 32px | 40px |
| `--btn-gap` | 6px | 6px（固定） |

應用於 Hero CTA、Projects View All 等 Primary Button。

### 14.5 Section Padding（已實作）

```scss
--section-padding: var(--space-16);     // 64px mobile
@media (min-width: 1024px) {
  --section-padding: var(--space-32);   // 128px desktop
}
```

### 14.6 Grid Margin（已實作）

```scss
--grid-margin: 1rem;                    // 16px mobile
@media (min-width: 640px)  { 1.5rem }   // 24px
@media (min-width: 1024px) { 2rem }     // 32px desktop
```

### 14.7 各 Section / 元件 佈局切換總表

| Section / 元件 | Mobile | Tablet+（≥768px） | Desktop+（≥1024px） |
|---------|--------|-----------------|--------------------|
| **Header Nav** | overlay(MobileMenu)取代 inline nav | 同 Mobile（全斷點 overlay） | 同 Mobile |
| **Footer Nav** | 隱藏（MobileMenu 已提供） | 顯示橫排 | 同 Tablet |
| **Hero** | 文字上 / ASCII 下堆疊 | ASCII 全螢幕 + 文字疊加 | 同 Tablet |
| **About** | 1 欄 | 2 欄（3fr 5fr） | 同 Tablet |
| **Skills** | 1 欄 | 2 欄 | 4 欄 |
| **Projects**(首頁) | 標題/描述 + View All button + 垂直卡片堆疊（無小圖 nav） | Sticky sidebar + 右側卡片 | 同 Tablet |
| **Projects 列表頁**(`/[lang]/projects/`) | Slider mode：90vw card + 5vw peek / Grid mode：1 欄 | Slider 60vw + 20vw peek / Grid：2 欄 | Slider 50vw + 25vw peek / Grid：3 欄 |
| **Experience** | 1 欄（標題/時間/描述堆疊） | 3 欄（3fr 5fr 4fr） | 同 Tablet |
| **Contact** | 文字全寬 + 連結直排 + ASCII wrap 100vw / canvas 130%×130% 超寬置中裁切 | 左文字 / 右 ASCII + 連結橫排 | 同 Tablet |
| **FloatingSocial** | 隱藏 | 隱藏 | 顯示 |
| **Custom Cursor** | 隱藏（`@media (hover:none)`） | 桌機顯示 | 同 Tablet |

### 14.8 圖片比例規範（固定，不隨視窗縮放）

| 情境 | 比例 | 用途 |
|------|------|------|
| Projects 封面 | 16:10 (960/600) | 卡片封面 |
| About 頭像 | 3:4 | 左側人像 |
| Contact ASCII | 1400:741 | 右側插圖 |
| Case Study Hero | 16:9 | 詳細頁封面 |

### 14.9 MobileMenu Overlay(全斷點 nav)

詳見 `docs/mobile-menu.md`。重點:
- **取代所有斷點的 Header inline nav**(原 nav 在 < 417px 會擠爆)
- 全螢幕 overlay,clip-path 從頂展開 0.4s + 項目 stagger 浮現
- **active section 橘色 ▪ 指示器 + 橘色文字**(IntersectionObserver 偵測,中段 20% 觸發)
- **Logo 文字切換**:`YourName` ⇄ `Hello World`(text-scramble 程式化觸發)
- **MENU 按鈕絕對置中**於 header bar(`position: absolute; left: 50%; translate(-50%, -50%)`),不受 logo/EN 寬度影響

### 14.10 Projects 列表頁(`/[lang]/projects/`)

詳見 `docs/projects-list-page.md`。重點:
- 雙模式 **Slider / Grid**,localStorage 持久化(預設 Slider)
- Slider 用 **Embla Carousel**(~10KB,vanilla,有方向鎖、慣性、touch 處理)
- 自製疊加層:Hero title scramble、進度條、視差(`scrollProgress` 為基底)、虛化(opacity 0.4)
- 視差公式:`offsetX = -diff × (snapList.length - 1) × PARALLAX_OFFSET(120px)`

---

**最後更新**:2026-04-27
