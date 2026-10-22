import { ArticlePage, articleMetadata } from '@/components/article-page';
import { source } from '@/lib/source';
export default function Page(props: PageProps<'/en/docs/[[...slug]]'>) { return ArticlePage(props, 'en'); }
export function generateStaticParams() { return source.generateParams().filter(p => p.lang === 'en'); }
export function generateMetadata(props: PageProps<'/en/docs/[[...slug]]'>) { return articleMetadata(props, 'en'); }
