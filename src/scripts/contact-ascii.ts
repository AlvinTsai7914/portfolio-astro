// ==========================================================================
// Contact ASCII Effect — 3 圖層 2D 平移 + ASCII 後處理
//
// 渲染架構（每幀 4 pass）：
//   Pass 1a: 海塔 depth parallax → RenderTarget 1
//   Pass 1b: 修塔爾克 depth parallax → RenderTarget 2
//   Pass 1c: 芙莉蓮+費倫 depth parallax → RenderTarget 3
//   Pass 2:  ascii-contact shader（合成 3 層 + 透明背景）→ 畫面
//
// 與 Hero ASCII 的差異：
//   - 3 層（非 2 層）
//   - 2D 平移（純白 depth texture，無深度視差）
//   - 圖層交錯移動方向（Layer 1,2 正向減半、Layer 3 反向）
//   - 透明背景（alpha: true）融入 dark section
//   - ScrollTrigger 觸發入場動畫（非頁面載入）
//
// 相關檔案：
//   src/shaders/ascii-contact.frag.glsl — 3 層 ASCII shader
//   src/utils/ascii-helpers.ts          — 共用工具和常數
//   src/components/sections/Contact.astro — DOM 容器
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
import asciiFrag from "../shaders/ascii-contact.frag.glsl?raw";

// --------------------------------------------------------------------------
// Contact 專用常數（共用常數在 ascii-helpers.ts）
// --------------------------------------------------------------------------

/** 視差移動量（比 Hero 的 0.03 小，因為 2D 平移不需要太大偏移） */
const PARALLAX_INTENSITY = 0.008;

/** 各圖層入場延遲（秒）。ScrollTrigger 觸發後開始計時 */
const LAYER_DELAYS = [0, 1.0, 2.0];

/** 各圖層入場時長（秒） */
const LAYER_DURATIONS = [1.5, 1.5, 2];

// 素材路徑（海塔、修塔爾克、芙莉蓮+費倫）
const IMAGE_PATHS = [
  "/images/projects/frieren-group/frieren-group2.png",
  "/images/projects/frieren-group/frieren-group3.png",
  "/images/projects/frieren-group/frieren-group4.png",
];

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

