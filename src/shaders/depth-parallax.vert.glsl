// ==========================================================================
// Depth Parallax — Vertex Shader
//
// 全螢幕 quad 用的 passthrough vertex shader。
// 直接使用 position 作為 clip space 座標（PlaneGeometry(2,2) 填滿 -1~1）。
// 不經過 projectionMatrix / modelViewMatrix — 因為 camera 是 OrthographicCamera(-1,1,1,-1)。
//
// 共用於 Hero 和 Contact 的 depth parallax pass。
// 搭配：depth-parallax.frag.glsl
// ==========================================================================

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
