// 雙圖層 ASCII 後處理
// Layer 1: 人物（先揭示）
// Layer 2: 法杖（後揭示）

uniform sampler2D tLayer1;      // 人物 render target
uniform sampler2D tLayer2;      // 法杖 render target
uniform sampler2D uCharAtlas;   // 字元 sprite sheet
uniform vec2 uResolution;       // 畫布尺寸（px）
uniform vec2 uCellSize;         // 每格像素大小 (width, height)
uniform float uCharCount;       // 字元集字元數量
uniform vec3 uBgColor;          // 背景色
uniform vec3 uFgColor;          // 前景色（字元色）
uniform float uColorMix;        // 0 = 單色, 1 = 保留原圖色彩
uniform float uReveal1;         // 人物揭示進度（0→1）
uniform float uReveal2;         // 法杖揭示進度（0→1）
uniform sampler2D uRevealMap;   // 人物揭示順序圖（徑向漸層）
uniform vec2 uStaffCenter;      // 法杖中心點（UV）
uniform float uViewportAspect;  // 容器寬高比

varying vec2 vUv;

// 計算單一像素的 ASCII 字元 alpha
float getCharAlpha(float brightness, vec2 cellUv) {
  float charIndex = floor((1.0 - brightness) * (uCharCount - 1.0) + 0.5);
  charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);
  float atlasX = (charIndex + cellUv.x) / uCharCount;
  return texture2D(uCharAtlas, vec2(atlasX, cellUv.y)).r;
}

void main() {
  // Cell 位置
  vec2 pixel = vUv * uResolution;
  vec2 cell = floor(pixel / uCellSize);
  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec2 cellUv = fract(pixel / uCellSize);

  // 取兩個圖層的顏色
  vec4 color1 = texture2D(tLayer1, cellCenter);
  vec4 color2 = texture2D(tLayer2, cellCenter);

  // 人物揭示（使用 reveal map 徑向擴散）
  float revealOrder1 = texture2D(uRevealMap, vUv).r;
  float edge1 = 0.05;
  float threshold1 = uReveal1 * (1.0 + edge1 * 2.0);
  float opacity1 = 1.0 - smoothstep(threshold1 - edge1, threshold1 + edge1, revealOrder1);

  // 法杖揭示（從中心向兩端徑向擴散）
  vec2 staffDiff = vUv - uStaffCenter;
  staffDiff.x *= uViewportAspect;
  float staffDist = length(staffDiff);
  float staffMaxDist = length(vec2(uViewportAspect, 1.0)) * 0.35;
  float staffOrder = staffDist / staffMaxDist;
  float edge2 = 0.08;
  float threshold2 = uReveal2 * (1.0 + edge2 * 2.0);
  float opacity2 = 1.0 - smoothstep(threshold2 - edge2, threshold2 + edge2, staffOrder);

  // 右下角遮蔽（隱藏 Gemini logo）
  if (vUv.x > 0.7 && vUv.y < 0.12) {
    gl_FragColor = vec4(uBgColor, 1.0);
    return;
  }

  // 判斷哪個圖層有內容（亮度 > 閾值 = 有內容）
  float bright1 = dot(color1.rgb, vec3(0.299, 0.587, 0.114));
  float bright2 = dot(color2.rgb, vec3(0.299, 0.587, 0.114));
  bool hasContent1 = bright1 > 0.08;
  bool hasContent2 = bright2 > 0.02;

  // 決定最終使用的顏色和 opacity
  // 法杖疊在人物上方（如果兩層都有內容，法杖優先）
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

  // ASCII 字元渲染
  float charAlpha = getCharAlpha(finalBrightness, cellUv);
  vec3 charColor = mix(uFgColor, sourceColor, uColorMix);
  vec3 finalColor = mix(uBgColor, charColor, charAlpha * finalOpacity);
  gl_FragColor = vec4(finalColor, 1.0);
}
