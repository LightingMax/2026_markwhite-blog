import { ArticleIndex } from '@/components/article-index';
import { TranslationNotice } from '@/components/translation-notice';
import { source, type ArticleData } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton, ViewOptionsPopover } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getPageImageUrl, getPageMarkdownUrl, gitConfig } from '@/lib/shared';

export async function ArticlePage(props: { params: Promise<{ slug?: string[] }> }, locale: 'zh' | 'en' = 'zh') {
  const params = await props.params;
  const page = source.getPage(params.slug, locale);
  if (!page) notFound();

  const data = page.data as ArticleData;
  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={page.slugs.length ? page.data.toc : []} full={page.data.full} footer={{ enabled: page.slugs.length > 0 }}>
      <TranslationNotice /><DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && <DocsDescription className="mb-0">{page.data.description}</DocsDescription>}
      {(data.date || data.series || data.tags?.length || data.source) && (
        <div className="article-meta">
          {data.date && <span>{data.date}</span>}
          {data.series && <span>{data.series}{data.part ? ` · ${String(data.part).padStart(2, '0')}` : ''}</span>}
          {data.source && <span>{data.source}</span>}
          {data.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      )}
      {page.slugs.length > 0 && <div className="article-tools">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`} />
      </div>}
      {!page.slugs.length ? <ArticleIndex locale={locale} /> : <DocsBody><MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} /></DocsBody>}
    </DocsPage>
  );
}

export async function articleMetadata(props: { params: Promise<{ slug?: string[] }> }, locale: 'zh' | 'en' = 'zh'): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug, locale);
  if (!page) notFound();
  return {
    title: `${page.data.title} · Mark White`,
    description: page.data.description,
    alternates: {
      canonical: `https://markwhite.cn/blog${page.url}`,
      languages: Object.fromEntries((['zh', 'en'] as const).flatMap(lang => {
        const translation = source.getPage(page.slugs, lang);
        return translation ? [[lang, `https://markwhite.cn/blog${translation.url}`]] : [];
      })),
    },
    openGraph: { images: getPageImageUrl(page).url },
  };
}
