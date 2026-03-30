// ==========================================================================
// Depth Parallax — Fragment Shader
//
// 根據 depth map 和滑鼠位置偏移 UV，產生偽 3D 視差效果。
// 圖片以 contain 模式置中顯示（不裁切），超出範圍輸出透明。
//
// 如果傳入純白 depth texture（所有像素 = 1.0），
// 所有像素偏移量相同 → 退化為 2D 平移（Contact 使用此技巧）。
//
// 共用於 Hero 和 Contact 的所有圖層。
// 搭配：depth-parallax.vert.glsl
//
// Uniforms（由 ascii-helpers.ts 的 createDepthScene 設定）：
//   uTexture      — 原圖
//   uDepth        — depth map（灰階：白=近/偏移多，黑=遠/偏移少）
//   uMouse        — 滑鼠位置（-1~1，每幀由 JS 更新）
//   uIntensity    — 視差強度（入場動畫從 0 漸入）
//   uImageSize    — 原圖尺寸（px，用於 contain UV 計算）
//   uViewportSize — 容器尺寸（px，用於 contain UV 計算）
// ==========================================================================

uniform sampler2D uTexture;
uniform sampler2D uDepth;
uniform vec2 uMouse;
uniform float uIntensity;
uniform vec2 uImageSize;
uniform vec2 uViewportSize;

varying vec2 vUv;

// Contain 模式 UV 計算（類似 CSS object-fit: contain）
// 圖片完整顯示並置中，不裁切，超出範圍的 UV 會 > 1 或 < 0
vec2 containUv(vec2 uv, vec2 imageSize, vec2 viewportSize) {
  float imageAspect = imageSize.x / imageSize.y;
  float viewportAspect = viewportSize.x / viewportSize.y;

  vec2 scale;
  if (viewportAspect > imageAspect) {
    // 容器比圖片寬 → 圖片高度填滿，左右留白
    scale = vec2(imageAspect / viewportAspect, 1.0);
  } else {
    // 容器比圖片窄 → 圖片寬度填滿，上下留白
    scale = vec2(1.0, viewportAspect / imageAspect);
  }

  // 除以 scale = 放大 UV 範圍，再偏移回中心
  return (uv - 0.5) / scale + 0.5;
}

void main() {
  vec2 containedUv = containUv(vUv, uImageSize, uViewportSize);

  // 超出圖片範圍 → 透明（讓上層 ASCII shader 判斷為無內容）
  if (containedUv.x < 0.0 || containedUv.x > 1.0 || containedUv.y < 0.0 || containedUv.y > 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // depth map 灰度值：1.0（白/近）= 偏移多，0.0（黑/遠）= 偏移少
  float depth = texture2D(uDepth, containedUv).r;

  // 視差偏移：mouse × depth × intensity
  vec2 displacement = uMouse * depth * uIntensity;

  gl_FragColor = texture2D(uTexture, containedUv + displacement);
}
