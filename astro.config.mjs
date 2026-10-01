// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // 部署網址:目前為 Vercel 預設域名,綁自訂域名後改這裡(canonical 與 sitemap 依賴)
  site: 'https://portfolio-astro-five-beta.vercel.app',
  integrations: [mdx(), sitemap()],
});
