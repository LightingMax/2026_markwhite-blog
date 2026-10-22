import { ArticlePage, articleMetadata } from '@/components/article-page';
import { source } from '@/lib/source';
export default function Page(props: PageProps<'/docs/[[...slug]]'>) { return ArticlePage(props); }
export function generateStaticParams() { return source.generateParams().filter(p => p.lang === 'zh'); }
export const generateMetadata = (props: PageProps<'/docs/[[...slug]]'>) => articleMetadata(props);
