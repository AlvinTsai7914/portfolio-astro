# Project Cover Images

每個專案 cover 圖放這裡,**檔名 = slug**(扁平結構,無子資料夾)。

## 命名規則

```
public/images/projects/{slug}.{jpg|webp|png}
```

對應 `src/content/projects/{lang}/{slug}.mdx` 的 frontmatter:

```yaml
cover: "/images/projects/{slug}.jpg"
```

(瀏覽器路徑不含 `public/`)

## 目前 6 個專案

| slug | 對應 mdx | 圖檔狀態(2026-09-29) |
|------|---------|---------|
| `financial-corporate-site` | 金控集團形象網站 | ✅ 白底斜鋪 mosaic |
| `automotive-brand-site` | 日商汽車品牌官網 | ✅ 深色品牌風(去品牌化重截) |
| `government-agency-site` | 政府機關形象網站 | ✅ 瀏覽器窗框(去品牌化重截) |
| `charity-landing-page` | 公益平台一頁式網站 | ✅ 暖色卡片(網站已下線,舊圖救援) |
| `twitch-react` | Twitch 首頁複刻 | ✅ 桌機+手機並排(API 已停用,mock 資料重現 UI) |
| `great-food` | Great Food 餐飲網站 | ✅ 3D 透視堆疊(repo 本地渲染截圖) |

> 六案六風格。產線腳本在 `.preview/`(git ignored):截圖 `shoot-*.mjs`、風格模板 `style-final.mjs`、
> 斜拼 `compose-tiles.mjs`;源圖備份在 `.preview/src-images/`。
> 商業合作案(financial/automotive/government)封面一律去品牌化:logo 灰塊/打碼、品牌字樣替換。

## 規格建議

| 項目 | 值 |
|------|---|
| 比例 | 4:3(1.333) — 首頁視窗顯示 16:9,4:3 多出的上下餘裕供視差滑動 |
| 建議尺寸 | 1920×1440(2x for retina) |
| 格式 | `.webp` 優先,`.jpg` 也行 |
| 構圖 | 主視覺**置中**(首頁 `object-fit: cover` 裁成 4:3 且視差上下滑動,重要內容勿貼上下邊) |

## 替換 cover 的步驟

1. 把圖片放到本資料夾,命名 `{slug}.jpg`(或 `.webp`)
2. 改 `src/content/projects/zh/{slug}.mdx` 的 `cover:` 欄位
3. 改 `src/content/projects/en/{slug}.mdx` 的 `cover:` 欄位(中英要一致)
4. `npm run dev` 確認顯示正常
