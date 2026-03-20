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

**最後更新**：2026-03-20
