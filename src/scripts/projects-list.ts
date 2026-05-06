// ==========================================================================
// Projects List Page — Embla Carousel + 自製 Mode Toggle / Parallax / Scramble
//
// Slider 互動(drag/swipe/keyboard/resize/direction-lock)由 Embla 處理。
// 自訂疊加層:
//   1. Mode toggle:Slider ↔ Grid + localStorage 記住
//   2. Hero title 跟隨 active 卡片(scrambleTo 動畫)
//   3. 進度條 fill + 計數
//   4. Slider 視差:水平方向,每張卡片的圖 x 依距 viewport 中心距離 × -120px
//   5. Grid 視差:垂直方向,每張卡片用 ScrollTrigger scrub,圖 y ±30px
//   6. 前後卡片 opacity 0.4 虛化
//   7. Click guard:拖曳後不觸發連結跳轉(Embla 的 clickAllowed API)
//   8. Slider ↔ Grid 切換動畫:GSAP FLIP plugin(單軌,跨瀏覽器一致)
// ==========================================================================

import EmblaCarousel, { type EmblaCarouselType } from "embla-carousel";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrambleTo } from "./text-scramble";
import { prefersReducedMotion } from "../utils/device";

gsap.registerPlugin(Flip, ScrollTrigger);

const STORAGE_KEY = "portfolio-projects-view";
const PARALLAX_OFFSET = 120; // Slider:每遠離中心一張卡片,圖 x 位移(px)
// Grid:垂直視差幅度(±px)。受限於圖片 scale(1.2) 提供的 10% 安全裕度,
// cover 最小高度 ~300px → 最大安全 ±30px。再多會看到底圖邊緣。
const GRID_PARALLAX_OFFSET = 35;

type Mode = "slider" | "grid";

let abortController: AbortController | null = null;
let emblaApi: EmblaCarouselType | null = null;
let isTransitioning = false; // 防止動畫期間重複點擊
let gridParallaxTriggers: ScrollTrigger[] = []; // Grid mode 每張卡片一個 trigger

// --------------------------------------------------------------------------
// Mode 切換
// --------------------------------------------------------------------------
function applyMode(mode: Mode) {
  const container = document.getElementById("projects-list");
  if (!container) return;

  // 切離 grid 時先清掉 grid parallax 的 ScrollTrigger,避免殘留 trigger 對著
  // 即將被 Embla 接管的 img-wrap 持續寫入 translateY。
  disableGridParallax();

  container.classList.remove("mode-slider", "mode-grid");
  container.classList.add(`mode-${mode}`);
  container.dataset.view = mode;

  document.querySelectorAll<HTMLButtonElement>(".view-toggle__btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === mode));
  });

  if (mode === "grid") {
    // 銷毀 Embla + 清除它加的 inline transform,讓 CSS grid 正常佈局
    emblaApi?.destroy();
    emblaApi = null;
    document.querySelectorAll<HTMLElement>(".project-card").forEach((el) => {
      el.classList.remove("is-active");
      el.style.opacity = "";
      el.style.transform = "";
    });
    document.querySelectorAll<HTMLElement>(".project-card__img-wrap").forEach((el) => {
      el.style.transform = "";
    });
    container.style.transform = "";
    // 注意:不在這裡呼叫 enableGridParallax(),由 caller(initProjectsList 或
    // animateModeSwitch 的 FLIP onComplete)決定時機。FLIP 動畫期間建立 trigger
    // 會讓 ScrollTrigger 讀到變動中的卡片 bbox,進度算錯造成跳動。
  } else {
    initEmbla();
  }

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

