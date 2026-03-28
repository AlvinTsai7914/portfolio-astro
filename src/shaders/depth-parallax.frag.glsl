uniform sampler2D uTexture;
uniform sampler2D uDepth;
uniform vec2 uMouse;
uniform float uIntensity;
uniform vec2 uImageSize;    // 原圖尺寸（px）
uniform vec2 uViewportSize; // 容器尺寸（px）

varying vec2 vUv;

// Contain 模式 UV 計算（類似 CSS object-fit: contain 置中）
vec2 containUv(vec2 uv, vec2 imageSize, vec2 viewportSize) {
  float imageAspect = imageSize.x / imageSize.y;
  float viewportAspect = viewportSize.x / viewportSize.y;

  vec2 scale;
  if (viewportAspect > imageAspect) {
    // 容器比圖片寬 → 圖片高度填滿，寬度留白
    scale = vec2(imageAspect / viewportAspect, 1.0);
  } else {
    // 容器比圖片窄 → 圖片寬度填滿，高度留白
    scale = vec2(1.0, viewportAspect / imageAspect);
  }

  return (uv - 0.5) / scale + 0.5;
}

void main() {
  // 計算 contain UV（置中，不裁切）
  vec2 containedUv = containUv(vUv, uImageSize, uViewportSize);

  // 超出 0~1 範圍的部分透明
  if (containedUv.x < 0.0 || containedUv.x > 1.0 || containedUv.y < 0.0 || containedUv.y > 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // 讀取 depth map 灰度值（白=近，黑=遠）
  float depth = texture2D(uDepth, containedUv).r;

  // 根據深度和滑鼠位置偏移 UV（近的偏移多，遠的偏移少）
  vec2 displacement = uMouse * depth * uIntensity;

  // 取偏移後的原圖顏色
  vec2 finalUv = containedUv + displacement;
  gl_FragColor = texture2D(uTexture, finalUv);
}
