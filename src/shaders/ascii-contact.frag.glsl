// 4 圖層 ASCII 後處理（Contact 區塊用）
// Layer 1: 場景（持續顯示）
// Layer 2-4: 角色（依序出現）

uniform sampler2D tLayer1;
uniform sampler2D tLayer2;
uniform sampler2D tLayer3;
uniform sampler2D tLayer4;
uniform sampler2D uCharAtlas;
uniform vec2 uResolution;
uniform vec2 uCellSize;
uniform float uCharCount;
uniform vec3 uBgColor;
uniform vec3 uFgColor;
uniform float uColorMix;
uniform float uReveal1;
uniform float uReveal2;
uniform float uReveal3;
uniform float uReveal4;
uniform float uViewportAspect;
uniform vec2 uMouseUv;
uniform float uHoverRadius;
uniform vec3 uHoverColor;

varying vec2 vUv;

float getCharAlpha(float brightness, vec2 cellUv) {
  float charIndex = floor((1.0 - brightness) * (uCharCount - 1.0) + 0.5);
  charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);
  float atlasX = (charIndex + cellUv.x) / uCharCount;
  return texture2D(uCharAtlas, vec2(atlasX, cellUv.y)).r;
}

void main() {
  vec2 pixel = vUv * uResolution;
  vec2 cell = floor(pixel / uCellSize);
  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec2 cellUv = fract(pixel / uCellSize);

  // 右下角遮蔽（Gemini SynthID）
  if (vUv.x > 0.88 && vUv.y < 0.08) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // 取 4 個圖層的顏色
  vec4 c1 = texture2D(tLayer1, cellCenter);
  vec4 c2 = texture2D(tLayer2, cellCenter);
  vec4 c3 = texture2D(tLayer3, cellCenter);
  vec4 c4 = texture2D(tLayer4, cellCenter);

  float b1 = dot(c1.rgb, vec3(0.299, 0.587, 0.114));
  float b2 = dot(c2.rgb, vec3(0.299, 0.587, 0.114));
  float b3 = dot(c3.rgb, vec3(0.299, 0.587, 0.114));
  float b4 = dot(c4.rgb, vec3(0.299, 0.587, 0.114));

  // 合成：Layer 4 > 3 > 2 > 1（後面蓋前面）
  float finalBrightness;
  float finalOpacity;
  vec3 sourceColor;
  bool hasContent = false;

  if (b4 > 0.05 && uReveal4 > 0.01) {
    finalBrightness = b4;
    finalOpacity = uReveal4;
    sourceColor = c4.rgb;
    hasContent = true;
  } else if (b3 > 0.05 && uReveal3 > 0.01) {
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

  if (!hasContent) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // ASCII 字元渲染
  float charAlpha = getCharAlpha(finalBrightness, cellUv);
  vec3 charColor = mix(uFgColor, sourceColor, uColorMix);

  // Hover 光圈
  vec2 mouseDiff = vUv - uMouseUv;
  mouseDiff.x *= uViewportAspect;
  float mouseDist = length(mouseDiff);
  float hoverMix = 1.0 - smoothstep(0.0, uHoverRadius, mouseDist);
  charColor = mix(charColor, uHoverColor, hoverMix);

  float alpha = charAlpha * finalOpacity;
  gl_FragColor = vec4(charColor * alpha, alpha);
}
