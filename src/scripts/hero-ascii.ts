// ==========================================================================
// Hero ASCII Effect — Three.js 雙圖層深度視差 + ASCII 後處理
//
// 架構：
//   Pass 1a: 人物 depth parallax → RenderTarget 1
//   Pass 1b: 法杖 depth parallax → RenderTarget 2
//   Pass 2:  ASCII shader（混合雙圖層 + 各自 reveal）→ 畫面
//
// 文件：docs/hero-ascii-effect.md
// ==========================================================================

import * as THREE from "three";
import { gsap } from "gsap";
import { isTouchDevice, prefersReducedMotion } from "../utils/device";
import {
  createCharAtlas, createDepthScene, loadTexture,
  ASCII_CELL_SIZE, CHAR_ASPECT, MOUSE_LERP, ASCII_CHARS,
  ASCII_BG_COLOR, ASCII_FG_COLOR, ASCII_COLOR_MIX, ENTRANCE_EASE,
  MOBILE_BREAKPOINT, MOBILE_CELL_SIZE, MOBILE_DPR,
} from "../utils/ascii-helpers";
import depthVert from "../shaders/depth-parallax.vert.glsl?raw";
import depthFrag from "../shaders/depth-parallax.frag.glsl?raw";
import asciiVert from "../shaders/ascii.vert.glsl?raw";
import asciiFrag from "../shaders/ascii.frag.glsl?raw";

// --------------------------------------------------------------------------
// Hero 專用常數
// --------------------------------------------------------------------------
const PARALLAX_INTENSITY = 0.03;
const LAYER1_DELAY = 0;
const LAYER1_DURATION = 3;
const LAYER2_DELAY = 1;
const LAYER2_DURATION = 1;

// --------------------------------------------------------------------------
// Reveal Map（Hero 專用：從頭部向外徑向擴散）
// --------------------------------------------------------------------------
function createRevealMap(width: number, height: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.fillRect(0, 0, width, height);

  const headX = width * 0.5;
  const headY = height * 0.1;

  ctx.save();
  ctx.translate(headX, headY);
  ctx.scale(1, 1.6);
  const maxRadius = Math.max(width, height);

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius * 0.7);
  grad.addColorStop(0.0,  "rgb(0, 0, 0)");
  grad.addColorStop(0.12, "rgb(30, 30, 30)");
  grad.addColorStop(0.25, "rgb(84, 84, 84)");
  grad.addColorStop(0.45, "rgb(140, 140, 140)");
  grad.addColorStop(0.65, "rgb(191, 191, 191)");
  grad.addColorStop(0.85, "rgb(230, 230, 230)");
  grad.addColorStop(1.0,  "rgb(255, 255, 255)");

  ctx.fillStyle = grad;
  ctx.fillRect(-headX, -headY / 1.6, width * 2, height * 2);
  ctx.restore();

  // 柔化
  const tempCanvas = document.createElement("canvas");
  const tempSize = 64;
  tempCanvas.width = tempSize;
  tempCanvas.height = tempSize;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.drawImage(canvas, 0, 0, tempSize, tempSize);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tempCanvas, 0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// --------------------------------------------------------------------------
// Init / Cleanup
// --------------------------------------------------------------------------
let abortController: AbortController | null = null;
let glRenderer: THREE.WebGLRenderer | null = null;
let rafId: number | null = null;
let disposables: { dispose: () => void }[] = [];
let entranceTimeline: gsap.core.Timeline | null = null;

function cleanup() {
  abortController?.abort();
  abortController = null;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  entranceTimeline?.kill();
  entranceTimeline = null;

  disposables.forEach((d) => d.dispose());
  disposables = [];

  if (glRenderer) {
    glRenderer.dispose();
    glRenderer.domElement.remove();
    glRenderer = null;
  }
}

