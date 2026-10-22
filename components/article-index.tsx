import Link from 'next/link';
import { source } from '@/lib/source';
import type { Locale } from '@/lib/i18n';
export function ArticleIndex({ locale }: { locale: Locale }) {
 const en = locale === 'en';
 const pages = source.getPages(locale).filter(page => {
   if (page.slugs.join('/') === 'computer-vision/camera-color') return true;
   if (page.slugs.includes('camera-color') && !page.slugs.includes('paper-reading')) return false;
   return !page.path.replace(/\.(en|zh)\.mdx$/, '.mdx').endsWith('index.mdx');
 });
 const groups = [
  { key: 'computer-vision', name: en ? 'Computer vision' : '技术与研究', note: en ? 'Methods, tools, and practical experiments.' : '相机、视觉与工具，把原理接回实践。' },
  { key: 'projects', name: en ? 'Building' : '项目记录', note: '构建过程与可以复用的经验。' },
  { key: 'thoughts', name: en ? 'Reflections' : '个人思考', note: '观察、学习与尚未定形的想法。' },
 ];
 return <div className="article-index">{groups.map(group => {
   const articles = pages.filter(page => page.slugs[0] === group.key);
   if (!articles.length) return null;
   return <section key={group.key} className="index-group"><header><span>{String(groups.indexOf(group) + 1).padStart(2, '0')}</span><h2>{group.name}</h2><p>{group.note}</p></header><div>{articles.map(page => <Link className="index-article" href={page.url} key={page.url}><span><small>{en ? 'FIELD NOTES' : page.slugs.includes('paper-reading') ? '论文阅读' : page.slugs.length === 2 && page.slugs[1] === 'camera-color' ? '连续教程 · 9 篇' : '笔记'}</small><strong>{page.data.title}</strong>{page.data.description && <p>{page.data.description}</p>}</span><span aria-hidden="true">↗</span></Link>)}</div></section>;
 })}</div>;
}
