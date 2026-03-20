// ==========================================================================
// Content Collections 定義
// 來源：CLAUDE.md 專案結構
//
// 中英文使用獨立 collection，避免 glob loader ID 衝突
// ==========================================================================

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  lang: z.enum(["zh", "en"]),
  slug: z.string(),
  status: z.enum(["online", "offline"]),
  tags: z.array(z.string()),
  cover: z.string().optional(),
  liveUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  order: z.number().default(0),
  date: z.string(),
});

const projectsZh = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects/zh" }),
  schema: projectSchema,
});

const projectsEn = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects/en" }),
  schema: projectSchema,
});

export const collections = {
  "projects-zh": projectsZh,
  "projects-en": projectsEn,
};
