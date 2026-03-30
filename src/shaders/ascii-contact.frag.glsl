// ==========================================================================
// Contact ASCII — Fragment Shader（3 層，透明背景）
//
// 與 Hero 版（ascii.frag.glsl）的差異：
//   - 3 個圖層（角色依序出現），而非 2 個
//   - 揭示方式：簡單 opacity fade（uReveal 0→1），無 reveal map / 徑向擴散
//   - 輸出為 premultiplied alpha（透明背景，融入 section）
//   - Hero 版輸出不透明（vec4(color, 1.0) + uBgColor 填充）
//
// 搭配：ascii.vert.glsl、contact-ascii.ts
// ==========================================================================

// ---- 圖層輸入（depth parallax pass 的 RenderTarget）----
uniform sampler2D tLayer1;      // 海塔
uniform sampler2D tLayer2;      // 修塔爾克
uniform sampler2D tLayer3;      // 芙莉蓮 + 費倫

// ---- ASCII 渲染參數（與 Hero 版相同）----
uniform sampler2D uCharAtlas;
uniform vec2 uResolution;
uniform vec2 uCellSize;
uniform float uCharCount;
uniform vec3 uBgColor;
uniform vec3 uFgColor;
uniform float uColorMix;

// ---- 揭示控制（簡單 opacity fade）----
uniform float uReveal1;         // 海塔揭示進度 0→1
uniform float uReveal2;         // 修塔爾克揭示進度 0→1
uniform float uReveal3;         // 芙莉蓮+費倫揭示進度 0→1

// ---- Hover 光圈（與 Hero 版相同）----
uniform float uViewportAspect;
uniform vec2 uMouseUv;
uniform float uHoverRadius;
uniform vec3 uHoverColor;

varying vec2 vUv;

// 根據亮度從 charAtlas 取對應字元的 alpha 值（與 Hero 版相同）
float getCharAlpha(float brightness, vec2 cellUv) {
  float charIndex = floor((1.0 - brightness) * (uCharCount - 1.0) + 0.5);
  charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);
  float atlasX = (charIndex + cellUv.x) / uCharCount;
  return texture2D(uCharAtlas, vec2(atlasX, cellUv.y)).r;
}

void main() {
  // ---- Cell 計算 ----
  vec2 pixel = vUv * uResolution;
  vec2 cell = floor(pixel / uCellSize);
  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec2 cellUv = fract(pixel / uCellSize);

  // ---- 右下角遮蔽（Gemini SynthID 浮水印）----
  if (vUv.x > 0.88 && vUv.y < 0.08) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // ---- 圖層取色 + 亮度計算 ----
  vec4 c1 = texture2D(tLayer1, cellCenter);
  vec4 c2 = texture2D(tLayer2, cellCenter);
  vec4 c3 = texture2D(tLayer3, cellCenter);

  float b1 = dot(c1.rgb, vec3(0.299, 0.587, 0.114));
  float b2 = dot(c2.rgb, vec3(0.299, 0.587, 0.114));
  float b3 = dot(c3.rgb, vec3(0.299, 0.587, 0.114));

  // ---- 圖層合成：Layer 3 > 2 > 1（後面蓋前面）----
  // 0.05 = 亮度閾值，低於此值視為黑色背景（無內容）
  // 0.01 = reveal 閾值，低於此值視為尚未揭示
  float finalBrightness;
  float finalOpacity;
  vec3 sourceColor;
  bool hasContent = false;

  if (b3 > 0.05 && uReveal3 > 0.01) {
    finalBrightness = b3;
    finalOpacity = uReveal3;
    sourceColor = c3.rgb;
    hasContent = true;
  } else if (b2 > 0.05 && uReveal2 > 0.01) {
    finalBrightness = b2;
    finalOpacity = uReveal2;
    sourceColor = c2.rgb;
    hasContent = true;
  } else if (b1 > 0.05 && uReveal1 > 0.01) {
    finalBrightness = b1;
    finalOpacity = uReveal1;
    sourceColor = c1.rgb;
    hasContent = true;
  }

  // 無內容 → 透明（與 Hero 版不同：Hero 輸出 uBgColor）
  if (!hasContent) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // ---- ASCII 字元渲染 ----
  float charAlpha = getCharAlpha(finalBrightness, cellUv);
  vec3 charColor = mix(uFgColor, sourceColor, uColorMix);

  // ---- Hover 光圈 ----
  vec2 mouseDiff = vUv - uMouseUv;
  mouseDiff.x *= uViewportAspect;
  float mouseDist = length(mouseDiff);
  float hoverMix = 1.0 - smoothstep(0.0, uHoverRadius, mouseDist);
  charColor = mix(charColor, uHoverColor, hoverMix);

  // ---- 最終輸出（premultiplied alpha — 透明背景）----
  // 與 Hero 版的 vec4(finalColor, 1.0) 不同
  float alpha = charAlpha * finalOpacity;
  gl_FragColor = vec4(charColor * alpha, alpha);
}
