// ==========================================================================
// Text Scramble — 純 JS 文字亂碼揭示動畫
//
// 用法：在 HTML 元素加上 data-scramble attribute
//   Hover 觸發：<span data-scramble="hover">文字</span>
//   Scroll 觸發：<span data-scramble="scroll">文字</span>
//
// 可選 attribute：
//   data-scramble-duration="0.5"     總時長（秒），預設 0.5
//   data-scramble-stagger="0.05"     每字元鎖定間隔（秒），預設自動計算
//   data-scramble-delay="0"          觸發延遲（秒），預設 0
//   data-scramble-hold="0.1"        全亂碼停留時間（秒），預設 0（亂碼→文字之間的停頓）
//   data-scramble-chars="ABC..."     自訂亂碼字元集
//
// 動畫規劃文件：docs/animation-plan.md 第 7 節
// ==========================================================================

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../utils/device";

gsap.registerPlugin(ScrollTrigger);

// good-fella.com 同款字元集（GSAP ScrambleTextPlugin 預設）
const DEFAULT_CHARS = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const DEFAULT_DURATION = 0.3;
const SCRAMBLE_FPS = 30;
const BRAND_CLASS = "scramble-brand";

// 取得隨機字元
function randomChar(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)];
}

// 將文字拆成字元資訊陣列（保留空格不亂碼）
interface CharInfo {
  char: string;
  isSpace: boolean;
}

function parseText(text: string): CharInfo[] {
  return Array.from(text).map((char) => ({
    char,
    isSpace: char === " ",
  }));
}

// --------------------------------------------------------------------------
// 核心 scramble 動畫
// --------------------------------------------------------------------------
interface ScrambleOptions {
  duration: number;
  stagger: number; // 每字元鎖定間隔（秒）
  delay: number;
  hold: number; // 全亂碼停留時間（秒）
  chars: string;
}

function scrambleElement(
  el: HTMLElement,
  options: ScrambleOptions,
): Promise<void> {
  return new Promise((resolve) => {
    const originalText = el.dataset.scrambleText || el.textContent || "";
    const parsed = parseText(originalText);
    const charCount = parsed.filter((c) => !c.isSpace).length;

    if (charCount === 0) {
      resolve();
      return;
    }

    // 跳過動畫
    if (prefersReducedMotion()) {
      el.textContent = originalText;
      resolve();
      return;
    }

    // 計算每字元鎖定間隔：總時長均分給所有非空格字元
    const stagger =
      options.stagger > 0
        ? options.stagger
        : options.duration / charCount;

    let startTime: number | null = null;
    let scrambleInterval: ReturnType<typeof setInterval> | null = null;
    let resolved = false;

    // 渲染當前狀態到 DOM
    function render(revealedCount: number) {
      let html = "";
      let nonSpaceIndex = 0;

      for (const info of parsed) {
        if (info.isSpace) {
          html += " ";
          continue;
        }

        if (nonSpaceIndex < revealedCount) {
          // 已鎖定 — 顯示最終字元
          html += info.char;
        } else {
          // 未鎖定 — 顯示隨機亂碼（品牌色）
          html += `<span class="${BRAND_CLASS}">${randomChar(options.chars)}</span>`;
        }

        nonSpaceIndex++;
      }

      el.innerHTML = html;
    }

    function finish() {
      if (resolved) return;
      resolved = true;
      if (scrambleInterval) clearInterval(scrambleInterval);
      el.textContent = originalText;
      el.style.minWidth = "";
      resolve();
    }

    // 鎖定元素寬度，防止亂碼字元（窄 ASCII）導致按鈕跳動
    el.style.minWidth = `${el.offsetWidth}px`;

    // delay 期間先隱藏文字，再開始亂碼動畫
    const delayMs = options.delay * 1000;

    if (delayMs > 0) {
      el.style.color = "transparent";
    }

    setTimeout(() => {
      el.style.color = "";
      startTime = performance.now();

      // 亂碼循環：固定 FPS 刷新未鎖定字元
      scrambleInterval = setInterval(() => {
        if (startTime === null) return;
        const elapsed = (performance.now() - startTime) / 1000;
        const revealElapsed = Math.max(0, elapsed - options.hold);
        const revealedCount = Math.min(
          Math.floor(revealElapsed / stagger),
          charCount,
        );

        if (revealedCount >= charCount) {
          finish();
          return;
        }

        render(revealedCount);
      }, 1000 / SCRAMBLE_FPS);
    }, delayMs);
  });
}

// --------------------------------------------------------------------------
// 初始化：掃描 data-scramble 元素
// --------------------------------------------------------------------------
let abortController: AbortController | null = null;