function initHeroAscii() {
  cleanup();

  const container = document.getElementById("hero-ascii");
  if (!container) return;

  // 低效能裝置降級：WebGL 不支援時顯示 fallback
  const testCanvas = document.createElement("canvas");
  const hasWebGL = !!(testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"));
  if (!hasWebGL) {
    container.style.display = "none";
    const fallback = document.getElementById("hero-ascii-fallback");
    if (fallback) fallback.style.display = "block";
    return;
  }

  abortController = new AbortController();
  const { signal } = abortController;

  const isTouch = isTouchDevice();
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;

  const w = container.offsetWidth;
  const h = container.offsetHeight;
  const dpr = isMobile ? MOBILE_DPR : Math.min(window.devicePixelRatio, 2);
  const cellSize = isMobile ? MOBILE_CELL_SIZE : ASCII_CELL_SIZE;

  // Renderer
  glRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  glRenderer.setPixelRatio(dpr);
  glRenderer.setSize(w, h);
  glRenderer.setClearColor(ASCII_BG_COLOR);
  container.appendChild(glRenderer.domElement);

  // RenderTargets（兩個圖層各一個）
  const rt1 = new THREE.WebGLRenderTarget(w * dpr, h * dpr);
  const rt2 = new THREE.WebGLRenderTarget(w * dpr, h * dpr);
  disposables.push(rt1, rt2);

  // ASCII pass 場景
  const scene2 = new THREE.Scene();
  const camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const atlas = createCharAtlas(ASCII_CHARS, cellSize * dpr, CHAR_ASPECT);
  const revealMap = createRevealMap(256, 256);
  disposables.push(atlas.texture, revealMap);

  const asciiUniforms = {
    tLayer1: { value: rt1.texture },
    tLayer2: { value: rt2.texture },
    uCharAtlas: { value: atlas.texture },
    uResolution: { value: new THREE.Vector2(w * dpr, h * dpr) },
    uCellSize: { value: new THREE.Vector2(atlas.cellWidth, atlas.cellHeight) },
    uCharCount: { value: ASCII_CHARS.length },
    uBgColor: { value: ASCII_BG_COLOR },
    uFgColor: { value: ASCII_FG_COLOR },
    uColorMix: { value: ASCII_COLOR_MIX },
    uReveal1: { value: 0 },
    uReveal2: { value: 0 },
    uRevealMap: { value: revealMap },
    uStaffCenter: { value: new THREE.Vector2(0.45, 0.45) },
    uViewportAspect: { value: w / h },
    uMouseUv: { value: new THREE.Vector2(-1, -1) }, // 初始在畫面外
    uHoverRadius: { value: 0.12 },
    uHoverColor: { value: new THREE.Color(0xeeeeee) },
  };

  const asciiMaterial = new THREE.ShaderMaterial({
    vertexShader: asciiVert,
    fragmentShader: asciiFrag,
    uniforms: asciiUniforms,
  });
  disposables.push(asciiMaterial);

  const asciiGeometry = new THREE.PlaneGeometry(2, 2);
  disposables.push(asciiGeometry);
  scene2.add(new THREE.Mesh(asciiGeometry, asciiMaterial));

  // --------------------------------------------------------------------------
  // 載入 4 張 texture
  // --------------------------------------------------------------------------
  Promise.all([
    loadTexture("/images/hero/frieren.png"),
    loadTexture("/images/hero/frieren-depth.png"),
    loadTexture("/images/hero/frieren-staff.png"),
    loadTexture("/images/hero/frieren-staff-depth.png"),
  ]).then(([tex1, depth1, tex2, depth2]) => {
    if (!glRenderer) return;

    disposables.push(tex1, depth1, tex2, depth2);

    // 通知遮罩：ASCII 準備完成，可以退場
    window.dispatchEvent(new Event("hero-ascii-ready"));

    // 建立兩個 depth parallax 場景
    const layer1 = createDepthScene(tex1, depth1, w, h, depthVert, depthFrag);
    const layer2 = createDepthScene(tex2, depth2, w, h, depthVert, depthFrag);
    disposables.push(layer1.material, layer1.geometry, layer2.material, layer2.geometry);

    // Input tracking（滑鼠 or 陀螺儀）
    const targetMouse = new THREE.Vector2(0, 0);
    const currentMouse = new THREE.Vector2(0, 0);

    if (isTouch) {
      // ----------------------------------------------------------------------
      // 觸控裝置：停用互動（入場動畫完成後停止 render loop，保留最後一幀）
      // ----------------------------------------------------------------------
      asciiUniforms.uMouseUv.value.set(-1, -1);
    } else {
      // ----------------------------------------------------------------------
      // 滑鼠視差（桌面）
      // ----------------------------------------------------------------------
      document.addEventListener(
        "mousemove",
        (e: MouseEvent) => {
          targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
          targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

          const rect = container.getBoundingClientRect();
          asciiUniforms.uMouseUv.value.set(
            (e.clientX - rect.left) / rect.width,
            1.0 - (e.clientY - rect.top) / rect.height,
          );
        },
        { signal },
      );

      // 滑鼠離開 container 時移到畫面外
      container.addEventListener(
        "mouseleave",
        () => {
          asciiUniforms.uMouseUv.value.set(-1, -1);
        },
        { signal },
      );
    }

    // Render loop（三 pass）— 只在 hero 可見時渲染
    let isVisible = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && rafId === null) animate();
      },
      { threshold: 0 },
    );
    observer.observe(container);
    signal.addEventListener("abort", () => observer.disconnect());

    function animate() {
      if (!glRenderer || !isVisible) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(animate);

      currentMouse.x += (targetMouse.x - currentMouse.x) * MOUSE_LERP;
      currentMouse.y += (targetMouse.y - currentMouse.y) * MOUSE_LERP;
      layer1.uniforms.uMouse.value.set(currentMouse.x, currentMouse.y);
      layer2.uniforms.uMouse.value.set(currentMouse.x, currentMouse.y);

      // Pass 1a: 人物 → RT1
      glRenderer.setRenderTarget(rt1);
      glRenderer.setClearColor(0x000000, 0);
      glRenderer.clear();
      glRenderer.render(layer1.scene, layer1.camera);

      // Pass 1b: 法杖 → RT2
      glRenderer.setRenderTarget(rt2);
      glRenderer.setClearColor(0x000000, 0);
      glRenderer.clear();
      glRenderer.render(layer2.scene, layer2.camera);

      // Pass 2: ASCII → 畫面
      glRenderer.setRenderTarget(null);
      glRenderer.setClearColor(ASCII_BG_COLOR);
      glRenderer.render(scene2, camera2);
    }

    animate();

    // 入場動畫 — 等遮罩退場完成（page-revealed）後才開始
    function startEntrance() {
      const reduced = prefersReducedMotion();

      if (reduced) {
        asciiUniforms.uReveal1.value = 1;
        asciiUniforms.uReveal2.value = 1;
        layer1.uniforms.uIntensity.value = PARALLAX_INTENSITY;
        layer2.uniforms.uIntensity.value = PARALLAX_INTENSITY;
        return;
      }

      entranceTimeline = gsap.timeline({
        delay: LAYER1_DELAY,
        onComplete: () => {
          // 觸控裝置：入場動畫完成後停止 render loop，保留最後一幀
          // 桌面版持續渲染（滑鼠視差互動）
          if (isTouch) {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            isVisible = false; // 防止 IntersectionObserver 重啟 loop
          }
        },
      });

      // 人物揭示（徑向擴散）
      entranceTimeline.to(asciiUniforms.uReveal1, {
        value: 1,
        duration: LAYER1_DURATION,
        ease: ENTRANCE_EASE,
      }, 0);

      // 人物視差漸入
      entranceTimeline.to(layer1.uniforms.uIntensity, {
        value: PARALLAX_INTENSITY,
        duration: LAYER1_DURATION,
        ease: ENTRANCE_EASE,
      }, 0);

      // 法杖揭示（延遲後淡入）
      entranceTimeline.to(asciiUniforms.uReveal2, {
        value: 1,
        duration: LAYER2_DURATION,
        ease: ENTRANCE_EASE,
      }, LAYER2_DELAY);

      // 法杖視差漸入
      entranceTimeline.to(layer2.uniforms.uIntensity, {
        value: PARALLAX_INTENSITY,
        duration: LAYER2_DURATION,
        ease: ENTRANCE_EASE,
      }, LAYER2_DELAY);
    }

    // 監聽遮罩退場完成事件
    window.addEventListener("page-revealed", startEntrance, { once: true, signal });

    // Resize
    function onResize() {
      if (!glRenderer || !container) return;
      const nw = container.offsetWidth;
      const nh = container.offsetHeight;
      glRenderer.setSize(nw, nh);
      rt1.setSize(nw * dpr, nh * dpr);
      rt2.setSize(nw * dpr, nh * dpr);
      layer1.uniforms.uViewportSize.value.set(nw, nh);
      layer2.uniforms.uViewportSize.value.set(nw, nh);
      asciiUniforms.uResolution.value.set(nw * dpr, nh * dpr);
      asciiUniforms.uViewportAspect.value = nw / nh;
    }

    window.addEventListener("resize", onResize, { signal });
  }).catch(() => {
    // Texture 載入失敗 → 顯示 fallback
    const fallback = document.getElementById("hero-ascii-fallback");
    if (fallback) fallback.style.display = "block";
    if (container) container.style.display = "none";
  });
}

initHeroAscii();
document.addEventListener("astro:page-load", initHeroAscii);
