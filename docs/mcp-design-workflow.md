# MCP 設計工作流程記錄

> 記錄 2026-03-19 使用 MCP 工具進行設計階段的完整過程

---

## 使用的 MCP 工具

### 1. Stitch MCP（Google）

**用途**：UI 概念原型生成

**可用工具清單**：

| 工具 | 功能 |
|------|------|
| `create_project` | 建立專案容器 |
| `get_project` | 取得專案資訊 |
| `list_projects` | 列出所有專案 |
| `list_screens` | 列出專案內的所有畫面 |
| `get_screen` | 取得特定畫面（含 HTML 下載 + 截圖） |
| `generate_screen_from_text` | 用文字 prompt 生成 UI 畫面（**核心功能**） |
| `edit_screens` | 用文字 prompt 編輯已有畫面 |
| `generate_variants` | 對已有畫面生成變體（可控制創意範圍和面向） |

**不具備的功能**：
- ❌ 無法擷取/分析現有網站（沒有 Design DNA 提取功能）
- ❌ 無法產出可直接使用的生產程式碼（生成的 HTML 僅供參考）
- ❌ 無法匯出設計 token 或 CSS 變數

**模型選項**：
- `GEMINI_3_FLASH` — 較快
- `GEMINI_3_1_PRO` — 品質較好（本次使用）
- ~~`GEMINI_3_PRO`~~ — 已棄用

**裝置類型**：`MOBILE` / `DESKTOP` / `TABLET` / `AGNOSTIC`

### 2. Nano Banana MCP

**用途**：AI 圖片生成/編輯（Gemini 2.5 Flash）

**本次未使用**，預計用於：產出插圖、背景圖、調整專案截圖

---

## 設計工作流程

### Step 1：分析參考網站（替代 Design DNA 提取）

由於 Stitch MCP 沒有網站分析功能，改用 **WebFetch** 手動分析。

**方法**：
1. `WebFetch` 抓取 good-fella.com 的 HTML → 分析整體結構、Section 組成、元件模式
2. `WebFetch` 抓取 CSS 檔案 → 提取精確的 CSS Custom Properties、字體大小、間距、Grid 系統
3. 整理成 `docs/design-dna.md` 作為設計系統的唯一事實來源

**提取到的關鍵資訊**：
- 完整色彩系統（light/dark 主題的所有 CSS 變數）
- Fluid Typography 系統（`clamp()` 值）
- 12 欄 Grid 規格（gutter、margin、max-width）
- 容器寬度層級（全寬 vs 窄版居中 `grid-column: 3/span 8`）
- 緩動函數和 transition 預設值
- Section 間距（64px mobile / 128px desktop）

### Step 2：建立 Stitch 專案

```
工具：create_project
參數：title = "Portfolio Astro - UI Prototype"
結果：取得專案 ID（私人專案）
```

### Step 3：逐一生成各 Section UI

使用 `generate_screen_from_text`，每個 Section 都附上完整的 Design System 規格作為 prompt。

**Prompt 撰寫要點**：
1. **明確指定色碼** — 不寫「dark background」，寫 `Background: #141314`
2. **指定字體和大小** — 帶上 `clamp()` 值和 font-weight
3. **描述 Grid 佈局** — 指定 span 欄數和 gap
4. **提供假內容** — 給出具體的文案讓生成結果更真實
5. **說明視覺風格** — 如「minimalist, technical, no shadows」

**生成順序與結果**：

| 順序 | Section | 特殊 prompt 要點 |
|------|---------|-----------------|
| 1 | Hero | 100vh、Display typography、雙 CTA 按鈕、Header 結構 |
| 2 | About | 左右雙欄、body-lg 文字、key stats |
| 3 | Skills | 分類 Grid、pill tags、outlined 無填充 |
| 4 | Projects | 2x2 卡片、16:10 圖片、tech tags、status badge |
| 5 | Experience | 三欄水平列、薄分隔線、Geist Mono 年份 |
| 6 | Contact + Footer | 兩個 Section 堆疊、大標題 + 聯繫連結、精簡 Footer |

> Projects 和 Experience 使用**並行生成**（同時發送兩個 tool call），節省等待時間。

### Step 4：修改已有畫面

使用 `edit_screens` 進行迭代修改。

**修改紀錄**：

| 次序 | 目標 | 修改內容 |
|------|------|---------|
| 1 | About | 加入 3:4 頭像佔位區 + 重新排列左右欄 |
| 2 | About | 改為窄版居中（8 欄），縮小頭像和文字間距 |

**edit_screens prompt 要點**：
- 明確說明「哪些要改、哪些不變」
- 參考已知的設計模式（如 good-fella 的 `grid-column: 3/span 8`）
- 保留具體的 CSS 值避免模型自行發揮

### Step 5：記錄設計稿與實作的差異

Stitch 生成的結果不可能 100% 符合需求，將差異記錄在 `docs/design-dna.md` 第 12 節。

**常見差異類型**：
- 各 Screen 的 Header/Footer 樣式不一致（每次生成獨立，無法共享狀態）
- 多出不需要的裝飾元素（如背景數字「01」）
- 互動效果無法呈現（如 Header 滾動變色、hover 效果）
- 元素位置與最終設計意圖不同（如浮動連結左下 → 右側）

---

## 經驗總結

### Stitch MCP 適合什麼

- ✅ 快速產出 UI 概念，驗證佈局方向
- ✅ 給非設計師的開發者一個視覺參考起點
- ✅ 比較不同佈局方案（用 `generate_variants` 產生變體）
- ✅ 生成的 HTML 可用瀏覽器打開預覽

### Stitch MCP 不適合什麼

- ❌ 精確到像素的設計稿（CSS 值常有偏差）
- ❌ 互動/動畫設計（只能生成靜態畫面）
- ❌ 多畫面一致性（每個 Screen 獨立生成，共用元件無法保持一致）
- ❌ 分析現有網站的 Design DNA

### 建議的混合工作流程

1. **WebFetch 分析參考網站** → 提取 Design Token（色碼、字體、間距等精確值）
2. **整理成 Design DNA 文件** → 作為設計系統的唯一事實來源
3. **Stitch 生成 UI 原型** → 用 Design DNA 的精確值作為 prompt，驗證佈局方向
4. **記錄差異** → Stitch 結果 vs 實際需求的差異清單
5. **直接進入程式碼實作** → 以 Design DNA 文件為準，不以 Stitch 截圖為準

---

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `docs/design-dna.md` | Design Token 完整定義 + 設計稿修正紀錄 |
| `CLAUDE.md` | 專案規範（設計決策、MCP 用途） |

---

**最後更新**：2026-03-20
