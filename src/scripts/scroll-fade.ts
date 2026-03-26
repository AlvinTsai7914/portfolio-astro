// ==========================================================================
// Scroll Fade-Up — 通用滾動觸發淡入動畫
//
// 用法：在 HTML 元素加上 data-fade-up attribute
//   單獨觸發：<div data-fade-up>
//   群組 stagger：<div data-fade-up data-fade-group="about-text">
//
// 可選 attribute：
//   data-fade-delay="0.2"     延遲（秒），預設 0
//   data-fade-duration="0.8"  時長（秒），預設 0.6
//   data-fade-stagger="0.2"   群組間隔（秒），預設 0.15
//   data-fade-y="60"          Y 位移（px 或 %），預設 "100%"
//   data-fade-trigger=".about__content"  自訂觸發錨點（CSS 選擇器），預設為元素自身
//
// 動畫規劃文件：docs/animation-plan.md 第 3 節
// ==========================================================================

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_DURATION = 0.5;
const DEFAULT_STAGGER = 0.15;
const DEFAULT_Y = "100%";
const DEFAULT_DELAY = 0;
const TRIGGER_START = "top 90%";

function parseNum(el: HTMLElement, attr: string, fallback: number): number {
  const raw = el.dataset[attr];
  if (raw === undefined) return fallback;
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseY(el: HTMLElement, fallback: string | number): string | number {
  const raw = el.dataset.fadeY;
  if (raw === undefined) return fallback;
  if (raw.includes("%")) return raw;
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function resolveTrigger(el: HTMLElement): HTMLElement | Element {
  const selector = el.dataset.fadeTrigger;
  if (!selector) return el;
  return document.querySelector(selector) || el;
}

let activeTweens: gsap.core.Tween[] = [];

function initScrollFade() {
  // 清除舊動畫（View Transitions 重新初始化時）
  activeTweens.forEach((t) => t.kill());
  activeTweens = [];
  ScrollTrigger.getAll()
    .filter((st) => st.vars.id?.startsWith("fade-"))
    .forEach((st) => st.kill());

  const allElements = document.querySelectorAll<HTMLElement>("[data-fade-up]");
  if (!allElements.length) return;

  // 分類：群組 vs 單獨
  const groups = new Map<string, HTMLElement[]>();
  const singles: HTMLElement[] = [];

  allElements.forEach((el) => {
    const group = el.dataset.fadeGroup;
    if (group) {
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(el);
    } else {
      singles.push(el);
    }
  });

  // 單獨元素：各自 ScrollTrigger
  singles.forEach((el, index) => {
    const duration = parseNum(el, "fadeDuration", DEFAULT_DURATION);
    const delay = parseNum(el, "fadeDelay", DEFAULT_DELAY);
    const y = parseY(el, DEFAULT_Y);

    gsap.set(el, { opacity: 0, y });

    ScrollTrigger.create({
      id: `fade-single-${index}`,
      trigger: resolveTrigger(el),
      start: TRIGGER_START,
      once: true,
      onEnter: () => {
        const tween = gsap.to(el, {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power2.out",
        });
        activeTweens.push(tween);
      },
    });
  });

  // 群組元素：第一個元素為 trigger，全部 stagger
  let groupIndex = 0;
  groups.forEach((elements, name) => {
    const first = elements[0];
    const duration = parseNum(first, "fadeDuration", DEFAULT_DURATION);
    const delay = parseNum(first, "fadeDelay", DEFAULT_DELAY);
    const stagger = parseNum(first, "fadeStagger", DEFAULT_STAGGER);
    const y = parseY(first, DEFAULT_Y);

    gsap.set(elements, { opacity: 0, y });

    ScrollTrigger.create({
      id: `fade-group-${groupIndex}-${name}`,
      trigger: resolveTrigger(first),
      start: TRIGGER_START,
      once: true,
      onEnter: () => {
        const tween = gsap.to(elements, {
          opacity: 1,
          y: 0,
          duration,
          delay,
          stagger,
          ease: "power2.out",
        });
        activeTweens.push(tween);
      },
    });

    groupIndex++;
  });
}

initScrollFade();
document.addEventListener("astro:page-load", initScrollFade);
