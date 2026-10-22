import { source } from './source';
import type { Root, Node } from 'fumadocs-core/page-tree';
import type { Locale } from './i18n';

export function articleTree(locale: Locale): Root {
  const labels = new Map(source.getPages(locale).map(page => [page.url, page.data.navTitle]));
  function compact(node: Node): Node {
    if (node.type === 'page') return { ...node, name: labels.get(node.url) || node.name };
    if (node.type === 'folder') return { ...node, children: node.children.map(compact) };
    return node;
  }
  const tree = source.getPageTree(locale);
  return { ...tree, children: tree.children.map(compact) };
}

export function translationLinks() {
  const result: Record<string, Record<string, string>> = {};
  for (const locale of ['zh', 'en'] as const) {
    for (const page of source.getPages(locale)) {
      result[page.url.replace(/\/$/, '')] = Object.fromEntries(
        (['zh', 'en'] as const).flatMap(lang => {
          const translated = source.getPage(page.slugs, lang);
          return translated ? [[lang, translated.url]] : [];
        }),
      );
    }
  }
  return result;
}
