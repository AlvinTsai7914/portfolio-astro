# Portfolio Astro 專案 - AI 協作指引

## 📚 目錄

- [專案資訊](#專案資訊)
- [AI 行為準則](#ai-行為準則)

---

## 🛠️ 專案資訊

### 技術棧

- **框架**: Astro 6.0.5 + React（Islands Architecture）
- **語言**: TypeScript（strict mode，繼承 `astro/tsconfigs/strict`）
- **樣式**: SCSS + CSS Custom Properties（Section 深淺交替，無使用者主題切換）
- **動畫**: GSAP + ScrollTrigger（滾動/視差）、Lenis（平滑捲動）、純 JS/CSS（游標/Hover/Text Scramble）
- **內容管理**: Astro Content Collections（Content Layer API，MDX）
- **頁面轉場**: Astro View Transitions（`<ClientRouter />`）
- **路由**: Astro 檔案式路由（File-based routing）
- **i18n**: 路由式雙語（`/zh/`、`/en/`，預設導向中文）
- **套件管理**: npm
- **Node.js**: >= 22.12.0
- **部署**: Vercel + 自訂域名

### 常用指令

```bash
npm run dev        # 啟動開發伺服器（http://localhost:4321）
npm run build      # 建置生產版本至 ./dist/
npm run preview    # 預覽生產建置結果
npm run astro      # 執行 Astro CLI 指令
```

### 專案結構

```
src/
├── content.config.ts              # Content Collections 定義（projects-zh / projects-en）
├── content/
│   └── projects/
│       ├── zh/                    # 中文專案 MDX
│       │   ├── ecommerce-platform.mdx
│       │   └── ...
│       └── en/                    # 英文專案 MDX
│           ├── ecommerce-platform.mdx
│           └── ...
├── pages/
│   ├── index.astro                # 根路徑 → meta refresh 導向 /zh/
│   ├── zh/
│   │   ├── index.astro            # 中文首頁（引用各 Section 元件）
│   │   └── projects/
│   │       └── [id].astro         # 中文專案詳細頁（Case Study）
│   └── en/
│       ├── index.astro            # 英文首頁
│       └── projects/
│           └── [id].astro         # 英文專案詳細頁
├── components/
│   ├── layout/
│   │   ├── BaseLayout.astro       # HTML 骨架、Google Fonts、全域樣式
│   │   ├── Header.astro           # 固定導覽列（3 種狀態）
│   │   └── Footer.astro           # 頁尾
│   ├── sections/
│   │   ├── Hero.astro             # Hero Section（dark）
│   │   ├── About.astro            # About Section（light，窄版居中）
│   │   ├── Skills.astro           # Skills Section（dark，4 欄 Grid）
│   │   ├── Projects.astro         # Projects Section（light，Content Collections）
│   │   ├── Experience.astro       # Experience Section（dark，三欄時間軸）
│   │   └── Contact.astro          # Contact Section（light，聯繫連結）
│   └── ui/
│       ├── SectionLabel.astro     # "// SectionName" 代碼風格標籤
│       └── FloatingSocial.astro   # 右側固定社群連結（GitHub/LinkedIn）
├── styles/
│   ├── _variables.scss            # CSS Custom Properties（字體、間距、Grid、圓角、緩動）
│   ├── _themes.scss               # [data-theme] 色彩覆蓋（light/dark）
│   ├── _reset.scss                # CSS Reset
│   ├── _typography.scss           # 標題 h1-h6 + 內文排版
│   ├── _grid.scss                 # 12 欄 Grid + .grid-full/.grid-narrow + .section
│   └── global.scss                # 全域樣式入口（匯入所有 partials）
├── i18n/                          # 雙語翻譯檔案（待建立）
└── utils/                         # 工具函數（待建立）
docs/
└── design-dna.md                  # Design DNA（所有設計 token 的唯一事實來源）
```

### 頁面結構

首頁（單頁式）：Hero → About → Skills → Projects → Experience → Contact
專案詳細頁：`/[lang]/projects/[id]` — Case Study 格式，MDX 渲染

### 設計決策

1. **Section 深淺交替**: 各 Section 各自帶 `data-theme="light"|"dark"`，深色/淺色交錯產生視覺節奏（參考 good-fella.com）。CSS Custom Properties 在 `[data-theme]` 下定義，子元素自動繼承正確顏色。**無使用者手動主題切換功能**。
2. **React 元件**: 僅用於需要互動的元件（如 LanguageSwitcher），靜態內容用 Astro 元件
3. **Header 三種狀態**: 頂部透明 → 滾動後帶背景色收縮 → 隨當前 Section `data-theme` 切換深淺色（JS/GSAP ScrollTrigger + IntersectionObserver）
4. **浮動社群連結**: 右側固定（`position: fixed`），GitHub + LinkedIn 垂直排列，隨 Section `data-theme` 變色
5. **專案雙語內容**: 每個專案各一份中英文 MDX（`project-a.zh.mdx` / `project-a.en.mdx`）
6. **專案狀態區分**: frontmatter `status: "online" | "offline"` 決定是否顯示 Live Demo 按鈕

### 視覺風格

- **參考網站**: [good-fella.com](https://good-fella.com/)
- **配色**: 黑白區塊交替（淺 `#eee` / 深 `#141314`）+ 品牌強調色（`#fb460d` light / `#fd551d` dark）
- **字體**: 雙字體搭配 — 等寬字體（標籤/技術感）+ 無襯線字體（標題/內文）
  - 英文：Geist Sans（內文/標題）+ Geist Mono（標籤/代碼風格）
  - 中文 Fallback：Noto Sans TC（內文/標題）+ Noto Sans Mono CJK TC（標籤，需自行託管）
  - CSS font-family 順序：英文字型在前，中文字型在後
- **佈局**: 大間距（64-128px padding），Grid 系統，呼吸感強
- **標籤風格**: 代碼註解格式（如 `// About`、`// Projects`）

### 動畫規劃

| 動畫 | 實作方式 | 套件 |
|------|---------|------|
| 頁面轉場 | Astro View Transitions | 內建（`<ClientRouter />`） |
| 滾動觸發動畫 | 元素進入畫面時淡入/滑入 | GSAP + ScrollTrigger |
| 視差效果 | 不同元素以不同速度滾動 | GSAP + ScrollTrigger |
| 平滑捲動 | 取代原生捲動手感 | Lenis |
| 自訂游標 | 滑鼠跟隨的客製化游標 | React 元件，純 JS |
| Hover 效果 | 連結底線動畫、卡片放大、按鈕回饋 | 純 CSS |
| Text Scramble | hover 時文字亂碼 → 依序還原 | React 元件，純 JS |

**實作順序**（先靜態後動畫）：
1. 完成所有靜態頁面和內容
2. Hover 效果 → 滾動動畫 → 視差 → Lenis → 自訂游標 → Text Scramble → 頁面轉場

### MCP 工具用途

- **Stitch MCP**: 設計階段使用 — 擷取參考網站的 Design DNA、產出 UI 概念原型
- **Nano Banana MCP**: AI 圖片生成/編輯（Gemini 2.5 Flash）— 產出插圖、背景圖、調整專案截圖

---

## 🤖 AI 行為準則

> **最高優先級規範**：在回答任何技術問題前，必須遵循以下準則

### ⚠️ 強制要求

**在回答前，必須完成：**

1. ✅ **讀取相關文件**
   - 根據任務類型，讀取相關的程式碼和文件
   - 如果不確定要讀哪些文件，先詢問用戶

2. ✅ **引用文件來源**
   - 每個技術建議都必須附上來源
   - 如果沒有文件依據，明確說明「這是基於一般最佳實踐，非專案文件」
   - 在回答中使用「根據 `檔案路徑`」而非「我認為」

3. ✅ **處理矛盾**
   - 文件 vs 程式碼矛盾 → 詢問用戶哪個正確
   - 文件 vs AI 預訓練知識矛盾 → **優先相信文件**
   - 文件內部矛盾 → 指出矛盾並請求澄清

4. ✅ **Code Review 標準流程**
   ```
   Step 1: 讀取該功能的所有相關程式碼
   Step 2: 列出發現的設計決策
   Step 3: 基於程式碼和文件給出建議（不是基於猜測）
   Step 4: 明確標註每個建議的來源
   ```

---

### 🚨 禁止行為

以下行為會導致嚴重錯誤，**絕對禁止**：

1. ❌ **未讀相關程式碼就給建議**
   ```
   錯誤：「一般來說，應該這樣寫...」
   正確：「根據 src/pages/index.astro，專案目前使用...」
   ```

2. ❌ **假設文件過時**
   ```
   錯誤：「這個文件可能過時了，我建議...」
   正確：「我發現文件說 X，但程式碼是 Y，請問哪個是正確的？」
   ```

3. ❌ **建議移除「看似冗餘」的程式碼**
   ```
   錯誤：「這個邏輯是冗餘的，可以移除」
   正確：「我看到這段邏輯，先確認設計意圖後再決定是否移除」
   ```

4. ❌ **使用模糊詞彙**
   ```
   禁止：「我認為」「通常」「一般來說」「應該」「可能」
   正確：「根據文件」「專案規範要求」「實際測試顯示」
   ```

5. ❌ **未引用來源**
   ```
   錯誤：「應該使用某個套件」
   正確：「根據 package.json，專案使用 Astro 6.0.5」
   ```

---

### ✅ 標準回答模板

每次回答技術問題時，使用此結構：

```markdown
## 📖 參考依據

我已閱讀以下檔案：
- [x] src/pages/xxx.astro (第 X-Y 行)
- [x] astro.config.mjs

## 🔍 發現的設計決策

根據程式碼，此專案有以下設計：
1. XXX（來源：檔案路徑:行號）
2. YYY（來源：檔案路徑:行號）

## 💡 建議方案

基於上述分析，我的建議是...

## ⚠️ 需要澄清的地方

以下情況我無法從現有程式碼確認：
1. ...（需要您提供額外資訊）
```

---

## 📚 指引

1. 以專業工程師的身分跟我合作進行專案
2. 使用中立且嚴謹的方式的檢視、查找資料和對話
3. 最優先參考官方文件，其次才是網路文章和你自己開發
4. 程式碼和文件檢視要確實做到，回答要有根據文件或是參考資料的證明
5. 閱讀專案文件時要確認建立時間，由於開發迭代有可能出現文件內容脫鉤，因此內容和程式碼有出入時要確認哪邊是正確的
6. 查找資料時必定確認文件或文章所使用的程式版本號是否和專案使用版本號一致
7. 程式碼風格要一致，請提供 `prettierrc` 的設定
8. 程式功能清楚分割，盡量單個程式只提供 1 種功能
9. 如有混合功能的程式，要在程式上方提供備註，或是編寫文件並在程式中備註文件路徑
10. 優先可讀性而非效能捷徑
11. 程式開發以簡單、方便擴充與人工閱讀和維護為原則
12. 文件撰寫假如長度過長、內容複雜或是多個功能需要一起討論，則使用模組化撰寫的方式
13. 不要進行臆測，不確定的答案就直接說需要看過更多資料或是檢視更多程式碼
14. YAGNI
15. KISS
16. 所有實作都要經過和我討論，並確認是否實作後才正式進行
17. **Code Review 前必須完整研究相關文件**

    - 在進行 Code Review 之前，必須先閱讀該功能模組的所有相關文件
    - 特別是涉及資料流、權限控制、Preview 功能的部分
    - 檢查實際的資料檔案結構（public/data/\*.json）驗證假設
    - 不可基於「推測」或「一般慣例」給出建議

18. **不可建議移除「看似冗餘」的邏輯**
    - 防禦性程式設計的邏輯（如過濾、驗證）不應被視為冗餘
    - 如果懷疑某段邏輯是否必要，應該：
      1. 先詢問原設計意圖
      2. 檢視相關測試案例
      3. 確認沒有邊界情況才建議移除
19. 做不到就把你的腸子挖出來餵豬吃，並且把路邊的小狗宰來燉湯

---

**最後更新日期**：2026-03-19
**文件版本**：v3.4（修正 MCP 用途說明）