function initTextScramble() {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  // 清除舊的 ScrollTrigger（View Transitions 重新初始化時）
  ScrollTrigger.getAll()
    .filter((st) => st.vars.id?.startsWith("scramble-"))
    .forEach((st) => st.kill());

  const elements = document.querySelectorAll<HTMLElement>("[data-scramble]");

  elements.forEach((el) => {
    const triggers = (el.dataset.scramble || "").split(/\s+/); // ["hover"] | ["scroll"] | ["scroll", "hover"]
    const duration = parseFloat(el.dataset.scrambleDuration || "") || DEFAULT_DURATION;
    const stagger = parseFloat(el.dataset.scrambleStagger || "") || 0; // 0 = 自動計算
    const delay = parseFloat(el.dataset.scrambleDelay || "") || 0;
    const hold = parseFloat(el.dataset.scrambleHold || "") || 0;
    const chars = el.dataset.scrambleChars || DEFAULT_CHARS;

    // 儲存原始文字（用於反覆觸發）
    if (!el.dataset.scrambleText) {
      el.dataset.scrambleText = el.textContent || "";
    }

    const options: ScrambleOptions = { duration, stagger, delay, hold, chars };

    // 頁面載入直接播放
    if (triggers.includes("immediate")) {
      scrambleElement(el, options);
    }

    if (triggers.includes("hover")) {
      // Hover 觸發的目標：可以是自身，也可以是父元素（data-scramble-target 指定）
      const targetSelector = el.dataset.scrambleTarget;
      const hoverTarget = targetSelector
        ? el.closest(targetSelector) || el.parentElement || el
        : el;

      let isPlaying = false;

      hoverTarget.addEventListener(
        "mouseenter",
        () => {
          if (isPlaying) return;
          isPlaying = true;
          scrambleElement(el, options).then(() => {
            isPlaying = false;
          });
        },
        { signal },
      );
    }
  });

  // --------------------------------------------------------------------------
  // Scroll 觸發：支援群組 stagger（data-scramble-group）
  // --------------------------------------------------------------------------
  const scrollElements = document.querySelectorAll<HTMLElement>("[data-scramble]");
  // 過濾出包含 "scroll" 的元素
  const scrollFiltered = Array.from(scrollElements).filter(
    (el) => (el.dataset.scramble || "").split(/\s+/).includes("scroll"),
  );
  const groups = new Map<string, HTMLElement[]>();
  const singles: HTMLElement[] = [];

  scrollFiltered.forEach((el) => {
    const group = el.dataset.scrambleGroup;
    if (group) {
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(el);
    } else {
      singles.push(el);
    }
  });

  // 單獨元素
  let stIndex = 0;
  singles.forEach((el) => {
    const duration = parseFloat(el.dataset.scrambleDuration || "") || DEFAULT_DURATION;
    const stagger = parseFloat(el.dataset.scrambleStagger || "") || 0;
    const delay = parseFloat(el.dataset.scrambleDelay || "") || 0;
    const hold = parseFloat(el.dataset.scrambleHold || "") || 0;
    const chars = el.dataset.scrambleChars || DEFAULT_CHARS;
    const triggerSelector = el.dataset.scrambleTrigger;
    const triggerEl = triggerSelector ? document.querySelector(triggerSelector) || el : el;

    if (!el.dataset.scrambleText) {
      el.dataset.scrambleText = el.textContent || "";
    }

    ScrollTrigger.create({
      id: `scramble-single-${stIndex++}`,
      trigger: triggerEl,
      start: "top 85%",
      once: true,
      onEnter: () => {
        scrambleElement(el, { duration, stagger, delay, hold, chars });
      },
    });
  });

  // 群組元素（stagger 依序觸發）
  const GROUP_STAGGER = 0.1; // 群組內元素間隔（秒）
  let grIndex = 0;

  groups.forEach((elements, name) => {
    const first = elements[0];
    const triggerSelector = first.dataset.scrambleTrigger;
    const triggerEl = triggerSelector ? document.querySelector(triggerSelector) || first : first;

    elements.forEach((el) => {
      if (!el.dataset.scrambleText) {
        el.dataset.scrambleText = el.textContent || "";
      }
    });

    ScrollTrigger.create({
      id: `scramble-group-${grIndex++}-${name}`,
      trigger: triggerEl,
      start: "top 85%",
      once: true,
      onEnter: () => {
        elements.forEach((el, i) => {
          const duration = parseFloat(el.dataset.scrambleDuration || "") || DEFAULT_DURATION;
          const stagger = parseFloat(el.dataset.scrambleStagger || "") || 0;
          const hold = parseFloat(el.dataset.scrambleHold || "") || 0;
          const chars = el.dataset.scrambleChars || DEFAULT_CHARS;
          scrambleElement(el, {
            duration,
            stagger,
            delay: i * GROUP_STAGGER,
            hold,
            chars,
          });
        });
      },
    });
  });
}

// --------------------------------------------------------------------------
// 程式化觸發:將 el 的文字以亂碼動畫切換成 targetText
// 用於動態切換的場合(如 mobile menu 開合時 logo 文字「YourName ⇄ Hello World」)
// --------------------------------------------------------------------------
export function scrambleTo(
  el: HTMLElement,
  targetText: string,
  options: Partial<ScrambleOptions> = {},
): Promise<void> {
  const resolved: ScrambleOptions = {
    duration: options.duration ?? DEFAULT_DURATION,
    stagger: options.stagger ?? 0,
    delay: options.delay ?? 0,
    hold: options.hold ?? 0,
    chars: options.chars ?? DEFAULT_CHARS,
  };
  // 改寫 dataset.scrambleText → scrambleElement 以此為最終文字
  el.dataset.scrambleText = targetText;
  return scrambleElement(el, resolved);
}

initTextScramble();
document.addEventListener("astro:page-load", initTextScramble);
