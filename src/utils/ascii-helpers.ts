// ==========================================================================
// ASCII Effect 共用工具
// ==========================================================================

import * as THREE from "three";

// --------------------------------------------------------------------------
// 共用常數
// --------------------------------------------------------------------------
export const ASCII_CELL_SIZE = 5;
export const CHAR_ASPECT = 0.6;
export const MOUSE_LERP = 0.05;
export const ASCII_CHARS = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
export const ASCII_BG_COLOR = new THREE.Color(0x141314);
export const ASCII_FG_COLOR = new THREE.Color(0xfd8d68);
export const ASCII_COLOR_MIX = 0.0;
export const ENTRANCE_EASE = "power2.out";

// --------------------------------------------------------------------------
// Texture 載入
// --------------------------------------------------------------------------
const loader = new THREE.TextureLoader();

export function loadTexture(path: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) =>
    loader.load(path, resolve, undefined, () => reject(new Error(`Failed to load: ${path}`))),
  );
}

// --------------------------------------------------------------------------
// 字元 Sprite Sheet
// --------------------------------------------------------------------------
export function createCharAtlas(
  chars: string,
  cellHeight: number,
  charAspect: number,
  paddingX = 1, // 水平間距（px），左右各留
  paddingY = 0, // 垂直間距（px），上下各留
): THREE.CanvasTexture {
  const fontSize = cellHeight; // 字體大小不變
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
// Depth Parallax 場景（可重用於任意圖層）
// --------------------------------------------------------------------------
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
