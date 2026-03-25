# Code Review — 2026-03-25

**範圍**：`feat: add RevealText mask animation and Projects sticky scroll layout`（commit `3649ccb`）

審查涵蓋：Code Reuse / Code Quality / Efficiency 三個面向。

---

## 已修復

### 1. Timeline memory leak（reveal-animation.ts）

**嚴重度**：中

**問題**：`initRevealAnimations()` 在 View Transitions re-init 時只清除 ScrollTrigger，但 `createRevealTimeline()` 建立的 GSAP Timeline 沒有被 kill，造成記憶體洩漏。Hero 區塊的 timeline 尤其嚴重——直接 `play()` 後完全失去引用。

**修復**：新增 `activeTimelines: gsap.core.Timeline[]`，re-init 時遍歷 kill 所有舊 timeline。

**檔案**：`src/scripts/reveal-animation.ts`

---

### 2. Projects parallax tween leak（Projects.astro）

**嚴重度**：中

**問題**：`gsap.fromTo()` 建立的視差 tween 在 re-init 時只清除對應的 ScrollTrigger，tween 本身未被 kill。

**修復**：新增 `activeTweens: gsap.core.Tween[]`，re-init 時遍歷 kill。

**檔案**：`src/components/sections/Projects.astro`

---

### 3. Hero 雙 `<h1>` 語義問題

**嚴重度**：中

**問題**：為了讓「Frontend」和「Developer」各自有獨立的 RevealText 動畫，拆成兩個 `<h1>`，違反每頁單一 `<h1>` 的 WCAG / SEO 最佳實踐。

**修復**：第二個改為 `<span class="hero__title" role="doc-subtitle">`，保留相同視覺樣式。

**檔案**：`src/components/sections/Hero.astro`

---

### 4. Hero underline listener leak

**嚴重度**：低

**問題**：`initUnderlineLinks()` 每次執行會對所有 `[data-underline-dir]` 元素綁定 `mouseenter` / `mouseleave`，但 View Transitions 下 re-init 時沒有清除舊 listener，造成 listener 累積。對比 Projects.astro 使用 AbortController 的模式，Hero 缺少同等清理機制。

**修復**：加入 `underlineAbort: AbortController`，re-init 時 `abort()` 清除舊 listener。

**檔案**：`src/components/sections/Hero.astro`

---

### 5. Hero underline non-null assertions

**嚴重度**：低

**問題**：`animateOut()` 和 `onShrinkEnd()` 閉包內大量使用 `line!`（7 處），TypeScript 無法跨閉包推斷 narrowing。

**修復**：在 `if (!line) return` 之後，將 `line` 賦值給 `const lineEl`，閉包內使用 `lineEl`，消除所有 `!` 斷言。

**檔案**：`src/components/sections/Hero.astro`

---

### 6. reveal-animation.ts 註解與常數不符

**嚴重度**：資訊

**問題**：檔案頭部註解寫死每階段 `0.2s`，但實際常數為 `MASK_DURATION = 0.3` / `PAUSE_DURATION = 0.35`（開發過程中調整過速度）。

**修復**：移除具體時間數值，改為指向常數名稱。

**檔案**：`src/scripts/reveal-animation.ts`

---

## 跳過（不修復）

### 1. Hero / Projects 按鈕樣式重複

**嚴重度**：高

**問題**：兩個元件各自定義相同的 SCSS 變數（`$btn-icon-size: 40px`、`$btn-gap: 6px`、`$btn-transition`）和幾乎完全鏡射的按鈕結構（inner > icon-left + label + icon-right）+ hover 動畫。

**跳過原因**：抽取為共用 `AnimatedIconButton.astro` 元件屬於重構範圍，需要統一 markup、props 設計、和兩處不同的上下文（Hero CTA vs Projects sidebar 按鈕）。不在本次 /simplify 目標內，適合作為獨立重構任務。

**未來建議**：建立 `src/components/ui/AnimatedIconButton.astro`，接受 `href`、`label`、`icon` 等 props。

---

### 2. RevealText `mb` prop 為原始 CSS 字串

**嚴重度**：中

**問題**：`mb` 宣告為 `string`，呼叫者傳入 `mb="var(--space-6)"` 直接內插到 inline style。沒有型別約束，任何字串都能通過。

**跳過原因**：目前只有 6 處使用，且全部傳入 `var(--space-*)` 格式。改為 token key 系統（`mb="space-6"` → 元件內組裝）增加的複雜度不符合 YAGNI 原則。

---

### 3. Parallax offset JS / SCSS 值同步

**嚴重度**：中

**問題**：`Projects.astro` 的 SCSS 變數 `$parallax-offset: 120px` 和 JS 中的 `y: -120` / `y: 120` 硬編碼數值必須手動保持一致。

**跳過原因**：只有一個值，透過 CSS Custom Property 傳遞再用 `getComputedStyle` 讀取會增加執行時期開銷和程式碼複雜度。已在 JS 端加上註解標明來源（`// 對應 SCSS $parallax-offset: 120px`）。

---

### 4. Mobile breakpoint magic number

**嚴重度**：低

**問題**：`window.innerWidth < 768` 硬編碼在 JS 中，與 CSS `@media (max-width: 767px)` 對應但沒有共享常數。且只在初始化時檢查一次，不響應 resize。

**跳過原因**：作品集網站的目標受眾不太會在桌面/手機之間動態切換視窗大小。Astro View Transitions 頁面導航時會重新初始化。投入改善的效益極低。

---

### 5. 空 tween 做 pause（GSAP 慣用手法）

**嚴重度**：低

**問題**：`.to({}, { duration: PAUSE_DURATION })` 對空物件做動畫來製造時間軸中的停頓，閱讀性不佳。

**跳過原因**：這是 GSAP 社群的標準慣用手法。替代方案 `.addPause()` 會真正暫停 timeline 需要手動恢復，行為不同。保持現狀。

---

## GSAP 重複 import 說明

reveal-animation.ts 和 Projects.astro 各自 `import gsap` + `gsap.registerPlugin(ScrollTrigger)`。經確認 **非效能問題**——Vite 打包時會 deduplicate 為同一個 chunk，`registerPlugin` 內部也會檢查是否已註冊。
