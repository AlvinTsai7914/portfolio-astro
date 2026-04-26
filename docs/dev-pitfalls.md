# 開發踩坑紀錄

> 專案開發過程中遇到的問題與解決方案

---

## 1. `astro:page-load` 事件不觸發

**日期**：2026-03-19

**問題**：
Header 和 FloatingSocial 的 JS 初始化函數綁定在 `astro:page-load` 事件上，但頁面載入後 JS 完全沒有執行——滾動偵測和 IntersectionObserver 都沒有啟動。

**原因**：
`astro:page-load` 是 Astro View Transitions 的生命週期事件。在沒有啟用 `<ClientRouter />`（View Transitions）的 MPA 模式下，這個事件**不會被自動觸發**。

**錯誤寫法**：
```js
document.addEventListener("astro:page-load", initHeader);
```

**修正寫法**：
```js
// 直接呼叫（script type="module" 自動 defer，DOM 已就緒）
initHeader();
// 保留事件監聽，供未來啟用 View Transitions 時使用
document.addEventListener("astro:page-load", initHeader);
```

**注意事項**：
- Astro 的 `<script>` 預設為 `type="module"`，會自動 defer 到 DOM 解析完成後執行，所以直接呼叫函數是安全的
- 未來啟用 `<ClientRouter />` 後，`astro:page-load` 會在每次頁面導航後觸發，屆時需要確保不會重複綁定事件（`initHeader` 內的 `addEventListener` 會累加）

**影響檔案**：
- `src/components/layout/Header.astro`
- `src/components/ui/FloatingSocial.astro`

---

## 2. Content Collections glob loader ID 衝突

**日期**：2026-03-20

**問題**：
Build 時出現警告，且英文專案詳細頁沒有被生成：
```
[WARN] [glob-loader] Duplicate id "corporate-website" found in ...corporate-website.zh.mdx.
Later items with the same id will overwrite earlier ones.
```

**原因**：
Astro 6 的 `glob` loader 從檔名生成 ID 時，會去除副檔名。對於雙點命名的檔案：
- `ecommerce-platform.zh.mdx` → ID: `ecommerce-platform`
- `ecommerce-platform.en.mdx` → ID: `ecommerce-platform`

兩個語言版本得到相同的 ID，zh 版覆蓋了 en 版。

**錯誤結構**：
```
src/content/projects/
├── ecommerce-platform.zh.mdx  ← ID: ecommerce-platform
├── ecommerce-platform.en.mdx  ← ID: ecommerce-platform（被覆蓋）
```

**修正結構**：
```
src/content/projects/
├── zh/
│   └── ecommerce-platform.mdx  ← collection: projects-zh, ID: ecommerce-platform
└── en/
    └── ecommerce-platform.mdx  ← collection: projects-en, ID: ecommerce-platform
```

**content.config.ts 改為兩個 collection**：
```ts
const projectsZh = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects/zh" }),
  schema: projectSchema,
});

const projectsEn = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects/en" }),
  schema: projectSchema,
});

export const collections = {
  "projects-zh": projectsZh,
  "projects-en": projectsEn,
};
```

**影響檔案**：
- `src/content.config.ts`
- `src/components/sections/Projects.astro`（`getCollection("projects-zh")` / `getCollection("projects-en")`）
- `src/pages/zh/projects/[id].astro`
- `src/pages/en/projects/[id].astro`

---

## 3. Static mode 不支援 `Astro.redirect()`

**日期**：2026-03-20

**問題**：
根路徑 `index.astro` 使用 `Astro.redirect("/zh/")` 做語言導向，build 時失敗。

**原因**：
`Astro.redirect()` 需要 server mode（SSR）。在 `output: "static"`（預設）模式下，所有頁面在 build 時就已生成為靜態 HTML，無法在 runtime 做 redirect。

**修正**：改用 HTML meta refresh：
```html
<meta http-equiv="refresh" content="0;url=/zh/" />
<link rel="canonical" href="/zh/" />
```

**替代方案**：
- Vercel 部署時可用 `vercel.json` 的 `redirects` 設定（server-side 301）
- 啟用 SSR mode 後可用 `Astro.redirect()`

**影響檔案**：
- `src/pages/index.astro`

---

## 4. Custom Cursor 在觸控裝置變橘色方塊卡左上角

**日期**:2026-04-22

**問題**:
手機/平板瀏覽器頁面左上角出現一個 16×16 的橘色小方塊,不能點也不能消除。

**原因**:
`src/scripts/custom-cursor.ts` 在偵測到 `isTouchDevice()` 時 early return,**從不執行 `gsap.set` 把 cursor 移出畫面或縮成 0**。但 `.custom-cursor__text` 元素本身有 `padding: 0.5rem` + `background-color: #fb460d`(品牌橘),即便內文空白仍渲染成 16×16 橘塊,卡在 `position: fixed (0, 0)`。

**修法**(`src/styles/_themes.scss`):
```scss
@media (hover: none) {
  .custom-cursor { display: none; }
}
```
觸控/hybrid 裝置直接整個容器隱藏。`hover: none` media query 對純滑鼠裝置不生效。

**影響檔案**:
- `src/styles/_themes.scss`

