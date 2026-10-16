import { defineConfig } from 'fumadocs-mdx/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    remarkImageOptions: false,
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
      langAlias: { math: 'text' },
    },
  },
});
