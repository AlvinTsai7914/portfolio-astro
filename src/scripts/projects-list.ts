// ==========================================================================
// Projects List Page — Embla Carousel + 自製 Mode Toggle / Parallax / Scramble
//
// Slider 互動(drag/swipe/keyboard/resize/direction-lock)由 Embla 處理。
// 自訂疊加層:
//   1. Mode toggle:Slider ↔ Grid + localStorage 記住
//   2. Hero title 跟隨 active 卡片(scrambleTo 動畫)
//   3. 進度條 fill + 計數
//   4. 位置式視差:每張卡片的圖 x 依距 viewport 中心距離 × -120px
//   5. 前後卡片 opacity 0.4 虛化
//   6. Click guard:拖曳後不觸發連結跳轉(Embla 的 clickAllowed API)
//
// 尚未實作(Phase 4):
//   - Slider ↔ Grid 切換用 View Transitions + GSAP FLIP 降級
// ==========================================================================

import EmblaCarousel, { type EmblaCarouselType } from "embla-carousel";
import { scrambleTo } from "./text-scramble";

const STORAGE_KEY = "portfolio-projects-view";
const PARALLAX_OFFSET = 120; // 每遠離中心一張卡片,圖 x 位移(px)

type Mode = "slider" | "grid";

let abortController: AbortController | null = null;
let emblaApi: EmblaCarouselType | null = null;

// --------------------------------------------------------------------------
// Mode 切換
// --------------------------------------------------------------------------
function applyMode(mode: Mode) {
  const container = document.getElementById("projects-list");
  if (!container) return;

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

  // Mode toggle 按鈕
  document.querySelectorAll<HTMLButtonElement>(".view-toggle__btn").forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const mode = btn.dataset.mode as Mode | undefined;
        if (mode) applyMode(mode);
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
