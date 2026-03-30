// ==========================================================================
// ASCII Post-Processing — Vertex Shader
//
// ASCII pass 的全螢幕 quad vertex shader。
// 使用 Three.js 內建的 projectionMatrix / modelViewMatrix
// （因為 ASCII pass 的 scene 由 Three.js OrthographicCamera 管理）。
//
// 注意：這裡用 projectionMatrix 而 depth-parallax.vert.glsl 不用，
// 是因為 depth pass 直接用 position 作 clip space（PlaneGeometry(2,2) = NDC），
// 而 ASCII pass 依賴 Three.js 的 camera 投影矩陣。
//
// 共用於 Hero（ascii.frag.glsl）和 Contact（ascii-contact.frag.glsl）。
// ==========================================================================

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
