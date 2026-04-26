# MobileMenu(全斷點 overlay 導覽)

> 取代原 inline header nav 的全螢幕 overlay 選單,**所有斷點都用**(不只手機)。設計參考 good-fella.com /work 頁的 MENU/CLOSE 抽屜風格。

---

## 1. 動機

原本 Header 用 inline nav(5 個項目橫排)。在 < 417px 視窗時,5 個 nav + logo + EN 切換擠不下 → 字會斷行 / 互相重疊 / 整列破版。

評估 4 個方案後選定 **全斷點 overlay**:不只解決手機 RWD,桌機也用同一套,簡化心智模型且風格統一。

---

## 2. 元件 / 檔案

```
src/components/layout/Header.astro       # 加入 MENU 按鈕(absolute 居中)
src/components/layout/MobileMenu.astro   # overlay DOM + scoped SCSS
src/scripts/mobile-menu.ts               # toggle 邏輯
src/scripts/text-scramble.ts             # scrambleTo 程式化 API(供 logo 切換)
src/scripts/smooth-scroll.ts             # 暴露 window.__lenis(供 menu 開啟時暫停)
```

---

## 3. Header 結構(MENU 按鈕)

```astro
<div class="header__inner">  <!-- position: relative,作為 MENU 絕對定位錨點 -->
  <a class="header__logo">
    <span id="header-logo-text">YourName</span>  <!-- scrambleTo 目標 -->
  </a>
  
  <nav class="header__nav">...</nav>  <!-- display: none 全斷點隱藏(SEO fallback) -->
  
  <button id="header-menu-toggle">  <!-- absolute 居中,不受 logo/EN 寬度影響 -->
    <span class="header__menu-toggle-label">MENU</span>
    <span class="header__menu-toggle-icon">  <!-- 兩條粗線,open 時旋轉成 × -->
      <span class="header__menu-toggle-line"></span>
      <span class="header__menu-toggle-line"></span>
    </span>
  </button>
  
  <div class="header__actions">
    <a class="header__lang-switch">EN</a>
  </div>
</div>
```

### MENU 按鈕絕對置中
```scss
.header__menu-toggle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  // Label 固定 5ch 寬,避免 MENU(4)/CLOSE(5) 切換時抖動
  .header__menu-toggle-label { min-width: 5ch; text-align: center; }
}
```

### Menu 開啟時 Header bar 收縮
複用 `.header--scrolled` 的視覺(margin-inline 收 + 半透明深色背景 + blur):
```scss
:global(body.menu-open) .header .header__bar {
  margin-inline: var(--grid-margin);
  background-color: rgba(51, 51, 51, 0.85);
  backdrop-filter: blur(12px);
  color: #eee;  // 強制淺色文字,覆蓋 bar--light 的深色文字
}
```

---

## 4. MobileMenu overlay 結構

```html
<div id="mobile-menu" data-astro-transition-persist="mobile-menu">
  <!-- persist:跨 SPA 頁面保留 DOM -->
  <div class="mobile-menu__inner">
    <nav>
      <a class="mobile-menu__link" data-section="about">
        <span class="mobile-menu__indicator"></span>  <!-- ▪ 橘色方塊,active 時出現 -->
        <span>關於</span>
      </a>
      ... × 5 (about/skills/projects/experience/contact)
    </nav>
    <div class="mobile-menu__contact">
      <a href="mailto:..."> hello@example.com </a>
      <a target="_blank" href="https://github.com/...">GitHub</a>
      <a target="_blank" href="https://linkedin.com/...">LinkedIn</a>
    </div>
  </div>
</div>
```

### 關鍵 CSS
```scss
.mobile-menu {
  position: fixed; inset: 0;
  z-index: 99;                  // header z-index: 100 在其上(CLOSE 按鈕可點)
  background-color: #141314;
  clip-path: inset(0 0 100% 0); // 預設從頂部完全收起
  pointer-events: none;
  transition: clip-path 0.4s var(--ease-out);
  
  &.is-open {
    clip-path: inset(0);        // 全展開
    pointer-events: auto;
  }
}

// Indicator(active 時方塊「推」文字往右)
.mobile-menu__indicator {
  width: 0;                     // 預設隱藏
  height: 12px;
  margin-right: 0;
  background-color: #fd551d;
  transition: width 0.3s, margin-right 0.3s;
}
.mobile-menu__link.is-active .mobile-menu__indicator {
  width: 12px;
  margin-right: var(--space-3);
}
```

