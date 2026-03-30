# Hero ASCII 視覺效果 — 實作文件

> 參考來源：good-fella.com Hero Section
> 建立日期：2026-03-27

---

## 概述

在 Hero Section 加入 ASCII 藝術視覺效果：將一張圖片即時轉換為 ASCII 字元渲染，搭配深度圖視差（滑鼠移動產生偽 3D）和入場揭示動畫。

---

## 技術方案

Three.js + 自訂 GPU Shader + postprocessing 套件

| 層面 | 技術 |
|------|------|
| 3D 場景 | Three.js（MIT License，免費） |
| ASCII 渲染 | GPU Fragment Shader（字元 sprite sheet + 亮度對應） |
| 深度圖視差 | 自訂 ShaderMaterial（depth map + 滑鼠 uniform） |
| 後處理管線 | postprocessing 套件的 EffectComposer |
| 動畫控制 | GSAP 驅動 shader uniform |
| 手機降級 | 靜態 fallback 圖片 |

---

## 所需素材

1. **原圖**（`hero.jpg`）— 人像或視覺主圖
2. **深度圖**（`hero-depth.jpg`）— 灰階圖，亮 = 近、暗 = 遠
   - 可用 AI 工具生成（如 Hugging Face 的 Depth Anything、MiDaS）
   - 或用 Photoshop / GIMP 手動繪製

---

## 實作步驟

### Step 1：安裝依賴

```bash
npm install three postprocessing
```

- `three`：~170KB gzipped（tree-shaken 後 ~100-150KB）
- `postprocessing`：ASCII 後處理所需

### Step 2：準備素材

- [ ] 準備 Hero 原圖（建議 16:9 或匹配 Hero 區域比例）
- [ ] 生成對應的 depth map
- [ ] 放置於 `public/images/hero/` 目錄

### Step 3：建立 Three.js 場景

建立 `src/scripts/hero-ascii.ts`：

1. 建立 `WebGLRenderer`、`OrthographicCamera`
2. 建立全螢幕 `PlaneGeometry(2, 2)`
3. 載入原圖 + depth map 作為 texture（`TextureLoader`）
4. 建立自訂 `ShaderMaterial`：
   - **Vertex Shader**：passthrough（傳遞 UV）
   - **Fragment Shader**：
     - 讀取 depth map 灰度值
     - 根據滑鼠位置 + 深度值偏移 UV 座標（視差效果）
     - 輸出偏移後的原圖像素色彩
5. Renderer 掛載到 Hero 區塊內的 `<canvas>` 容器

### Step 4：ASCII 後處理

1. 建立字元 sprite sheet：
   - 用 Canvas 2D 將字元集預先繪製到一張 texture
   - 字元集（依亮度排序）：` .:-=+*#%@` 或 good-fella 同款
2. 建立 ASCII Fragment Shader（後處理 pass）：
   - 將畫面分割成 cell grid（如 8x16px 每格）
   - 每格取平均亮度
   - 根據亮度從 sprite sheet 取對應字元
   - 輸出字元像素
3. 用 `EffectComposer` 串接：Render Pass → ASCII Pass

### Step 5：滑鼠互動（深度圖視差）

1. `mousemove` 監聽滑鼠位置，normalize 到 -1~1
2. 用 lerp 平滑化（factor ~0.05）
3. 每幀更新 `uMouse` uniform
4. Shader 根據 `depth * mouse * intensity` 偏移 UV

### Step 6：入場動畫

1. 初始狀態：`opacity: 0` 或 `scale: 0`
2. GSAP timeline 控制：
   - 揭示動畫（可選方式）：
     - **簡單版**：opacity 0→1 + scale 微調（0.6-1.2s）
     - **進階版**：noise mask / gooey blob（shader uniform `uProgress` 0→1）
   - 視差 intensity 從 0 漸入到目標值
3. 配合 Hero 其他元素的 stagger 時序

### Step 7：響應式 & 手機降級

1. **觸控裝置偵測**：`ontouchstart` / `maxTouchPoints` / `(hover: none)`
2. 觸控裝置：隱藏 canvas，顯示 `<img>` 靜態 fallback
3. **Resize 處理**：監聽 `resize` 事件，更新 renderer size + camera
4. **prefers-reduced-motion**：跳過動畫，直接顯示最終狀態

### Step 8：Astro 整合

1. Hero.astro 內加入 canvas 容器：
   ```html
   <div class="hero__ascii" id="hero-ascii">
     <canvas id="hero-ascii-canvas"></canvas>
     <img src="/images/hero/hero-fallback.jpg" class="hero__ascii-fallback" alt="" />
   </div>
   ```
2. BaseLayout.astro 引入腳本：
   ```html
   <script src="../../scripts/hero-ascii.ts"></script>
   ```
3. 遵循專案 init/cleanup pattern（AbortController + `astro:page-load`）

---

## 檔案結構

```
src/
├── scripts/
│   └── hero-ascii.ts          # Three.js 場景 + shader + 動畫
├── shaders/                    # （新建目錄）
│   ├── ascii.frag.glsl        # ASCII 後處理 fragment shader
│   ├── ascii.vert.glsl        # ASCII 後處理 vertex shader
│   ├── depth.frag.glsl        # 深度圖視差 fragment shader
│   └── depth.vert.glsl        # 深度圖視差 vertex shader
├── components/
│   └── sections/
│       └── Hero.astro          # 加入 canvas 容器 + fallback
public/
├── images/
│   └── hero/
│       ├── hero.jpg            # 原圖
│       ├── hero-depth.jpg      # 深度圖
│       └── hero-fallback.jpg   # 手機版 fallback
```

---

## 效能預估

| 指標 | 預估值 |
|------|--------|
| FPS（桌面） | 50-60 FPS |
| Bundle 增加 | ~170KB gz（three）+ postprocessing |
| 記憶體 | ~10-15MB（texture + scene） |
| 手機版 | 靜態圖片，零效能影響 |

---

## 實作順序建議

1. **Step 1-2**：安裝 + 準備素材
2. **Step 3**：先做深度圖視差（不含 ASCII），確認滑鼠互動正常
3. **Step 4**：加上 ASCII 後處理
4. **Step 5**：整合滑鼠互動
5. **Step 6**：入場動畫
6. **Step 7-8**：響應式 / 手機降級 / Astro 整合

每步完成後測試，逐步疊加，避免一次做太多除錯困難。

---

## 參考資源

- [Three.js 官方文件](https://threejs.org/docs/)
- [isladjan/ascii — GPU Shader ASCII](https://github.com/isladjan/ascii)
- [Codrops — Fake 3D Image Effect with WebGL](https://tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/)
- [Efecto — ASCII and Dithering with WebGL Shaders](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/)

---

**最後更新**：2026-03-30
**狀態**：已完成（Hero + Contact 雙實例）