// --------------------------------------------------------------------------
// Grid mode 垂直視差(ScrollTrigger scrub,每張卡片獨立 trigger)
//
// 每張卡片從進入視窗(top hits viewport bottom)到離開視窗(bottom hits viewport top)
// 期間,img-wrap 的 y 從 +OFFSET 補間到 -OFFSET。圖片 scale(1.2) 提供 10% 安全
// 裕度避免露邊。
// --------------------------------------------------------------------------
function enableGridParallax() {
  disableGridParallax();
  if (prefersReducedMotion()) return;

  document.querySelectorAll<HTMLElement>(".project-card").forEach((card) => {
    const imgWrap = card.querySelector<HTMLElement>(".project-card__img-wrap");
    if (!imgWrap) return;

    const tween = gsap.fromTo(
      imgWrap,
      { y: GRID_PARALLAX_OFFSET },
      {
        y: -GRID_PARALLAX_OFFSET,
        ease: "none",
        scrollTrigger: {
          trigger: card,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );

    const st = tween.scrollTrigger;
    if (st) gridParallaxTriggers.push(st);
  });
}

function disableGridParallax() {
  gridParallaxTriggers.forEach((st) => st.kill());
  gridParallaxTriggers = [];
}

// --------------------------------------------------------------------------
// Mode 切換動畫 — GSAP FLIP
//
// 單軌 FLIP 策略(跨瀏覽器一致,避免 View Transitions 與 ClientRouter 互踩):
//   Slider → Grid:
//     1. 淡出 hero title + slider controls(0.2s)
//     2. 抓取卡片 First 位置 → applyMode('grid') → CSS :has() 隱藏 slider UI
//     3. Flip.from 動畫卡片飛到 Grid 格子位置
//   Grid → Slider:
//     1. 抓取卡片 First 位置 → applyMode('slider') → CSS 還原 slider UI
//     2. 清除 Embla 剛設的 img-wrap parallax,避免 FLIP 期間子元素跳動
//     3. Flip.from 動畫卡片飛回 Slider track 位置
//     4. 淡入 hero title + controls(delay 0.3s 跟著飛位漸入)
//     5. 完成後 emblaApi.reInit() 重新套用 parallax
//
// reduced-motion 直接走 applyMode(無動畫)。
// --------------------------------------------------------------------------
function animateModeSwitch(toMode: Mode) {
  if (isTransitioning) return;
  const container = document.getElementById("projects-list");
  if (!container) return;
  if (container.dataset.view === toMode) return;

  if (prefersReducedMotion()) {
    applyMode(toMode);
    return;
  }

  const heroTitle = document.getElementById("slider-active-title");
  const controls = document.getElementById("slider-controls");
  const wrap = document.getElementById("projects-list-wrap");
  if (!wrap) {
    applyMode(toMode);
    return;
  }

  isTransitioning = true;
  const fadeTargets = [heroTitle, controls].filter(
    (el): el is HTMLElement => el !== null,
  );

  const playFlip = (state: ReturnType<typeof Flip.getState>) => {
    Flip.from(state, {
      duration: 0.7,
      ease: "power3.inOut",
      stagger: 0.03,
      props: "opacity",
      // scale: true → FLIP 用 transform: scale() 處理尺寸差(預設 width/height 動畫)。
      // 卡片寬度由父層 flex(50vw)/ grid(1fr) 決定,inline width 蓋不過去,
      // 改走 scale 才能讓尺寸跟位置一起平滑變化(GPU composited,不會 reflow)。
      scale: true,
      onComplete: () => {
        if (toMode === "slider") {
          // Grid → Slider:讓 Embla 重新計算位移與水平 parallax
          emblaApi?.reInit();
        } else {
          // Slider → Grid:卡片就定位後再啟用垂直 ScrollTrigger,
          // 避免 trigger 在 FLIP 過程中讀到變動中的 bbox。
          enableGridParallax();
        }
        isTransitioning = false;
      },
    });
  };

  // 注意:不要在動畫期間把 wrap 的 overflow 改成 visible。
  // mode-slider 時 container 寬度 ~250vw(50vw 卡 × 4 + 25vw peek × 2),
  // 一放開就會觸發 body 水平捲軸,導致 fixed header 的 viewport 高度改變看起來在跳。
  // 卡片被 wrap 邊緣裁切而從旁邊「滑入」反而是更乾淨的進場效果。

  if (toMode === "grid") {
    // Slider → Grid:先淡出 slider UI 再 swap + FLIP
    gsap
      .timeline()
      .to(fadeTargets, { opacity: 0, duration: 0.2, ease: "power2.out" })
      .add(() => {
        const state = Flip.getState(".project-card", { props: "opacity" });
        applyMode(toMode); // CSS :has() 透過 mode-grid 隱藏 slider UI
        // 清除 inline opacity,留乾淨狀態給下次 Grid → Slider 重來
        fadeTargets.forEach((el) => {
          el.style.opacity = "";
        });
        playFlip(state);
      });
  } else {
    // Grid → Slider:swap + FLIP,期間清除 parallax,完成後 reInit
    const state = Flip.getState(".project-card", { props: "opacity" });
    applyMode(toMode); // CSS 還原 slider UI 的 display
    // 清除 Embla 剛在 init 中設好的 img-wrap parallax 位移
    // → 讓 img-wrap 跟著父卡片 FLIP 平滑移動,不要在飛行途中又被 parallax 偏移
    document
      .querySelectorAll<HTMLElement>(".project-card__img-wrap")
      .forEach((el) => {
        el.style.transform = "";
      });
    // hero title + controls 從 0 淡入(delay 跟著飛位後段)
    gsap.set(fadeTargets, { opacity: 0 });
    gsap.to(fadeTargets, {
      opacity: 1,
      duration: 0.4,
      delay: 0.3,
      ease: "power2.out",
    });
    playFlip(state);
  }
}

// --------------------------------------------------------------------------
// Embla 初始化 + 所有 slider 相關 binding
// --------------------------------------------------------------------------
function initEmbla() {
  const viewport = document.getElementById("projects-list-wrap");
  if (!viewport) return;

  emblaApi?.destroy();

  emblaApi = EmblaCarousel(viewport, {
    align: "center",
    loop: false,
    containScroll: "", // 取消 contain → 第一/最後一張都能真正置中(代價:peek 區會露出空白)
    duration: 30,
    dragThreshold: 10,
  });

  // ==========================================================================
  // 視差動畫核心 — 詳細備註區塊
  // ⚠️  SIMPLIFY-KEEP: 此區塊註解請勿刪減
  //     即便看似冗長,這些註解承載「為什麼這樣算 / 為什麼這樣寫」的決策依據,
  //     刪掉後未來重新理解這段的成本會非常高。
  // ==========================================================================
  //
  // 【原理】
  // 用 Embla 的 scrollProgress 取代 getBoundingClientRect 計算每張卡片的圖片位移。
  // 優點:純算術、無 reflow → 卡片數量增加(10+)時效能不降。
  //
  // 【座標系統】
  // - scrollProgress:整個 slider 的 scroll 進度,範圍 0~1。
  //     0 = 第一張卡片完全置中;1 = 最後一張完全置中。
  // - scrollSnapList:每張卡片「被選到時」對應的 scrollProgress 值。
  //     例如 4 張均分 = [0, 0.333, 0.667, 1]。
  //
  // 【diffToTarget 的意義】
  // diff = snap - progress = 該卡片距離「現在中心位置」的進度差。
  // - 0:該卡片正好是 active(在中心)
  // - 正值:該卡片在右邊(下一張、下下張…)
  // - 負值:該卡片在左邊(上一張…)
  //
  // 【為何要乘 (N-1)】
  // diff 範圍是 -1 ~ 1(整個 scroll 範圍),但這段距離跨越 (N-1) 個「卡片間距」。
  // 例如 4 張卡片的 snapList = [0, 0.333, 0.667, 1]:
  //   active=slide0(progress=0)→ slide1 的 diff = 0.333
  //   0.333 × (4-1) = 1 → 表示「距離 1 個卡片寬」
  // 所以 cardsDist = diff × (N-1) 才會是「以卡片為單位」的距離。
  //
  // 【視差方向(為何乘 -1)】
  // active 的圖 x = 0;右邊卡片(diff > 0,cardsDist > 0)圖 x 要往左 → 乘 -1。
  // 視覺上像「圖落後於卡片」(經典視差感)。
  // PARALLAX_OFFSET = 每相距一張卡片時的圖片 x 位移幅度(px)。
  //
  // 【為何只處理 slidesInView】
  // 視窗外的卡片不會被使用者看到,沒必要更新 transform → 省 CPU。
  // emblaApi.slidesInView() 自動回傳目前可見的 slide 索引(含 peek 露出的部分)。
  //
  // 【loop 補丁存在的理由】
  // 當 Embla loop 啟用時,卡片在循環邊緣會被「視覺上重新定位」(例如最後一張
  // 到「比第一張更右」的位置)。這時純算 snap - progress 會 diff 跳值(例如
  // 從 0.9 突然變 -0.1),圖片也會跳。loopPoints 提供補正資訊讓 diff 平滑。
  // 目前 loop: false 沒用到,但保留以備未來開啟。
  //
  // 【設計來源】Embla 官方 parallax 範例 + 本專案 PARALLAX_OFFSET 改 px 為單位
  // ==========================================================================
  function updateParallax() {
    if (!emblaApi) return;

    // Embla 內部 engine,只用來讀 loopPoints(loop 模式下的補正資料)
    const engine = emblaApi.internalEngine();
    // 0~1 的整體 scroll 進度,0 = 最左,1 = 最右
    const scrollProgress = emblaApi.scrollProgress();
    // 目前可見的 slide 索引陣列(含部分露出 peek 的 slide)
    const slidesInView = emblaApi.slidesInView();
    // 每張 slide 對應的 scroll snap 值(0~1)
    const snapList = emblaApi.scrollSnapList();
    const slideNodes = emblaApi.slideNodes();
    // 把「diff 範圍 0~1」換算成「卡片間距數」的乘數
    // Math.max 防呆:只有 1 張卡片時 (N-1)=0 會除錯
    const cardsPerUnit = Math.max(1, snapList.length - 1);

    snapList.forEach((scrollSnap, snapIndex) => {
      // 不在視窗內的卡片直接跳過 → 省 CPU
      if (!slidesInView.includes(snapIndex)) return;

      // 該卡片距離「目前中心」的進度差(0~1 標準化)
      let diffToTarget = scrollSnap - scrollProgress;

      // Loop 補丁:循環邊緣時 diff 會跳值,用 loopPoints 重新計算
      // (loop: false 時這段永遠不執行,可放心保留)
      if (engine.options.loop) {
        engine.slideLooper.loopPoints.forEach((loopItem: { index: number; target: () => number }) => {
          const target = loopItem.target();
          if (snapIndex === loopItem.index && target !== 0) {
            const sign = Math.sign(target);
            // 卡片從右邊循環回到左邊(target < 0)時,把它當「比 progress 大 1」算
            if (sign === -1) diffToTarget = scrollSnap - (1 + scrollProgress);
            // 卡片從左邊循環回到右邊(target > 0)時,反向處理
            if (sign === 1) diffToTarget = scrollSnap + (1 - scrollProgress);
          }
        });
      }

      // 換算為「卡片寬度」單位的距離,再乘 PARALLAX_OFFSET 得 px 位移
      // 負號:讓圖片視覺上落後於卡片(經典視差方向)
      const cardsDist = diffToTarget * cardsPerUnit;
      const offsetX = -cardsDist * PARALLAX_OFFSET;

      const imgWrap = slideNodes[snapIndex].querySelector<HTMLElement>(".project-card__img-wrap");
      if (imgWrap) imgWrap.style.transform = `translateX(${offsetX}px)`;
    });
  }

  // ------------------------------------------------------------------------
  // Active 卡片:is-active class 控制 opacity(CSS 處理)
  // ------------------------------------------------------------------------
  function updateActiveCard() {
    if (!emblaApi) return;
    const current = emblaApi.selectedScrollSnap();
    emblaApi.slideNodes().forEach((slide, i) => {
      slide.classList.toggle("is-active", i === current);
    });
  }

  // ------------------------------------------------------------------------
  // 進度條 + 計數
  // ------------------------------------------------------------------------
  function updateProgress() {
    if (!emblaApi) return;
    const current = emblaApi.selectedScrollSnap();
    const total = emblaApi.scrollSnapList().length;
    const fill = document.querySelector<HTMLElement>(".slider-progress__bar-fill");
    if (fill) fill.style.setProperty("--progress", String((current + 1) / total));
    const countEl = document.getElementById("slider-progress-current");
    if (countEl) countEl.textContent = String(current + 1).padStart(2, "0");
    document.querySelector(".slider-progress__bar")?.setAttribute("aria-valuenow", String(current + 1));
  }

  // ------------------------------------------------------------------------
  // Prev/Next 按鈕 disabled 狀態
  // ------------------------------------------------------------------------
  function updateNavDisabled() {
    if (!emblaApi) return;
    const prev = document.querySelector<HTMLButtonElement>("[data-slider-prev]");
    const next = document.querySelector<HTMLButtonElement>("[data-slider-next]");
    if (prev) prev.disabled = !emblaApi.canScrollPrev();
    if (next) next.disabled = !emblaApi.canScrollNext();
  }

  // ------------------------------------------------------------------------
  // Hero title 亂碼切換到 active 卡片名稱
  // ------------------------------------------------------------------------
  function scrambleHeroTitle() {
    if (!emblaApi) return;
    const hero = document.getElementById("slider-active-title");
    if (!hero) return;
    const idx = emblaApi.selectedScrollSnap();
    const slide = emblaApi.slideNodes()[idx];
    if (!slide) return;
    const title = slide.querySelector(".project-card__title")?.textContent || "";
    scrambleTo(hero, title, { duration: 0.4 });
  }

  // ------------------------------------------------------------------------
  // 事件綁定
  // ------------------------------------------------------------------------
  emblaApi.on("scroll", updateParallax); // 每幀拖曳 / 動畫中觸發
  emblaApi.on("reInit", () => {
    updateParallax();
    updateActiveCard();
    updateProgress();
    updateNavDisabled();
  });
  emblaApi.on("select", () => {
    updateActiveCard();
    updateProgress();
    updateNavDisabled();
    scrambleHeroTitle();
  });
  emblaApi.on("settle", updateParallax); // 停下後確保視差最終位置準確

  // 初始化一次
  updateParallax();
  updateActiveCard();
  updateProgress();
  updateNavDisabled();
  // 首次載入 hero title 直接設文字(不 scramble)
  const hero = document.getElementById("slider-active-title");
  const firstSlide = emblaApi.slideNodes()[emblaApi.selectedScrollSnap()];
  if (hero && firstSlide) {
    hero.textContent = firstSlide.querySelector(".project-card__title")?.textContent || "";
  }
}

// --------------------------------------------------------------------------
// Init(SPA page-load + 首次載入共用)
// --------------------------------------------------------------------------
function initProjectsList() {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;
  emblaApi?.destroy();
  emblaApi = null;
  isTransitioning = false;

  const container = document.getElementById("projects-list");
  if (!container) return;

  // 重置殘留 scale
  document.querySelectorAll<HTMLElement>(".project-card").forEach((el) => {
    el.style.transform = "";
  });

  // 初始 mode
  let initial: Mode = "slider";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "slider" || saved === "grid") initial = saved;
  } catch {
    /* ignore */
  }
  applyMode(initial);
  // 初始即為 grid 時,直接啟用垂直視差(沒有 FLIP 動畫要等)
  if (initial === "grid") enableGridParallax();

  // Mode toggle 按鈕(走帶動畫的 animateModeSwitch,首次載入用 applyMode 不動畫)
  document.querySelectorAll<HTMLButtonElement>(".view-toggle__btn").forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const mode = btn.dataset.mode as Mode | undefined;
        if (mode) animateModeSwitch(mode);
      },
      { signal },
    );
  });

  // Prev / Next
  document.querySelector<HTMLButtonElement>("[data-slider-prev]")?.addEventListener(
    "click",
    () => emblaApi?.scrollPrev(),
    { signal },
  );
  document.querySelector<HTMLButtonElement>("[data-slider-next]")?.addEventListener(
    "click",
    () => emblaApi?.scrollNext(),
    { signal },
  );

  // 鍵盤(僅 slider mode)
  window.addEventListener(
    "keydown",
    (e) => {
      if (container.dataset.view !== "slider") return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
      else if (e.key === "ArrowRight") emblaApi?.scrollNext();
    },
    { signal },
  );

  // 進度條點擊跳轉:點擊位置 / bar 寬度 → round 到最接近的 snap index
  const progressBar = document.querySelector<HTMLElement>(".slider-progress__bar");
  progressBar?.addEventListener(
    "click",
    (e) => {
      if (!emblaApi) return;
      if (container.dataset.view !== "slider") return;
      const rect = progressBar.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const total = emblaApi.scrollSnapList().length;
      const idx = Math.max(0, Math.min(total - 1, Math.round(ratio * (total - 1))));
      emblaApi.scrollTo(idx);
    },
    { signal },
  );

  // Click guard:拖曳後不觸發 <a> 跳轉(Embla 判斷是否為拖曳)
  document.querySelectorAll<HTMLAnchorElement>(".project-card__link").forEach((link) => {
    link.addEventListener(
      "click",
      (e) => {
        if (emblaApi && !emblaApi.clickAllowed()) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { signal },
    );
  });

  // 不再用 signal abort 觸發 destroy(會在下一次 init 開頭造成 race:
  // abort → destroy 把剛 init 的 Embla 殺掉)
}

initProjectsList();
document.addEventListener("astro:page-load", initProjectsList);
