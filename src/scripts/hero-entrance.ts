// ==========================================================================
// Hero 入場動畫 — fade-up stagger
//
// 目標元素：.hero__name → .hero__tagline → .hero__cta
// 在 RevealText 遮罩動畫結束後依序淡入上移
// 動畫規劃文件：docs/animation-plan.md 第 3 節
// ==========================================================================

import { gsap } from "gsap";

const DELAY = 0.5; // RevealText 最長結束時間 ≈ 1.15s，留緩衝
const DURATION = 0.5;
const STAGGER = 0.15;
const Y_OFFSET = "100%";

let activeTween: gsap.core.Tween | null = null;

function initHeroEntrance() {
  activeTween?.kill();
  activeTween = null;

  const hero = document.getElementById("hero");
  if (!hero) return;

  const targets = hero.querySelectorAll(
    ".hero__name, .hero__tagline, .hero__cta",
  );
  if (!targets.length) return;

  gsap.set(targets, { opacity: 0, y: Y_OFFSET });

  activeTween = gsap.to(targets, {
    opacity: 1,
    y: 0,
    duration: DURATION,
    ease: "power2.out",
    stagger: STAGGER,
    delay: DELAY,
  });
}

initHeroEntrance();
document.addEventListener("astro:page-load", initHeroEntrance);
