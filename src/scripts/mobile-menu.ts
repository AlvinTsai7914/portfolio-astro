// ==========================================================================
// MobileMenu 控制
//
// 職責:
//   1. MENU 按鈕 toggle 開合 mobile-menu overlay
//   2. 開合時 logo 文字切換(Alvin Tsai ⇄ Hello World),用 text-scramble 程式化觸發
//   3. IntersectionObserver 偵測當前 section,更新選單中 .is-active 項目
//   4. body scroll lock(開啟時禁止捲動)
//   5. ESC 關閉、nav 點擊先關再平滑滾動
//
// 相關檔案:
//   src/components/layout/MobileMenu.astro — overlay DOM + 樣式
//   src/components/layout/Header.astro     — MENU 按鈕 + logo span
//   src/scripts/text-scramble.ts           — 提供 scrambleTo 函數
// ==========================================================================

import { scrambleTo } from "./text-scramble";

const LOGO_DEFAULT = "Alvin Tsai";
const LOGO_OPEN = "Hello World";
const SECTION_ACTIVE_MARGIN = "-40% 0px -40% 0px";

let abortController: AbortController | null = null;
let sectionObserver: IntersectionObserver | null = null;
let isOpen = false;

function initMobileMenu() {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;
  sectionObserver?.disconnect();
  sectionObserver = null;
  isOpen = false;

  // SPA 切頁後清除舊 open 狀態
  document.body.classList.remove("menu-open");
  document.body.style.overflow = "";

  const toggle = document.getElementById("header-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  const logo = document.getElementById("header-logo-text");
  const label = toggle?.querySelector<HTMLElement>(".header__menu-toggle-label");
  const links = menu?.querySelectorAll<HTMLAnchorElement>(".mobile-menu__link") ?? [];

  if (!toggle || !menu) return;

  function setState(open: boolean) {
    isOpen = open;
    menu!.classList.toggle("is-open", open);
    toggle!.classList.toggle("is-open", open);
    menu!.setAttribute("aria-hidden", open ? "false" : "true");
    toggle!.setAttribute("aria-expanded", open ? "true" : "false");
    toggle!.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (label) label.textContent = open ? "CLOSE" : "MENU";
    if (logo) scrambleTo(logo, open ? LOGO_OPEN : LOGO_DEFAULT, { duration: 0.4, hold: 0.05 });
    // 桌機版:暫停/恢復 Lenis(手機無 lenis,optional chaining 安全跳過)
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
  }

  toggle.addEventListener("click", () => setState(!isOpen), { signal });

  // ESC 關閉
  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setState(false);
    },
    { signal },
  );

  // Nav 點擊:先切換 active 到被點擊項(橘色 indicator + 文字),停留 300ms 讓使用者看到,
  // 再關閉 menu,最後平滑捲動到目標 section。跨頁導航不需 preventDefault。
  const ACTIVE_PREVIEW_MS = 300;
  const CLOSE_ANIMATION_MS = 450;

  links.forEach((link) => {
    link.addEventListener(
      "click",
      (e: MouseEvent) => {
        const href = link.getAttribute("href") || "";
        const hashIdx = href.indexOf("#");
        if (hashIdx === -1) return;

        const targetId = href.slice(hashIdx + 1);
        const hrefPath = href.slice(0, hashIdx);
        const samePage = hrefPath === "" || hrefPath === window.location.pathname;

        // 立即將 is-active 套到被點擊的 link(其他 link 移除)
        links.forEach((l) => l.classList.toggle("is-active", l === link));

        if (!samePage) {
          // 跨頁:略作停留讓使用者看到 active,再關 menu,瀏覽器自然導航
          setTimeout(() => setState(false), ACTIVE_PREVIEW_MS);
          return;
        }

        e.preventDefault();
        setTimeout(() => {
          setState(false);
          setTimeout(() => {
            const target = document.getElementById(targetId);
            if (!target) return;
            // 桌機版 Lenis 存在時用 scrollTo(避免 native smooth 與 Lenis 衝突);手機版 fallback native
            if (window.__lenis) {
              window.__lenis.scrollTo(target);
            } else {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, CLOSE_ANIMATION_MS);
        }, ACTIVE_PREVIEW_MS);
      },
      { signal },
    );
  });

  // IntersectionObserver:當前 section → .is-active
  const sections = document.querySelectorAll<HTMLElement>("section[id]");
  if (sections.length > 0) {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).id;
            links.forEach((link) => {
              link.classList.toggle("is-active", link.dataset.section === id);
            });
          }
        }
      },
      { rootMargin: SECTION_ACTIVE_MARGIN, threshold: 0 },
    );
    sections.forEach((s) => sectionObserver!.observe(s));
    signal.addEventListener("abort", () => sectionObserver?.disconnect());
  }
}

initMobileMenu();
document.addEventListener("astro:page-load", initMobileMenu);