function initContactAscii() {
  cleanup();

  const container = document.getElementById("contact-ascii");
  if (!container) return;

  // WebGL 不支援時顯示 fallback
  const testCanvas = document.createElement("canvas");
  const hasWebGL = !!(testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"));
  if (!hasWebGL) {
    container.style.display = "none";
    const fallback = document.getElementById("contact-ascii-fallback");
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
  glRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  glRenderer.setPixelRatio(dpr);
  glRenderer.setSize(w, h);
  glRenderer.setClearColor(0x000000, 0);
  container.appendChild(glRenderer.domElement);

  // 3 個 RenderTarget
  const renderTargets = Array.from({ length: 3 }, () => {
    const rt = new THREE.WebGLRenderTarget(w * dpr, h * dpr);
    disposables.push(rt);
    return rt;
  });

  // ASCII pass
  const scene2 = new THREE.Scene();
  const camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const atlas = createCharAtlas(ASCII_CHARS, cellSize * dpr, CHAR_ASPECT);
  disposables.push(atlas.texture);

  const asciiUniforms = {
    tLayer1: { value: renderTargets[0].texture },
    tLayer2: { value: renderTargets[1].texture },
    tLayer3: { value: renderTargets[2].texture },
    uCharAtlas: { value: atlas.texture },
    uResolution: { value: new THREE.Vector2(w * dpr, h * dpr) },
    uCellSize: { value: new THREE.Vector2(atlas.cellWidth, atlas.cellHeight) },
    uCharCount: { value: ASCII_CHARS.length },
    uBgColor: { value: ASCII_BG_COLOR },
    uFgColor: { value: ASCII_FG_COLOR },
    uColorMix: { value: ASCII_COLOR_MIX },
    uReveal1: { value: 0 },
    uReveal2: { value: 0 },
    uReveal3: { value: 0 },
    uViewportAspect: { value: w / h },
    uMouseUv: { value: new THREE.Vector2(-1, -1) },
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

  const allLoads = IMAGE_PATHS.map(loadTexture);

  // 純白 1x1 depth texture → 所有像素 depth=1.0 → 等量偏移 → 2D 平移
  // 這是避免修改共用 shader 的技巧：正常 depth map 有深淺差異產生 3D 視差，
  // 全白 = 沒有深淺差異 = 所有像素移動相同距離 = 2D 平移
  const whiteCanvas = document.createElement("canvas");
  whiteCanvas.width = 1;
  whiteCanvas.height = 1;
  const whiteCtx = whiteCanvas.getContext("2d")!;
  whiteCtx.fillStyle = "white";
  whiteCtx.fillRect(0, 0, 1, 1);
  const whiteDepth = new THREE.CanvasTexture(whiteCanvas);
  disposables.push(whiteDepth);

  Promise.all(allLoads).then((images) => {
    if (!glRenderer) return;

    images.forEach((t) => disposables.push(t));

    // 通知遮罩：ASCII 準備完成
    window.dispatchEvent(new Event("contact-ascii-ready"));

    // 3 個場景（共用純白 depth → 2D 平移）
    const layers = images.map((tex) =>
      createDepthScene(tex, whiteDepth, w, h, depthVert, depthFrag),
    );
    layers.forEach((l) => disposables.push(l.material, l.geometry));

    // Input tracking（滑鼠 or 陀螺儀）
    const targetMouse = new THREE.Vector2(0, 0);
    const currentMouse = new THREE.Vector2(0, 0);

    if (isTouch) {
      // ----------------------------------------------------------------------
      // 觸控裝置：停用互動（入場動畫完成後停止 render loop，保留最後一幀）
      // ----------------------------------------------------------------------
      asciiUniforms.uMouseUv.value.set(-1, -1);
    } else {
      // 桌面：滑鼠視差 + hover 光圈
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

      container.addEventListener(
        "mouseleave",
        () => { asciiUniforms.uMouseUv.value.set(-1, -1); },
        { signal },
      );
    }

    // IntersectionObserver — 只在可見時渲染
    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && rafId === null) animate();
      },
      { threshold: 0 },
    );
    observer.observe(container);
    signal.addEventListener("abort", () => observer.disconnect());

    // Render loop（5 pass）
    function animate() {
      if (!glRenderer || !isVisible) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(animate);

      currentMouse.x += (targetMouse.x - currentMouse.x) * MOUSE_LERP;
      currentMouse.y += (targetMouse.y - currentMouse.y) * MOUSE_LERP;

      // 圖層交錯移動：Layer 1,2 正向但減半速度，Layer 3 反向全速
      // 產生角色們左右交錯移動的視覺效果
      layers[0].uniforms.uMouse.value.set(currentMouse.x, -currentMouse.y);
      layers[1].uniforms.uMouse.value.set(currentMouse.x, -currentMouse.y);
      layers[2].uniforms.uMouse.value.set(-currentMouse.x, currentMouse.y);

      // Pass 1a-1c: 3 個 depth parallax
      layers.forEach((layer, i) => {
        glRenderer!.setRenderTarget(renderTargets[i]);
        glRenderer!.setClearColor(0x000000, 0);
        glRenderer!.clear();
        glRenderer!.render(layer.scene, layer.camera);
      });

      // Pass 2: ASCII composite（透明背景，融入 section）
      glRenderer.setRenderTarget(null);
      glRenderer.setClearColor(0x000000, 0);
      glRenderer.clear();
      glRenderer.render(scene2, camera2);
    }

    // 入場動畫 — 使用獨立的 IntersectionObserver（threshold 0.2）
    // 當容器 20% 進入視窗時觸發，一次性播放（hasPlayed guard）
    // 與 render loop 的 observer（threshold 0）分開，因為語義不同：
    //   render observer: 只要有任何部分可見就開始渲染（效能優化）
    //   play observer:   進入 20% 才播動畫（避免太早觸發看不到效果）
    const reduced = prefersReducedMotion();
    const revealKeys = ["uReveal1", "uReveal2", "uReveal3"] as const;

    if (reduced) {
      revealKeys.forEach((key) => { (asciiUniforms as any)[key].value = 1; });
      layers.forEach((l) => { l.uniforms.uIntensity.value = PARALLAX_INTENSITY; });
    } else {
      // 等進入視窗再播放
      let hasPlayed = false;
      const playObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasPlayed) {
            hasPlayed = true;
            playObserver.disconnect();

            entranceTimeline = gsap.timeline({
              onComplete: () => {
                // 觸控裝置：入場動畫完成後停止 render loop，保留最後一幀
                if (isTouch) {
                  if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                  }
                  isVisible = false;
                }
              },
            });

            layers.forEach((layer, i) => {
              // Reveal
              entranceTimeline!.to((asciiUniforms as any)[revealKeys[i]], {
                value: 1,
                duration: LAYER_DURATIONS[i],
                ease: ENTRANCE_EASE,
              }, LAYER_DELAYS[i]);

              // Parallax intensity
              entranceTimeline!.to(layer.uniforms.uIntensity, {
                value: PARALLAX_INTENSITY,
                duration: LAYER_DURATIONS[i],
                ease: ENTRANCE_EASE,
              }, LAYER_DELAYS[i]);
            });
          }
        },
        { threshold: 0.2 },
      );
      playObserver.observe(container);
      signal.addEventListener("abort", () => playObserver.disconnect());
    }

    // Resize
    function onResize() {
      if (!glRenderer || !container) return;
      const nw = container.offsetWidth;
      const nh = container.offsetHeight;
      glRenderer.setSize(nw, nh);
      renderTargets.forEach((rt) => rt.setSize(nw * dpr, nh * dpr));
      layers.forEach((l) => l.uniforms.uViewportSize.value.set(nw, nh));
      asciiUniforms.uResolution.value.set(nw * dpr, nh * dpr);
      asciiUniforms.uViewportAspect.value = nw / nh;
    }

    window.addEventListener("resize", onResize, { signal });
  }).catch(() => {
    const fallback = document.getElementById("contact-ascii-fallback");
    if (fallback) fallback.style.display = "block";
    if (container) container.style.display = "none";
  });
}

initContactAscii();
document.addEventListener("astro:page-load", initContactAscii);
