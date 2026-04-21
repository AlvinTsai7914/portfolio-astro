// ==========================================================================
// Lenis 平滑捲動
//
// 用 GSAP ticker 驅動 Lenis，確保與 ScrollTrigger 同步
// 手機版停用（< 768px）
// 動畫規劃文件：docs/animation-plan.md 第 5 節
// ==========================================================================

import "lenis/dist/lenis.css";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const MOBILE_BREAKPOINT = 768;

declare global {
  interface Window {
    __lenis?: Lenis | null;
  }
}

let lenis: Lenis | null = null;
let rafCallback: ((time: number) => void) | null = null;

function initSmoothScroll() {
  // 清理舊實例
  if (rafCallback) {
    gsap.ticker.remove(rafCallback);
    rafCallback = null;
  }
  lenis?.destroy();
  lenis = null;
  window.__lenis = null;

  if (window.innerWidth < MOBILE_BREAKPOINT) return;

  lenis = new Lenis({
    duration: 1.2,
    lerp: 0.1,
  });

  lenis.on("scroll", ScrollTrigger.update);

  rafCallback = (time: number) => {
    lenis!.raf(time * 1000);
  };
  gsap.ticker.add(rafCallback);
  gsap.ticker.lagSmoothing(0);

  // 暴露給 mobile-menu.ts(menu 開啟時 stop 避免背景 scroll,關閉後 scrollTo 目標 section)
  window.__lenis = lenis;
}

initSmoothScroll();
document.addEventListener("astro:page-load", initSmoothScroll);