### Stagger 浮現(只影響 opacity/transform,**不影響 color**)
```scss
.mobile-menu__link {
  --stagger-delay: 0s;
  transition:
    opacity 0.4s var(--ease-out) var(--stagger-delay),
    transform 0.4s var(--ease-out) var(--stagger-delay),
    color 0.15s 0s;             // color 永遠 0 delay,確保點擊立即變橘
}
.mobile-menu.is-open .mobile-menu__link:nth-child(1) { --stagger-delay: 0.2s; }
.mobile-menu.is-open .mobile-menu__link:nth-child(2) { --stagger-delay: 0.28s; }
... // 依序 +0.08s
```

> ⚠️ **踩過的坑**:`transition-delay` 寫在 shorthand 會套用到所有 transition properties,包括 color。stagger delay 0.5s 會讓 color 切換也延遲 0.5s,使用者看不出按下去的回饋。改用 CSS 變數只套到 opacity/transform。

---

## 5. JS 邏輯(`mobile-menu.ts`)

### 開合 setState
```ts
function setState(open: boolean) {
  menu.classList.toggle("is-open", open);
  toggle.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  document.body.style.overflow = open ? "hidden" : "";
  
  // logo 文字 scramble:YourName ⇄ Hello World
  scrambleTo(logo, open ? "Hello World" : "YourName", { duration: 0.4 });
  
  // 桌機 Lenis 平滑捲動暫停/恢復
  if (open) window.__lenis?.stop();
  else window.__lenis?.start();
  
  // MENU 文字切 CLOSE
  label.textContent = open ? "CLOSE" : "MENU";
}
```

### IntersectionObserver 偵測當前 section
```ts
new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      links.forEach(link => link.classList.toggle("is-active", link.dataset.section === id));
    }
  }
}, { rootMargin: "-40% 0px -40% 0px" });  // 中段 20% 範圍視窗才算 active
```

### 點擊 nav 後的時序
```
0ms     使用者點擊 nav link
0ms     立即把 is-active 套到被點擊項(其他移除)→ 使用者看到橘色立即切換
300ms   setState(false) → menu 開始收合(0.4s clip-path)
700ms   menu 收合完成
750ms   平滑捲動到目標 section(優先用 lenis.scrollTo,fallback scrollIntoView)
```

跨頁(case study → 首頁 #section)只做 0~300ms 的 active 預覽,讓瀏覽器自然導航。

---

## 6. 關鍵互動細節

| 行為 | 實作 |
|------|------|
| ESC 關閉 | `window.addEventListener("keydown")` |
| Body scroll lock | `document.body.style.overflow = "hidden"` |
| Logo 開合切換 | 用 `scrambleTo` 程式化觸發,duration 0.4s + hold 0.05s |
| 跨 SPA 頁面狀態保留 | `data-astro-transition-persist="mobile-menu"` |
| 跨頁開啟狀態清理 | `initMobileMenu` 在 `astro:page-load` 移除 `body.menu-open` + reset overflow |

---

## 7. z-index 階層

```
page-transition mask    z-index: 10000   # 頁面切換遮罩,最頂
custom-cursor           z-index:  9999   # 桌機自訂游標(觸控隱藏)
header                  z-index:   100   # 永遠在 menu 之上,讓 CLOSE 可點
mobile-menu overlay     z-index:    99   # 全螢幕但低於 header
floating-social         z-index:    50   # 桌機右側固定社群連結
```

---

## 8. 已知限制

- 桌機 nav inline 永久消失(改 overlay)— 對 SEO 仍有 fallback `<nav>` 在 DOM 中,只是 `display: none`
- 開啟動畫無法被 prefers-reduced-motion 中斷(可未來補)

---

**最後更新**:2026-04-27