---

## 5. `view-transition-name` 讓元素浮在 page-transition 遮罩之上

**日期**:2026-04-23

**問題**:
SPA 頁面切換時,自訂的橘/黑雙色 page-transition 遮罩(`z-index: 10000`)無法蓋住卡片圖,看起來像卡片「穿過」遮罩。

**原因**:
任何元素被設了 `view-transition-name`(原本為了 Phase 4 mode 切換動畫加在 `.project-card__cover` 跟 `.project-card__title`)→ 瀏覽器把它捕捉到 **View Transitions API 的 snapshot 圖層**。該圖層**位於所有 HTML 之上**,連 `z-index: 10000` 也壓不住。

**修法**:
- HTML 不寫 `view-transition-name`(避免常駐參與每次 SPA 切換)
- 真正需要 mode 切換動畫時(Phase 4),由 JS **動態設 → 動畫結束立刻清除**

**影響檔案**:
- `src/pages/zh/projects/index.astro`
- `src/pages/en/projects/index.astro`
- `src/scripts/projects-list.ts`(原本 onSlideComplete 動態設 hero title VT name,也一併移除)

---

## 6. Embla 整合時 abort controller 自我 destroy 競態

**日期**:2026-04-25

**問題**:
從首頁 SPA 導航到 `/zh/projects/` 後,Embla slider 拖曳完全失效。Reload 卻正常。

**原因**:
原本在 `initProjectsList()` 內加了:
```ts
signal.addEventListener("abort", () => {
  emblaApi?.destroy();
  emblaApi = null;
});
```
本意是「SPA 離開頁面時清理 Embla」。但下一次 `initProjectsList` 跑時:
1. `abortController?.abort()` → **觸發前一次的 abort listener** → `emblaApi.destroy()`
2. 接著 `emblaApi?.destroy()`(已 null) → no-op
3. `applyMode → initEmbla` → 創建新 instance

某些 case 下時序有微妙 race,新 emblaApi 沒完整接管。

**修法**:
移除 `signal.addEventListener("abort", ...)`,只靠 init 開頭的 `emblaApi?.destroy()` 顯式清理。

```ts
function initProjectsList() {
  abortController?.abort();
  abortController = new AbortController();
  emblaApi?.destroy();  // 顯式 destroy 舊 instance
  emblaApi = null;
  // ...
}
```

**教訓**:
abort signal 的 callback 在 abort 瞬間同步觸發,如果在內呼叫會修改全域 state 的 destroy/null,容易跟「下一次 init 開頭的 cleanup」邏輯打架。SPA 場景下顯式 cleanup 比 abort listener 安全。

**影響檔案**:
- `src/scripts/projects-list.ts`

---

## 7. `touch-action: pan-y` + DevTools 觸控模擬,水平拖曳被攔截

**日期**:2026-04-24

**問題**:
自製 slider 在 Chrome DevTools 觸控模擬模式下,只能往左拖、往右拖無效,且拖曳沒有連續跟手感(像點一下就跳到下一張)。

**原因**:
`touch-action: pan-y` 讓瀏覽器處理縱向 scroll、JS 處理水平。但 Chromium 的觸控手勢預測會在 `touchstart` 那刻就決定方向,若預測為水平 scroll,**瀏覽器中斷 pointermove 事件**(因為它認為 JS 不會處理水平),只剩 pointerdown / pointerup → JS 看到的 delta 跳很大就誤以為是大幅拖曳。

**修法**(自製 slider 走方向鎖定 pattern):
- pointermove 第一次移動 ≥ 8px 時判斷方向
- 若 `|dy| > |dx|` → 釋放手勢(state = idle),不 preventDefault → 瀏覽器 native scroll
- 若水平 → commit + setPointerCapture + preventDefault

但最終專案改用 **Embla**(已內建方向鎖),不再維護自製 drag 邏輯。

**教訓**:`touch-action: pan-y` 配 pointer events 要做完整方向鎖定,不能單純依賴 pointer 事件。或交給成熟套件(Embla / Swiper)處理。

**影響檔案**(已淘汰):
- `src/scripts/projects-list.ts` 早期版本(現已用 Embla 替代)

---

## 8. Astro Dev Toolbar 蓋住測試區域

**日期**:2026-04-24

**問題**:
Playwright 測試 mobile viewport 下的 slider 拖曳,事件全部沒收到,debug 時 `elementFromPoint` 顯示是 `<astro-dev-toolbar>`。

**原因**:
Astro 在 `npm run dev` 模式下會在頁面底部插入 `<astro-dev-toolbar>` 元素(右下角 Astro logo 浮動工具)。它 `position: fixed`,佔據可見視窗底部,**接走它覆蓋區域的所有 pointer events**。在低高度 viewport(如 iPhone 14 Pro 393×660)上,容易擋到測試區域。

**修法**(測試時):
```js
await page.evaluate(() => document.querySelector("astro-dev-toolbar")?.remove());
```
或在 `astro.config.mjs` 加:
```js
export default defineConfig({ devToolbar: { enabled: false } });
```

Production build 不會有此元素。

**影響檔案**:無(僅測試 script)

---

**最後更新**:2026-04-27
