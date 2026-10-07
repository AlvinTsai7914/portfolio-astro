// 技術棧掃描:node scan-tech.mjs <url>
// 偵測全域變數(jQuery/Vue/React/Swiper/GSAP/AOS…)、Bootstrap、script src 清單
import { chromium } from "playwright";

const url = process.argv[2];
if (!url) { console.error("用法: node scan-tech.mjs <url>"); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const scripts = new Set();
page.on("response", (r) => {
  const u = r.url();
  if (/\.js(\?|$)/.test(u)) scripts.add(u.replace(/^https?:\/\//, "").slice(0, 90));
});
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);

const probe = await page.evaluate(() => {
  const w = window;
  const hasBootstrapCss = [...document.styleSheets].some((s) => {
    try { return [...(s.cssRules || [])].some((r) => r.cssText?.includes(".col-md-")); } catch { return false; }
  });
  return {
    generator: document.querySelector('meta[name="generator"]')?.getAttribute("content") || null,
    jquery: w.jQuery ? w.jQuery.fn.jquery : null,
    bootstrapJs: w.bootstrap ? "yes" : (w.jQuery?.fn?.modal ? "bs-jquery-plugin" : null),
    vue: w.Vue ? w.Vue.version || "yes" : null,
    react: w.React ? "yes" : (document.querySelector("[data-reactroot]") ? "likely" : null),
    swiper: w.Swiper ? "yes" : (document.querySelector(".swiper, .swiper-container") ? "dom-likely" : null),
    slick: w.jQuery?.fn?.slick ? "yes" : (document.querySelector(".slick-slider") ? "dom-likely" : null),
    gsap: w.gsap ? "yes" : null,
    aos: w.AOS ? "yes" : (document.querySelector("[data-aos]") ? "dom-likely" : null),
    wow: w.WOW ? "yes" : null,
    bootstrapClasses: hasBootstrapCss ? "css-detected" : (document.querySelector('[class*="col-md"],[class*="col-lg"]') ? "dom-detected" : null),
  };
});
console.log(JSON.stringify(probe, null, 1));
console.log("--- scripts ---");
[...scripts].slice(0, 20).forEach((s) => console.log(" ", s));
await browser.close();
