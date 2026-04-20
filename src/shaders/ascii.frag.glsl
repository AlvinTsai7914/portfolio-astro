// ==========================================================================
// Hero ASCII — Fragment Shader（2 層，不透明背景）
//
// 將 depth parallax 的渲染結果轉換為 ASCII 字元畫面。
// 雙圖層合成：Layer 1（人物）+ Layer 2（法杖）。
//
// 渲染流程（每像素）：
//   1. 計算所在 cell（ASCII 格子）的中心座標
//   2. 從兩個 RenderTarget 取樣該 cell 的顏色
//   3. 根據揭示進度（reveal）決定是否顯示
//   4. 用亮度查表從 charAtlas 取對應的 ASCII 字元圖案
//   5. 混合字元色（含 hover 光圈）與背景色
//
// 揭示方式：
//   Layer 1 — reveal map 徑向擴散（從頭部向外展開）
//   Layer 2 — 從法杖中心向兩端徑向擴散
//
// 搭配：ascii.vert.glsl、hero-ascii.ts
// ==========================================================================

// ---- 圖層輸入（depth parallax pass 的 RenderTarget）----
uniform sampler2D tLayer1;      // 人物
uniform sampler2D tLayer2;      // 法杖

// ---- ASCII 渲染參數 ----
uniform sampler2D uCharAtlas;   // 字元 sprite sheet（createCharAtlas 產生）
uniform vec2 uResolution;       // 畫布尺寸（px，含 DPR）
uniform vec2 uCellSize;         // 每格像素大小 (width, height)（含 padding）
uniform float uCharCount;       // 字元集長度（ASCII_CHARS.length）
uniform vec3 uBgColor;          // 背景色（#141314）
uniform vec3 uFgColor;          // 字元色（#fd8d68）
uniform float uColorMix;        // 0 = 單色（uFgColor），1 = 原圖色彩

// ---- 揭示控制 ----
uniform float uReveal1;         // 人物揭示進度 0→1
uniform float uReveal2;         // 法杖揭示進度 0→1
uniform sampler2D uRevealMap;   // 人物揭示順序圖（灰階：黑=先出現，白=後出現）
uniform vec2 uStaffCenter;      // 法杖中心點（UV 座標，徑向擴散的起點）
uniform float uViewportAspect;  // 容器寬高比（修正徑向距離，避免橢圓變形）

// ---- Hover 光圈 ----
uniform vec2 uMouseUv;          // 滑鼠位置（UV 0-1，相對於容器）
uniform float uHoverRadius;     // 光圈半徑（UV 比例，0.12 ≈ 畫面 12%）
uniform vec3 uHoverColor;       // 光圈內字元顏色（白色 #eeeeee）

varying vec2 vUv;

// 根據亮度從 charAtlas 取對應字元的 alpha 值
// brightness 0（暗）→ 密集字元（如 @#），brightness 1（亮）→ 稀疏字元（如 .空格）
float getCharAlpha(float brightness, vec2 cellUv) {
  float charIndex = floor((1.0 - brightness) * (uCharCount - 1.0) + 0.5);
  charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);
  float atlasX = (charIndex + cellUv.x) / uCharCount;
  return texture2D(uCharAtlas, vec2(atlasX, cellUv.y)).r;
}

