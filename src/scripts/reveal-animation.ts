// ==========================================================================
// RevealText Animation — 雙色遮罩揭示動畫
//
// 掃描所有 [data-reveal] 元素，使用 GSAP ScrollTrigger 觸發動畫
// 動畫時間由下方常數控制（MASK_DURATION / MASK_OVERLAP / PAUSE_DURATION）
// ==========================================================================

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const MASK_DURATION = 0.25;
const MASK_OVERLAP = MASK_DURATION / 2.5; // 橘白遮罩重疊時間（橘色走到一半白色就開始）
const PAUSE_DURATION = 0.35;
const EASE_IN = "power2.in";
const EASE_OUT = "power2.out";

function createRevealTimeline(el: HTMLElement): gsap.core.Timeline {
  const content = el.querySelector<HTMLElement>(".reveal-text__content");
  const brandMask = el.querySelector<HTMLElement>(".reveal-text__mask--brand");
  const bgMask = el.querySelector<HTMLElement>(".reveal-text__mask--bg");
  const delay = parseFloat(el.dataset.revealDelay || "0");

  const tl = gsap.timeline({ paused: true, delay });

  if (!content || !brandMask || !bgMask) return tl;

  // Phase 1: 遮罩從左→右展開（scaleX 0→1, origin left）
  // 橘色展開到一半時，白色就開始展開（重疊 MASK_OVERLAP）
  tl.to(brandMask, {
    scaleX: 1,
    transformOrigin: "left center",
    duration: MASK_DURATION,
    ease: EASE_IN,
  })
    .to(bgMask, {
      scaleX: 1,
      transformOrigin: "left center",
      duration: MASK_DURATION,
      ease: EASE_IN,
    }, `-=${MASK_OVERLAP}`)

    // 停頓期間將文字設為可見（被遮罩蓋住看不到）
    .set(content, { opacity: 1 })
    .to({}, { duration: PAUSE_DURATION })

    // Phase 2: 遮罩從左→右退場（scaleX 1→0, origin right）
    // 白色退到一半時，橘色就開始退場（重疊 MASK_OVERLAP）
    .to(bgMask, {
      scaleX: 0,
      transformOrigin: "right center",
      duration: MASK_DURATION,
      ease: EASE_OUT,
    })
    .to(brandMask, {
      scaleX: 0,
      transformOrigin: "right center",
      duration: MASK_DURATION,
      ease: EASE_OUT,
    }, `-=${MASK_OVERLAP}`);

  return tl;
}

let activeTimelines: gsap.core.Timeline[] = [];

function initRevealAnimations() {
  // 清除舊的 Timeline + ScrollTrigger（View Transitions 重新初始化時）
  activeTimelines.forEach((tl) => tl.kill());
  activeTimelines = [];
  ScrollTrigger.getAll()
    .filter((st) => st.vars.id?.startsWith("reveal-"))
    .forEach((st) => st.kill());

  const revealElements = document.querySelectorAll<HTMLElement>("[data-reveal]");

  revealElements.forEach((el, index) => {
    const tl = createRevealTimeline(el);
    activeTimelines.push(tl);

    // Hero 區塊內的元素：頁面載入直接播放，不需 ScrollTrigger
    const isInHero = el.closest("#hero") !== null;

    if (isInHero) {
      tl.play();
    } else {
      ScrollTrigger.create({
        id: `reveal-${index}`,
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => tl.play(),
      });
    }
  });
}

// MPA 初始化 + View Transitions 支援
initRevealAnimations();
document.addEventListener("astro:page-load", initRevealAnimations);
