---
name: add-project
description: 為本作品集新增/上架一個作品專案時使用(「上架 XXX」「新增作品」「加一個專案」)。涵蓋:事實收集與技術棧掃描、去品牌化截圖產線、封面風格、中英 MDX 欄位約定、order/featured 聯動、驗證清單與部署。
disable-model-invocation: true
---

# add-project · 作品上架流程

把一個新作品從素材到上線走完。產線工具引用 base plugin 的
`site-showcase` 模板(`${CLAUDE_PLUGIN_ROOT}` 為 base 時的
`skills/site-showcase/templates/`),工作暫存一律放 `.preview/`(gitignored)。

## 0. 事實收集(先問,不足不開工)

**內容紀律**(見 memory `content-factuality`):技術聲明只能來自三個來源——
`docs/resume.txt`、使用者口述、**實際掃描**。禁止「該類專案通常會用」式推測。

向使用者確認:
1. 專案性質與角色(切版/維護/開發?獨立/協作?)
2. 時間(年月;與技術證據矛盾時提出質疑,如 jQuery 版本發布年)
3. 素材來源:線上網址 / GitHub repo / 舊截圖(走 site-showcase 三分支)
4. 匿名程度:商業案照慣例匿名(標題不露品牌、封面去品牌化)
5. 首頁 featured 要不要進(上限 4,進的話擠掉誰)

技術棧用掃描取得:`node .claude/skills/add-project/scripts/scan-tech.mjs <url>`
(全域變數 jQuery/Vue/React/Swiper…、script src 清單、Bootstrap 偵測)。

## 1. 截圖產線

複製 site-showcase 的 `debrand-shoot.template.mjs` 改映射(品牌名→中性名,
含子公司/縮寫/網址變體),先截首頁+抓 nav,再挑 4~8 個視覺豐富子頁。
陷阱已內建在模板與 skill 正文(logo 寬度上限、懶載等待、克隆圖章),照抄別省。

## 2. 封面

- 規格:1920×1440(4:3)webp q85 → `public/images/projects/{slug}.webp`
- **每案一種風格**(現況見 `public/images/projects/README.md` 狀態表):
  新案配新風格或挑既有模板變體,出樣張給使用者確認後定稿
- 合成用 HTML/CSS + Playwright(`style-compose.template.mjs` 起手)

## 3. MDX(中英各一份,`src/content/projects/{zh,en}/{slug}.mdx`)

| 欄位 | 約定 |
|------|------|
| `slug` | kebab-case,與檔名一致,避免與既有 slug 近似混淆 |
| `status` | `online`(顯示 Live Demo 需另有 liveUrl)/ `offline` |
| `tags` | 掃描結果,5 個以內 |
| `cover` | `/images/projects/{slug}.webp` |
| `order` | **全系列依 date 時間倒序重排**(新案插入後,比它舊的案子 order 全部 +1,中英同步) |
| `featured` | 首頁精選上限 4;進一個就要退一個(改舊案為 false) |
| `date` | `"YYYY-MM"`,只用於統計年份區間與排序參考 |

正文結構:`## 專案概述` → 圖1 → `## 我的角色` → 圖2 → `## 技術重點`
(+ 選用 `## 原始碼`/`## 狀態`)。詳細頁圖:1600 寬 webp q80 →
`public/images/projects/details/{slug}-{n}.webp`,每案 1~2 張。

## 4. 驗證清單(build 後逐項)

```
npm run build && npm run preview
```
- [ ] 首頁精選 = 預期 4 案、順序正確(查 `.projects__item img` src)
- [ ] 列表頁:新案出現、順序時間倒序、hero 統計數字自動更新(NN PROJECTS/年區間)
- [ ] 列表頁 slider↔grid 切換正常(新增卡片不破 FLIP)
- [ ] 新詳細頁:cover + 正文圖全部載入(`img.complete && naturalWidth > 0`)
- [ ] 新封面逐張放大檢查品牌殘留(logo、署名、圖片內文字、URL)

## 5. 提交部署

commit(封面+details+MDX+order 連動一筆)→ `git push` → 自動部署
→ 輪詢線上新詳細頁 200 與圖片可達。date 等未確認事實要在 commit
訊息與回報中標註。
