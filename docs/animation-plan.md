# 動畫規劃

**最後更新**:2026-04-27

---

## 實作順序

根據 `CLAUDE.md` 規劃：先完成靜態頁面 → Hover → 滾動動畫 → 視差 → Lenis → 自訂游標 → Text Scramble → 頁面轉場

---

## 1. Hover 效果

| 區塊 | 元素 | 效果 | 狀態 |
|------|------|------|------|
| Header | Nav 連結 | opacity 0.7 → 1 | ✅ |
| Header | Lang Switch | 反轉填充（深色區淺底、淺色區深底） | ✅ |
| Hero | CTA 按鈕 | 箭頭旋轉 + 縮放 + label 位移 | ✅ |
| Hero | Link Button | 底線從左往右收回再展開（JS transitionend） | ✅ |
| Projects | 大圖卡片 | 圖片容器 scale(1.05) | ✅ |
| Projects | View All 按鈕 | 與 Hero CTA 同結構的 +/label/+ 動畫 | ✅ |
| Contact | 聯繫連結 | 文字變品牌色 + 箭頭 opacity 0.5 → 1 | ✅ |
| Footer | Nav 連結 | opacity 變化 | ✅ |
| FloatingSocial | 社群連結 | opacity 0.5 → 1 | ✅ |

---

## 2. RevealText 遮罩揭示動畫

**元件**：`src/components/ui/RevealText.astro`
**腳本**：`src/scripts/reveal-animation.ts`

### 動畫流程

1. 橘色遮罩（`--color-brand`）從左→右展開
2. 對比色遮罩（`--color-foreground`）從左→右展開（與橘色重疊，橘色走到一半就開始）
3. 停頓，文字設為可見
4. 對比色遮罩從左→右退場
5. 橘色遮罩從左→右退場（與對比色重疊）
6. 文字完全揭示

### 時間常數

| 常數 | 值 | 說明 |
|------|-----|------|
| `MASK_DURATION` | 0.3s | 單一遮罩展開/退場時長 |
| `MASK_OVERLAP` | 0.15s | 橘白遮罩重疊時間（MASK_DURATION / 2） |
| `PAUSE_DURATION` | 0.35s | 遮罩全覆蓋後的停頓 |

### 觸發方式

- **Hero**：頁面載入直接播放（不需 ScrollTrigger）
- **其他 Section**：ScrollTrigger，元素進入視窗 85% 位置時觸發，`once: true`

### 播放順序

各 Section 內：h2 先（delay=0），SectionLabel 後（delay=0.1 ~ 0.2）

### 適用元素

| Section | h2 | SectionLabel | 狀態 |
|---------|-----|-------------|------|
| Hero | ✅（h1 拆兩行各自揭示） | ✅ | ✅ |
| About | ✅ | ✅ | ✅ |
| Skills | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ |
| Experience | ✅ | ✅ | ✅ |
| Contact | ✅ | ✅ | ✅ |

---

## 3. 滾動觸發動畫（fade-up + stagger）

**腳本**：`src/scripts/scroll-fade.ts`（通用 `data-fade-*` attribute 驅動，支援 ScrollTrigger 觸發和 `data-fade-immediate` 頁面載入直接播放）

### 動畫參數（參考 good-fella.com）

| 參數 | 值 | 說明 |
|------|-----|------|
| easing | `power2.out` | 近似 good-fella 的 `cubic-bezier(0.33, 1, 0.68, 1)` |
| duration | `0.5s` | — |
| stagger | `0.15s` | 群組內元素間隔 |
| Y 位移 | `"100%"`（預設）/ 固定 px（大型元素） | good-fella 用 `100%` |
| 觸發點 | `top 90%`（ScrollTrigger） | good-fella 用 `margin: 0px 0px -10% 0px` |

### 通用 attribute

| Attribute | 用途 | 預設值 |
|-----------|------|--------|
| `data-fade-up` | 標記元素（必要） | — |
| `data-fade-group="name"` | stagger 群組名稱 | 無（單獨觸發） |
| `data-fade-trigger=".selector"` | 自訂觸發錨點 | 元素自身 |
| `data-fade-delay` | 延遲秒數 | `0` |
| `data-fade-duration` | 動畫時長 | `0.5` |
| `data-fade-stagger` | 群組內間隔 | `0.15` |
| `data-fade-y` | Y 位移（px 或 %） | `"100%"` |
| `data-fade-immediate` | 頁面載入直接播放，不等 ScrollTrigger | — |

### 實作清單

| Section | 元素 | 效果 | 觸發錨點 | 狀態 |
|---------|------|------|---------|------|
| Hero | `.hero__name` → `.hero__tagline` → `.hero__cta` | 依序 fade-up（頁面載入直接播放） | — | ✅ |
| About | `.about__portrait-placeholder` | 單獨 fade-up（`data-fade-y="60"`） | 自身 | ✅ |
| About | `.about__text`（2 段） | stagger fade-up | `.about__content` | ✅ |
| About | `.about__stat`（3 個） | stagger fade-up | `.about__content` | ✅ |
| Skills | `.skills__category`（4 個） | stagger fade-up | `.skills__grid` | ✅ |
| Experience | `.experience__entry`（3 行） | stagger fade-up | `.experience__list` | ✅ |
| Contact | `.contact__subtext` | fade-up | `.contact` | ✅ |
| Contact | `.contact__link`（3 個） | stagger fade-up | `.contact` | ✅ |
| Projects | 不加 | 已有視差 + 指示器，疊加會過度 | — | — |

