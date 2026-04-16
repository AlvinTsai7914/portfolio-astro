// ==========================================================================
// ASCII Effect 共用工具
//
// Hero ASCII（hero-ascii.ts）和 Contact ASCII（contact-ascii.ts）共用的
// 常數、函數和 Texture 載入邏輯。修改此檔會同時影響兩個效果。
//
// 相關檔案：
//   src/scripts/hero-ascii.ts     — Hero 區塊 ASCII 效果
//   src/scripts/contact-ascii.ts  — Contact 區塊 ASCII 效果
//   src/shaders/ascii.frag.glsl   — Hero 專用 ASCII shader（2 層，不透明背景）
//   src/shaders/ascii-contact.frag.glsl — Contact 專用 ASCII shader（3 層，透明背景）
//   src/shaders/depth-parallax.frag.glsl — 共用深度視差 shader
// ==========================================================================

import * as THREE from "three";

// --------------------------------------------------------------------------
// 共用常數
//
// 這些值被 hero-ascii.ts 和 contact-ascii.ts 共同引用。
// 各效果的專用常數（如 PARALLAX_INTENSITY、動畫時間）定義在各自的 .ts 檔案中。
// --------------------------------------------------------------------------

/** ASCII 格子高度（px，不含 DPR）。越小字元越密、細節越多，但 GPU 負擔越重 */
export const ASCII_CELL_SIZE = 5;

// --------------------------------------------------------------------------
// 裝置適配（Hero / Contact 共用）
// --------------------------------------------------------------------------
/** 手機版判定斷點 */
export const MOBILE_BREAKPOINT = 768;

/** 手機版 ASCII 格子高度（比桌面版大 → 字元更少 → 效能更好） */
export const MOBILE_CELL_SIZE = 6;

/** 手機版 DPR 上限（效能優先） */
export const MOBILE_DPR = 1;

/** 等寬字體的寬高比（寬 ≈ 0.6 × 高） */
export const CHAR_ASPECT = 0.6;

/** 滑鼠跟隨的平滑因子（lerp）。越小延遲感越重，越大越即時 */
export const MOUSE_LERP = 0.05;

/** ASCII 字元集，依亮度排序：左邊 = 亮（稀疏），右邊 = 暗（密集） */
export const ASCII_CHARS = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

/** ASCII 字元背景色（對應 dark theme 的 --color-background: #141314） */
export const ASCII_BG_COLOR = new THREE.Color(0x141314);

/** ASCII 字元前景色（品牌色淡化版 --color-brand-muted: #fd8d68） */
export const ASCII_FG_COLOR = new THREE.Color(0xfd8d68);

/** 色彩混合模式：0 = 單色（只用 FG_COLOR），1 = 保留原圖色彩 */
export const ASCII_COLOR_MIX = 0.0;

/** 入場動畫緩動函數 */
export const ENTRANCE_EASE = "power2.out";

// --------------------------------------------------------------------------
// Texture 載入
// --------------------------------------------------------------------------
const loader = new THREE.TextureLoader();

/**
 * 載入圖片為 Three.js Texture。載入失敗時 reject 並顯示路徑。
 * 使用共用的 TextureLoader 實例（避免重複建立）。
 */
export function loadTexture(path: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) =>
    loader.load(path, resolve, undefined, () => reject(new Error(`Failed to load: ${path}`))),
  );
}

// --------------------------------------------------------------------------
// 字元 Sprite Sheet
//
// 產生一張水平排列的字元圖集（Canvas → Texture）。
// ASCII shader 根據像素亮度從中取出對應字元的圖案。
//
// 結構示意（每格 = 一個字元）：
//   [ ' ' ][ . ][ ' ][ ` ][ ^ ] ... [ $ ]
//   ←───── charWidth × chars.length ─────→
//
// paddingX/Y 控制字元間距（格子變大，字體不變）。
// --------------------------------------------------------------------------

/**
 * @param chars     字元集字串（依亮度排序）
 * @param cellHeight 格子高度（px，應含 DPR：ASCII_CELL_SIZE * dpr）
 * @param charAspect 字元寬高比（等寬字體約 0.6）
 * @param paddingX   水平間距（px），左右各留。增加此值 → 字元水平間距變大
 * @param paddingY   垂直間距（px），上下各留。增加此值 → 字元垂直間距變大
 * @returns { texture, cellWidth, cellHeight } — texture 和實際格子尺寸（含 padding）
 */
export function createCharAtlas(
  chars: string,
  cellHeight: number,
  charAspect: number,
  paddingX = 1,
  paddingY = 0,
) {
  const fontSize = cellHeight;
  const charWidth = Math.ceil(cellHeight * charAspect) + paddingX * 2;
  const totalHeight = cellHeight + paddingY * 2;
  const canvas = document.createElement("canvas");
  canvas.width = charWidth * chars.length;
  canvas.height = totalHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px "Geist Mono", "Noto Sans Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], charWidth * i + charWidth / 2, totalHeight / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return { texture, cellWidth: charWidth, cellHeight: totalHeight };
}

// --------------------------------------------------------------------------
// Depth Parallax 場景
//
// 建立一個全螢幕 quad 場景，用自訂 shader 實現：
//   1. 讀取原圖 texture
//   2. 讀取 depth map（灰階：白=近，黑=遠）
//   3. 根據滑鼠位置 + 深度值偏移 UV → 產生偽 3D 視差效果
//
// 如果傳入純白 depth texture，所有像素偏移量相同 → 變成 2D 平移。
// Contact 效果使用此技巧實現無深度的等量平移。
// --------------------------------------------------------------------------

/**
 * @param texture       原圖 texture
 * @param depthTexture  depth map texture（灰階，或純白 = 2D 平移）
 * @param viewportW     容器寬度（px）
 * @param viewportH     容器高度（px）
 * @param vertexShader   depth-parallax.vert.glsl 原始碼（透過 ?raw import）
 * @param fragmentShader depth-parallax.frag.glsl 原始碼（透過 ?raw import）
 * @returns { scene, camera, uniforms, material, geometry }
 *
 * uniforms.uMouse    — 每幀由呼叫端更新（滑鼠位置 -1~1）
 * uniforms.uIntensity — 入場動畫從 0 漸入到目標值
 */
export function createDepthScene(
  texture: THREE.Texture,
  depthTexture: THREE.Texture,
  viewportW: number,
  viewportH: number,
  vertexShader: string,
  fragmentShader: string,
) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTexture: { value: texture },
    uDepth: { value: depthTexture },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uIntensity: { value: 0 },
    uImageSize: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
    uViewportSize: { value: new THREE.Vector2(viewportW, viewportH) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));

  return { scene, camera, uniforms, material, geometry };
}
