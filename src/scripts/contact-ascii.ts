// ==========================================================================
// Contact ASCII Effect — 4 圖層深度視差 + ASCII 後處理
//
// Layer 1: 石柱場景（持續顯示）
// Layer 2: 海塔（依序出現）
// Layer 3: 修塔爾克（依序出現）
// Layer 4: 芙莉蓮+費倫（最後出現）
// ==========================================================================

import * as THREE from "three";
import { gsap } from "gsap";
import { isTouchDevice, prefersReducedMotion } from "../utils/device";
import {
  createCharAtlas, createDepthScene, loadTexture,
  ASCII_CELL_SIZE, CHAR_ASPECT, MOUSE_LERP, ASCII_CHARS,
  ASCII_BG_COLOR, ASCII_FG_COLOR, ASCII_COLOR_MIX, ENTRANCE_EASE,
} from "../utils/ascii-helpers";
import depthVert from "../shaders/depth-parallax.vert.glsl?raw";
import depthFrag from "../shaders/depth-parallax.frag.glsl?raw";
import asciiVert from "../shaders/ascii.vert.glsl?raw";
import asciiFrag from "../shaders/ascii-contact.frag.glsl?raw";

// --------------------------------------------------------------------------
// Contact 專用常數
// --------------------------------------------------------------------------
const PARALLAX_INTENSITY = 0.008;
const LAYER_DELAYS = [0, 1.0, 2.0];
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

  if (isTouchDevice()) {
    const container = document.getElementById("contact-ascii");
    const fallback = document.getElementById("contact-ascii-fallback");
    if (container) container.style.display = "none";
    if (fallback) fallback.style.display = "block";
    return;
  }

  const container = document.getElementById("contact-ascii");
  if (!container) return;

  abortController = new AbortController();
  const { signal } = abortController;

  const w = container.offsetWidth;
  const h = container.offsetHeight;
  const dpr = Math.min(window.devicePixelRatio, 2);

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

  const atlas = createCharAtlas(ASCII_CHARS, ASCII_CELL_SIZE * dpr, CHAR_ASPECT);
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

  // 純白 1x1 texture（2D 平移：所有像素等量偏移）
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

    // 3 個場景（共用純白 depth → 2D 平移）
    const layers = images.map((tex) =>
      createDepthScene(tex, whiteDepth, w, h, depthVert, depthFrag),
    );
    layers.forEach((l) => disposables.push(l.material, l.geometry));

    // Mouse tracking
    const targetMouse = new THREE.Vector2(0, 0);
    const currentMouse = new THREE.Vector2(0, 0);

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

      // Layer 1、2 移動減半，Layer 3 反向
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

    // 入場動畫（ScrollTrigger 觸發：進入視窗時播放）
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

            entranceTimeline = gsap.timeline();

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
