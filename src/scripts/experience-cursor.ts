// ==========================================================================
// Experience Cursor — 黑圓反色游標
//
// 僅在 #experience section 內啟用，80px 黑色圓形
// 使用 mix-blend-mode: difference 讓覆蓋區域文字自動反色
//
// 行為：
//   - GSAP 平滑跟隨滑鼠
//   - 進入 section 時 fade in，離開時 fade out
//   - 觸控裝置 / prefers-reduced-motion 停用
// ==========================================================================

import { gsap } from "gsap";
import { prefersReducedMotion } from "../utils/device";

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const CURSOR_SIZE = 160;
const FOLLOW_DURATION = 0.6;
const FOLLOW_EASE = "power3.out";
const FADE_DURATION = 0.3;
const FADE_EASE = "power2.inOut";

// --------------------------------------------------------------------------
// Init / Cleanup
// --------------------------------------------------------------------------
let abortController: AbortController | null = null;

function initExperienceCursor() {
  // Cleanup previous instance
  abortController?.abort();
  abortController = new AbortController();

  // Guards — 觸控裝置用 hover 媒體查詢（非觸控筆電可正常顯示）
  const hasHover = window.matchMedia("(hover: hover)").matches;
  const isWideEnough = window.matchMedia("(min-width: 768px)").matches;
  if (!hasHover || !isWideEnough || prefersReducedMotion()) return;

  const { signal } = abortController;

  // DOM
  const section = document.getElementById("experience");
  const cursorEl = document.getElementById("experience-cursor");
  if (!section || !cursorEl) return;

  // State
  let mouseX = 0;
  let mouseY = 0;
  let isInside = false;

  // Initial state — hidden
  gsap.set(cursorEl, {
    width: CURSOR_SIZE,
    height: CURSOR_SIZE,
    xPercent: -50,
    yPercent: -50,
    opacity: 0,
    x: mouseX,
    y: mouseY,
  });

  // --------------------------------------------------------------------------
  // Mouse tracking (document-level for smooth edge behavior)
  // --------------------------------------------------------------------------
  document.addEventListener(
    "mousemove",
    (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (isInside) {
        gsap.to(cursorEl, {
          x: mouseX,
          y: mouseY,
          duration: FOLLOW_DURATION,
          ease: FOLLOW_EASE,
          overwrite: "auto",
        });
      }
    },
    { signal },
  );

  // --------------------------------------------------------------------------
  // Enter / Leave section
  // --------------------------------------------------------------------------
  section.addEventListener(
    "mouseenter",
    () => {
      isInside = true;
      // Snap position first, then fade in
      gsap.set(cursorEl, { x: mouseX, y: mouseY });
      gsap.to(cursorEl, {
        opacity: 1,
        duration: FADE_DURATION,
        ease: FADE_EASE,
      });
    },
    { signal },
  );

  section.addEventListener(
    "mouseleave",
    () => {
      isInside = false;
      gsap.to(cursorEl, {
        opacity: 0,
        duration: FADE_DURATION,
        ease: FADE_EASE,
      });
    },
    { signal },
  );
}

initExperienceCursor();
document.addEventListener("astro:page-load", initExperienceCursor);