void main() {
  // ---- Cell 計算 ----
  // 將畫面分割成 ASCII 格子，取每格中心點的顏色（而非逐像素）
  vec2 pixel = vUv * uResolution;
  vec2 cell = floor(pixel / uCellSize);
  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec2 cellUv = fract(pixel / uCellSize); // 格子內的局部 UV（0-1）

  // ---- 圖層取色 ----
  vec4 color1 = texture2D(tLayer1, cellCenter);
  vec4 color2 = texture2D(tLayer2, cellCenter);

  // ---- Layer 1 揭示：reveal map 驅動 ----
  // revealMap 灰度值越小 → 越早出現（頭部黑色 = 最先）
  float revealOrder1 = texture2D(uRevealMap, vUv).r;
  float edge1 = 0.05; // 揭示邊緣柔化寬度
  float threshold1 = uReveal1 * (1.0 + edge1 * 2.0);
  float opacity1 = uReveal1 > 0.0
    ? 1.0 - smoothstep(threshold1 - edge1, threshold1 + edge1, revealOrder1)
    : 0.0;

  // ---- Layer 2 揭示：從法杖中心徑向擴散 ----
  vec2 staffDiff = vUv - uStaffCenter;
  staffDiff.x *= uViewportAspect; // 修正寬高比
  float staffDist = length(staffDiff);
  float staffMaxDist = length(vec2(uViewportAspect, 1.0)) * 0.5; // 擴散範圍上限（0.5 確保手機窄視窗也能涵蓋法杖右上角）
  float staffOrder = staffDist / staffMaxDist;
  float edge2 = 0.08;
  float threshold2 = uReveal2 * (1.0 + edge2 * 2.0);
  float opacity2 = uReveal2 > 0.0
    ? 1.0 - smoothstep(threshold2 - edge2, threshold2 + edge2, staffOrder)
    : 0.0;

  // ---- 右下角遮蔽（隱藏 Gemini SynthID 浮水印）----
  // Gemini AI 生成的圖片嵌入了不可見的 SynthID 浮水印，
  // 在 ASCII 亮度轉換後會顯現為星形圖案。直接遮蔽該區域。
  if (vUv.x > 0.7 && vUv.y < 0.12) {
    gl_FragColor = vec4(uBgColor, 1.0);
    return;
  }

  // ---- 圖層合成 ----
  // 用亮度判斷是否有內容（> 0.05 = 非黑色背景）
  // 法杖優先（Layer 2 蓋在 Layer 1 上方）
  float bright1 = dot(color1.rgb, vec3(0.299, 0.587, 0.114));
  float bright2 = dot(color2.rgb, vec3(0.299, 0.587, 0.114));
  bool hasContent1 = bright1 > 0.05;
  bool hasContent2 = bright2 > 0.05;

  float finalBrightness;
  float finalOpacity;
  vec3 sourceColor;

  if (hasContent2 && opacity2 > 0.01) {
    finalBrightness = bright2;
    finalOpacity = opacity2;
    sourceColor = color2.rgb;
  } else if (hasContent1 && opacity1 > 0.01) {
    finalBrightness = bright1;
    finalOpacity = opacity1;
    sourceColor = color1.rgb;
  } else {
    gl_FragColor = vec4(uBgColor, 1.0);
    return;
  }

  // ---- 亮度截斷 + 對比度增強 ----
  // 低亮度像素直接捨棄（不渲染字元），產生「從黑色中浮現」的效果
  float cutoff = 0.1;       // 低於此亮度 → 純背景
  float contrast = 1.0;      // 對比度增強倍率
  float adjustedBrightness = (finalBrightness - cutoff) / (1.0 - cutoff); // 重新映射到 0-1
  adjustedBrightness = clamp(adjustedBrightness, 0.0, 1.0);
  adjustedBrightness = pow(adjustedBrightness, 1.0 / contrast); // gamma 增強亮部

  if (adjustedBrightness < 0.01) {
    gl_FragColor = vec4(uBgColor, 1.0);
    return;
  }

  // ---- ASCII 字元渲染 ----
  float charAlpha = getCharAlpha(adjustedBrightness, cellUv);
  vec3 charColor = mix(uFgColor, sourceColor, uColorMix);

  // ---- Hover 光圈 ----
  // 滑鼠附近的字元從 uFgColor 漸變為 uHoverColor（白色）
  vec2 mouseDiff = vUv - uMouseUv;
  mouseDiff.x *= uViewportAspect;
  float mouseDist = length(mouseDiff);
  float hoverMix = 1.0 - smoothstep(0.0, uHoverRadius, mouseDist);
  charColor = mix(charColor, uHoverColor, hoverMix);

  // ---- 最終輸出（不透明背景）----
  vec3 finalColor = mix(uBgColor, charColor, charAlpha * finalOpacity);
  gl_FragColor = vec4(finalColor, 1.0);
}
