# Projects 列表頁(`/[lang]/projects/`)

> Slider + Grid 雙模式作品列表頁,使用 Embla Carousel 處理拖曳互動,自製視差/scramble/mode 切換邏輯。

---

## 1. 頁面定位

- **路徑**:`/zh/projects/`、`/en/projects/`
- **跟首頁 Projects section 的差別**:
  - 首頁 = curated 精選 5~6 件,Sticky sidebar + 卡片堆疊
  - 此頁 = 完整 archive(目標 10~20 件),提供 **Slider** 與 **Grid** 兩種瀏覽方式

---

## 2. 雙模式架構

兩種模式共用同一組 DOM(同一批 `.project-card`),靠 `.mode-slider` / `.mode-grid` class 切換 CSS 與 JS 行為。

| Mode | 視覺 | 互動 |
|------|------|------|
| **Slider**(預設) | 水平排列,active 90vw 居中,兩側 5vw peek | Embla 處理拖曳/swipe;鍵盤左右鍵;Prev/Next 按鈕 |
| **Grid** | 1/2/3 欄 RWD 卡片 | 純靜態,點卡片進 detail 頁 |

模式選擇用 `localStorage["portfolio-projects-view"]` 持久化(預設 slider)。

---

## 3. 元件 / 檔案結構

```
src/pages/zh/projects/index.astro    # 中文列表頁(DOM + scoped SCSS)
src/pages/en/projects/index.astro    # 英文版,鏡像複製
src/scripts/projects-list.ts         # 所有 JS 邏輯
```

DOM 骨架:
```astro
<section class="projects-list section" data-theme="dark">
  <div class="projects-list__hero">
    <h1>精選作品</h1>
    <p>由概念到上線的完整實踐。</p>
    <div class="view-toggle">
      <button data-mode="slider">Slider</button>
      <button data-mode="grid">Grid</button>
    </div>
    <h2 id="slider-active-title">{第一張卡片的標題}</h2>
  </div>

  <div class="projects-list__wrap" id="projects-list-wrap">
    <!-- Embla viewport -->
    <div class="projects-list__container mode-slider" id="projects-list">
      <!-- Embla container(track),flex 排列卡片 -->
      <article class="project-card" data-slug="...">
        <a class="project-card__link">
          <div class="project-card__cover">
            <div class="project-card__img-wrap"><!-- 視差 translateX target -->
              <img class="project-card__img" />
            </div>
          </div>
          <div class="project-card__meta">
            <h3 class="project-card__title">標題</h3>
            <div class="project-card__tags">...</div>
            <p class="project-card__desc">描述</p>
          </div>
        </a>
      </article>
      ...
    </div>
  </div>

  <div class="slider-controls" id="slider-controls">
    <button data-slider-prev>←</button>
    <button data-slider-next>→</button>
    <div class="slider-progress">
      <div class="slider-progress__bar"><div class="slider-progress__bar-fill" /></div>
      <span><span id="slider-progress-current">01</span> / 04</span>
    </div>
  </div>
</section>
```

---

## 4. Embla 整合

```ts
emblaApi = EmblaCarousel(viewport, {
  align: "center",
  loop: false,
  containScroll: "",     // 取消 contain → 第一/最後一張都能真正置中
  duration: 30,           // ~0.3s 的 slide 動畫感
  dragThreshold: 10,
});
```

### 為何選 Embla
詳見 `docs/dev-pitfalls.md` 第 4 條的決策紀錄。簡言之:輕量(~10KB)、TS 一級公民、`scrollProgress` API 適合做自製視差、不用付費。

### Embla 帶來的 free features
- 雙向拖曳 + 慣性
- 觸控方向鎖(垂直滑放手讓瀏覽器處理 native scroll)
- 鍵盤(JS 自接 `ArrowLeft/Right` → `emblaApi.scrollPrev/Next()`)
- `clickAllowed()` 判斷拖曳後不觸發 link 跳轉
- Resize 自動重算

