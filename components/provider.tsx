'use client';
import SearchDialog from '@/components/search';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

const labels: Record<string, string> = {
  Search: '搜索文章', 'Open Search': '搜索文章', 'Close Search': '关闭搜索',
  'No results found': '没有找到文章', 'Search failed': '搜索失败',
  'On this page': '本页目录', 'No Headings': '暂无小节', 'Last updated on': '更新于',
  'Previous Page': '上一篇', 'Next Page': '下一篇', 'Choose a language': '语言',
  Language: '语言', 'Toggle Theme': '切换主题', Light: '白天', Dark: '黑夜', System: '跟随系统',
  'Collapse Sidebar': '收起目录', 'Open Sidebar': '展开目录', 'Close Sidebar': '关闭目录',
  'Show Sidebar': '展开目录', 'Hide Sidebar': '收起目录', 'Toggle Menu': '展开菜单',
  'Copy Markdown': '复制文章', 'Copied Markdown': '已复制', Open: '更多',
  'View as Markdown': '查看 Markdown', 'Open in GitHub': '在 GitHub 查看',
  'Copy Anchor Link': '复制小节链接', 'Copied Anchor Link': '已复制链接',
  'Copy Text': '复制代码', 'Copied Text': '已复制代码', 'Edit on GitHub': '在 GitHub 编辑',
};
const chineseUI = Object.fromEntries(uiTranslations().keys.flatMap(key => {
  const value = labels[key.split('(')[0]];
  return value ? [[key, value]] : [];
}));

export function Provider({ children, locale = 'zh', translations }: { children: ReactNode; locale?: Locale; translations: Record<string, Record<string, string>> }) {
  const pathname = usePathname().replace(/^\/blog(?=\/|$)/, '').replace(/\/$/, '') || '/';
  const router = useRouter();
  return (
    <RootProvider
      i18n={{ locale, defaultLanguage: 'zh', hideLocale: 'default-locale', locales: [{ name: '中文', locale: 'zh' }, { name: 'English', locale: 'en' }],
        translations: locale === 'zh' ? chineseUI : {},
        onLocaleChange: (lang) => {
          const equivalent = translations[pathname]?.[lang];
          const isHome = pathname === '/' || pathname === '/en';
          router.push(equivalent || (isHome ? (lang === 'en' ? '/en/' : '/') : `${lang === 'en' ? '/en' : ''}/docs/?translation=unavailable`));
        },
      }}
      search={{ SearchDialog }}
      theme={{ attribute: 'class', defaultTheme: 'system', enableSystem: true, disableTransitionOnChange: true }}
    >
      {children}
    </RootProvider>
  );
}
