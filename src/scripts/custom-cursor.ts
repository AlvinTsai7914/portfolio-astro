// ==========================================================================
// Custom Cursor — 情境式 Hover 徽章
//
// 預設不可見，hover [data-cursor-text] 元素時出現品牌色藥丸徽章
// 用法：<a data-cursor-text="VIEW">...</a>
//
// 行為：
//   - GSAP 平滑跟隨滑鼠（duration 0.7s）
//   - 出現：scale 0→1（back.out 彈跳）
//   - 消失：scale 1→0（power2.inOut）
//   - 滑鼠速度驅動旋轉傾斜（±35°，鐘擺效果）
//   - 觸控裝置停用，原生游標保留
//
// 動畫規劃文件：docs/animation-plan.md 第 6 節
// ==========================================================================

import { gsap } from "gsap";
import { isTouchDevice, prefersReducedMotion } from "../utils/device";

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const FOLLOW_DURATION = 0.7;
const FOLLOW_EASE = "power3.out";
const APPEAR_DURATION = 0.4;
const APPEAR_EASE = "back.out(1.7)";
const DISAPPEAR_DURATION = 0.3;
const DISAPPEAR_EASE = "power2.inOut";
const MAX_ROTATION = 35;
const ROTATION_DECAY = 0.92;
const VELOCITY_SENSITIVITY = 0.15;

// --------------------------------------------------------------------------
// Init / Cleanup
// --------------------------------------------------------------------------
let abortController: AbortController | null = null;
let tickerCallback: (() => void) | null = null;

function initCustomCursor() {
  // Cleanup
  abortController?.abort();
  abortController = new AbortController();
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }

  // Touch guard
  if (isTouchDevice()) return;

  const { signal } = abortController;

  // DOM
  const cursorEl = document.getElementById("custom-cursor");
  const textEl = document.getElementById("custom-cursor-text");
  if (!cursorEl || !textEl) return;

  // State
  let mouseX = -100;
  let mouseY = -100;
  let prevMouseX = -100;
  let currentRotation = 0;
  let isVisible = false;
  let activeTween: gsap.core.Tween | null = null;

  const reduced = prefersReducedMotion();

  // Initial state
  gsap.set(cursorEl, { scale: 0, xPercent: -50, yPercent: -100, x: mouseX, y: mouseY });

  // --------------------------------------------------------------------------
  // Mouse tracking
  // --------------------------------------------------------------------------
  document.addEventListener(
    "mousemove",
    (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      gsap.to(cursorEl, {
        x: mouseX,
        y: mouseY,
        duration: reduced ? 0 : FOLLOW_DURATION,
        ease: FOLLOW_EASE,
        overwrite: "auto",
      });
    },
    { signal },
  );

  // --------------------------------------------------------------------------
  // Show / Hide via event delegation
  // --------------------------------------------------------------------------
  document.addEventListener(
    "mouseover",
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor-text]");
      if (!target || isVisible) return;

      textEl.textContent = target.dataset.cursorText || "";
      activeTween?.kill();
      activeTween = gsap.to(cursorEl, {
        scale: 1,
        duration: reduced ? 0 : APPEAR_DURATION,
        ease: APPEAR_EASE,
      });
      isVisible = true;
    },
    { signal },
  );

  document.addEventListener(
    "mouseout",
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor-text]");
      if (!target) return;

      // Check if moving to another cursor-text element
      const related = (e.relatedTarget as HTMLElement | null)?.closest?.("[data-cursor-text]");
      if (related) return;

      activeTween?.kill();
      activeTween = gsap.to(cursorEl, {
        scale: 0,
        duration: reduced ? 0 : DISAPPEAR_DURATION,
        ease: DISAPPEAR_EASE,
      });
      isVisible = false;
    },
    { signal },
  );

  // Hide when mouse leaves window
  document.documentElement.addEventListener(
    "mouseleave",
    () => {
      if (!isVisible) return;
      activeTween?.kill();
      activeTween = gsap.to(cursorEl, {
        scale: 0,
        duration: reduced ? 0 : DISAPPEAR_DURATION,
        ease: DISAPPEAR_EASE,
      });
      isVisible = false;
    },
    { signal },
  );

  // --------------------------------------------------------------------------
  // Velocity-based rotation (GSAP ticker)
  // --------------------------------------------------------------------------
  if (!reduced) {
    tickerCallback = () => {
      const velocityX = mouseX - prevMouseX;
      prevMouseX = mouseX;

      const targetRotation = Math.max(
        -MAX_ROTATION,
        Math.min(MAX_ROTATION, velocityX * VELOCITY_SENSITIVITY),
      );

      if (isVisible) {
        currentRotation += (targetRotation - currentRotation) * 0.15;
      } else {
        currentRotation *= ROTATION_DECAY;
      }

      // Skip tiny values
      if (Math.abs(currentRotation) > 0.1) {
        gsap.set(cursorEl, { rotation: currentRotation });
      }
    };

    gsap.ticker.add(tickerCallback);
  }
}

initCustomCursor();
document.addEventListener("astro:page-load", initCustomCursor);