---

## 4. Projects 視差 + Sticky Scroll

**狀態**：✅ 已完成

| 功能 | 說明 |
|------|------|
| Sticky Sidebar | 左側 CSS sticky，包含標題 + 小圖 Nav + 橘色指示器 + View All 按鈕 |
| 視差效果 | 大圖 `y: -120 → 120`，GSAP ScrollTrigger scrub |
| 活躍偵測 | ScrollTrigger 偵測進入視窗中央的專案，切換小圖 Nav 活躍狀態 |
| 橘色指示器 | translateY 滑動至對應小圖 + 每次旋轉 90° |
| 小圖點擊 | 滾動到對應大圖 |
| 手機版 | Sidebar 隱藏，JS 不啟用（`window.innerWidth < 768`） |

---

## 5. Lenis 平滑捲動

**狀態**：✅ 已完成

- 套件：`lenis@1.3.21`
- `src/scripts/smooth-scroll.ts`，GSAP ticker 驅動，手機版停用（< 768px）

---

## 6. 自訂游標

**狀態**：✅ 已完成

- `src/scripts/custom-cursor.ts`，情境式 Hover 徽章（good-fella 風格）
- 預設不可見，hover `[data-cursor-text]` 時出現品牌色藥丸徽章
- GSAP 平滑跟隨 + 速度驅動旋轉 + 彈跳縮放
- 觸控裝置停用，原生游標保留

---

## 7. Text Scramble

**狀態**:✅ 已完成

- `src/scripts/text-scramble.ts`,純 JS 實作(good-fella 同款字元集)
- 支援 hover / scroll / immediate 三種觸發,可組合
- 支援 delay、hold、duration、stagger、自訂字元集
- 應用:Hero CTA、Projects View All(hover)、Contact 連結(scroll + hover)

### 7.1 程式化觸發 API:`scrambleTo`

除了 `data-scramble` 屬性,新增 export:
```ts
import { scrambleTo } from "./text-scramble";
scrambleTo(el, "新文字", { duration: 0.4, hold: 0 });
```

用於需要「動態切換目標文字」的場合,內部會更新 `dataset.scrambleText` 後跑 scramble。

**目前使用點**:
- `mobile-menu.ts`:logo `YourName` ⇄ `Hello World`(menu 開合時)
- `projects-list.ts`:hero title 切換到 active 卡片名(slider 切換時)

---

## 8. 頁面轉場

**狀態**：⏳ 待進行

- Astro View Transitions（`<ClientRouter />`）
- 頁面間的過渡動畫
- 所有動畫腳本已預埋 `astro:page-load` / AbortController 清理機制

---

## 9. Hero ASCII 視覺效果

**狀態**：✅ 已完成

- `src/scripts/hero-ascii.ts` + `src/shaders/ascii.frag.glsl` + `src/shaders/depth-parallax.frag.glsl`
- Three.js + 自訂 GLSL Shader，雙圖層（人物 + 法杖）
- Depth map 視差 + ASCII 後處理 + 徑向揭示動畫
- Hover 白色光圈、IntersectionObserver 暫停、觸控 fallback

---

## 10. Contact ASCII 視覺效果

**狀態**:✅ 已完成

- `src/scripts/contact-ascii.ts` + `src/shaders/ascii-contact.frag.glsl`
- 3 圖層角色依序出現(ScrollTrigger 觸發)
- 2D 平移(無 depth map)、圖層交錯移動方向
- 透明背景融入 section、雙欄佈局

---

## 11. MobileMenu Overlay 動畫

**狀態**:✅ 已完成

詳細文件:`docs/mobile-menu.md`

關鍵動畫:
- **Overlay 展開**:`clip-path` 從 `inset(0 0 100% 0)` → `inset(0)`,0.4s ease-out
- **Nav 項目 stagger**:每項 opacity + translateY,delay 從 0.2s 起每項 +0.08s(用 CSS 變數 `--stagger-delay` 隔離,避免影響 color transition)
- **Indicator「推」效果**:active 項目的方塊從 width 0 → 12px + margin-right 0 → 12px,把文字往右推
- **Logo 文字切換**:`scrambleTo(logo, "Hello World")`,0.4s
- **Header bar 收縮**:menu 開時觸發 margin-inline + 半透明背景 + blur(複用 `.header--scrolled` 視覺)

---

## 12. Projects 列表頁 Slider + 視差

**狀態**:✅ Phase 1~3 完成 / ⏳ Phase 4 (View Transitions) 未做

詳細文件:`docs/projects-list-page.md`

關鍵動畫:
- **Embla Carousel**(~10KB)處理 slide 切換動畫(`duration: 30` ≈ 0.3s 感)、拖曳慣性、邊界回彈
- **位置式視差**:每張卡片內圖根據 Embla `scrollProgress` 計算 translateX,範圍 ±0~240px(PARALLAX_OFFSET = 120,最遠 2 卡 × 120)
- **Hero title scramble**:slider 切換到 active 卡時,`scrambleTo(hero, title, { duration: 0.4 })`
- **active opacity 切換**:卡片 0.4 → 1,CSS transition 0.4s
- **進度條 fill**:width 0 → 100%,transition 0.6s
- **Mode 切換(Phase 4 未做)**:Slider ↔ Grid 將用 `document.startViewTransition()` + `view-transition-name` 做卡片飛位