---

## 5. 自製視差(`updateParallax`)

用 Embla 的 `scrollProgress` + `scrollSnapList` 計算每張卡片內圖的位移,**不依賴 getBoundingClientRect → 無 reflow,卡片數量 10+ 也順**。

### 公式
```
diff = scrollSnap - scrollProgress           # 該卡距「現在中心」的進度差,範圍 -1~1
cardsDist = diff × (snapList.length - 1)     # 換算成「卡片寬度」單位
offsetX = -cardsDist × PARALLAX_OFFSET       # 負號讓圖片落後於卡片(經典視差方向)
```

### 對照表(`PARALLAX_OFFSET = 120px`)
| 卡片相對位置 | offsetX |
|------------|---------|
| 左 2 張 | +240 |
| 左 1 張 | +120 |
| **正中央(active)** | **0** |
| 右 1 張 | -120 |
| 右 2 張 | -240 |

### 觸發時機
- `emblaApi.on("scroll", updateParallax)` — 拖曳/動畫每幀
- `emblaApi.on("settle", updateParallax)` — 停下後校正
- `emblaApi.on("reInit", ...)` — resize 後重算

### Loop 補丁
程式碼包含 `engine.slideLooper.loopPoints` 處理。**目前 `loop: false` 不會執行**,但保留以備未來開啟。

---

## 6. Hero 標題 scramble

`scrambleTo(hero, title, { duration: 0.4 })` 由 `text-scramble.ts` 提供的程式化 API。

| 參數 | 值 | 為什麼 |
|------|----|------|
| duration | 0.4s | 比預設 0.3s 多 0.1s,給較長標題更從容鎖定 |
| hold | 0(預設) | 切換要立即反饋,不停留 |
| delay | 0(預設) | 同上 |

觸發時機:`emblaApi.on("select")`(Embla 偵測到 active 卡改變)。

---

## 7. 進度條 + Prev/Next

- **進度條 fill**:`width: calc(var(--progress, 0) * 100%)`,JS 設 `--progress = (current+1)/total`
- **計數**:`01 / 04` 樣式
- **Prev/Next**:呼叫 `emblaApi.scrollPrev() / scrollNext()`;`disabled` 跟 `canScrollPrev/Next()` 同步

更新時機:`emblaApi.on("select")` 與 `reInit`。

---

## 8. 卡片視覺效果

- **active 高亮**:`is-active` class 控制 opacity 0.4 → 1(`select` 事件切換)
- **圖片 scale 1.2**:`.project-card__img` 直接套 `transform: scale(1.2)`(跟視差 wrap 的 transform 不衝突,因為兩者在不同元素)
- **無 hover scale**:會跟 GSAP/Embla transform 互卡,移除以保穩定

---

## 9. RWD

| 視窗 | card-width | peek 兩側 | grid 欄 |
|------|-----------|---------|--------|
| Mobile (<768) | 90vw | 5vw | 1 |
| Tablet (≥768) | 60vw | 20vw | 2 |
| Desktop (≥1024) | 50vw | 25vw | 3 |

Card 內的 `padding-inline`:Mobile `var(--space-2)` (8px),Tablet+ `var(--space-4)` (16px)。

---

## 10. 已知限制 / 待實作

- **Phase 4 — Slider ↔ Grid 切換的 View Transitions 動畫**:尚未實作。卡片 / hero title 切換 mode 時是直接 swap;未來用 `document.startViewTransition()` + `view-transition-name` 加上「卡片飛位」效果。`view-transition-name` 不能放靜態 HTML(會被 SPA 頁面切換捕捉,浮上 page-transition 遮罩),要由 JS 動態加上、動畫結束後立即移除。
- **進度條點擊跳轉**:未實作(目前只能拖曳/按鈕/鍵盤)
- **真實內容**:目前 4 個範例專案,等使用者提供 10+ 真實作品

---

**最後更新**:2026-04-27
