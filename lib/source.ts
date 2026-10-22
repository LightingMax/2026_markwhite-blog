import { llms, loader } from 'fumadocs-core/source';
import { docsRoute, docsContentRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { i18n } from './i18n';
import { z } from 'zod';

const articleSchema = pageSchema.extend({
  navTitle: z.string().optional(),
  date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  series: z.string().optional(),
  part: z.number().optional(),
  source: z.string().optional(),
});

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: articleSchema,
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema },
});

export const source = loader({
  baseUrl: docsRoute,
  i18n,
  source: docs.toFumadocsSource(),
  plugins: [],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});

export type ArticleData = z.infer<typeof articleSchema>;
