// ==========================================================================
// 頁面轉場 — 雙色遮罩掃描動畫（Web Animations API）
//
// 使用 Web Animations API 而非 GSAP，讓 transform 動畫在合成器線程執行，
// 不受主線程 JS 阻塞影響（如 WebGL texSubImage2D）。
//
// 覆蓋（點擊連結時）：
//   橘色遮罩從上→下展開 → 黑色遮罩跟進 → 畫面全覆蓋
//
// 揭示（新頁面出現 / 首次載入）：
//   等待 ASCII 準備完成（或超時）→ 黑色遮罩退場 → 橘色遮罩退場
// ==========================================================================

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const COVER_DURATION = 500;       // 覆蓋動畫時長（ms）
const REVEAL_DURATION = 500;      // 揭示動畫時長（ms）
const STAGGER = 100;              // 兩層遮罩間隔（ms）
const EASING = "cubic-bezier(0.65, 0, 0.35, 1)"; // ≈ power3.inOut
const ASCII_TIMEOUT = 1500;       // 有 ASCII 頁面的最大等待時間（ms）
const NO_ASCII_TIMEOUT = 300;     // 無 ASCII 頁面的等待時間（ms）

// --------------------------------------------------------------------------
// 等待 ASCII 準備完成或超時
// --------------------------------------------------------------------------
function waitForAsciiReady(): Promise<void> {
  const hasAscii = document.getElementById("hero-ascii") !== null;
  const timeout = hasAscii ? ASCII_TIMEOUT : NO_ASCII_TIMEOUT;

  if (!hasAscii) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }

  return new Promise((resolve) => {
    let resolved = false;

    function done() {
      if (resolved) return;
      resolved = true;
      window.removeEventListener("hero-ascii-ready", done);
      resolve();
    }

    window.addEventListener("hero-ascii-ready", done, { once: true });
    setTimeout(done, timeout);
  });
}

// --------------------------------------------------------------------------
// 輔助：執行動畫並等待完成，結束後將最終狀態寫入 style
// --------------------------------------------------------------------------
function animate(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<void> {
  return new Promise((resolve) => {
    const anim = el.animate(keyframes, options);
    anim.onfinish = () => {
      // commitStyles 把動畫最終值寫入 inline style，避免動畫結束後彈回
      anim.commitStyles();
      anim.cancel();
      resolve();
    };
  });
}

// --------------------------------------------------------------------------
// 覆蓋動畫：遮罩從上到下展開
// 順序：橘色先 → 黑色後
// origin: top → scaleY 0→1（從頂部向下展開）
// --------------------------------------------------------------------------
async function animateCover(): Promise<void> {
  const brandMask = document.querySelector<HTMLElement>(".page-transition__mask--brand");
  const fgMask = document.querySelector<HTMLElement>(".page-transition__mask--fg");
  if (!brandMask || !fgMask) return;

  // 設定初始狀態
  brandMask.style.transformOrigin = "top";
  brandMask.style.transform = "scaleY(0)";
  fgMask.style.transformOrigin = "top";
  fgMask.style.transform = "scaleY(0)";

  const keyframes = [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }];

  // 橘色先展開，黑色延遲跟進
  const p1 = animate(brandMask, keyframes, {
    duration: COVER_DURATION,
    easing: EASING,
  });

  const p2 = animate(fgMask, keyframes, {
    duration: COVER_DURATION,
    easing: EASING,
    delay: STAGGER,
  });

  // 等兩層都完成
  await Promise.all([p1, p2]);
}

// --------------------------------------------------------------------------
// 揭示動畫：遮罩從上到下退場
// 順序：黑色先縮 → 橘色後縮（最後蓋上的最先離開）
// origin: bottom → scaleY 1→0（頂部先露出，遮罩向下方消失）
// --------------------------------------------------------------------------
async function animateReveal(): Promise<void> {
  const brandMask = document.querySelector<HTMLElement>(".page-transition__mask--brand");
  const fgMask = document.querySelector<HTMLElement>(".page-transition__mask--fg");
  if (!brandMask || !fgMask) return;

  // 設定退場方向
  brandMask.style.transformOrigin = "bottom";
  fgMask.style.transformOrigin = "bottom";

  const keyframes = [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }];

  // 黑色先退場，橘色延遲跟進
  const p1 = animate(fgMask, keyframes, {
    duration: REVEAL_DURATION,
    easing: EASING,
  });

  const p2 = animate(brandMask, keyframes, {
    duration: REVEAL_DURATION,
    easing: EASING,
    delay: STAGGER,
  });

  await Promise.all([p1, p2]);
}

// --------------------------------------------------------------------------
// 頁面間導航
// --------------------------------------------------------------------------
document.addEventListener("astro:before-preparation", (e) => {
  const originalLoader = e.loader;

  e.loader = async () => {
    await animateCover();
    await originalLoader();
  };
});

document.addEventListener("astro:after-swap", async () => {
  window.scrollTo(0, 0);
  await waitForAsciiReady();
  animateReveal();
});

// --------------------------------------------------------------------------
// 首次載入 — 等 ASCII 準備好再退場
// --------------------------------------------------------------------------
async function handleInitialLoad() {
  await waitForAsciiReady();
  animateReveal();
}

handleInitialLoad();
