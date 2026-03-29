// ==========================================================================
// ASCII Effect 共用工具
// 提供 createCharAtlas 和 createDepthScene 給 hero-ascii / contact-ascii 共用
// ==========================================================================

import * as THREE from "three";

// --------------------------------------------------------------------------
// 字元 Sprite Sheet
// --------------------------------------------------------------------------
export function createCharAtlas(
  chars: string,
  cellHeight: number,
  charAspect: number,
): THREE.CanvasTexture {
  const charWidth = Math.ceil(cellHeight * charAspect);
  const canvas = document.createElement("canvas");
  canvas.width = charWidth * chars.length;
  canvas.height = cellHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = `${cellHeight}px "Geist Mono", "Noto Sans Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], charWidth * i + charWidth / 2, cellHeight / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
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
