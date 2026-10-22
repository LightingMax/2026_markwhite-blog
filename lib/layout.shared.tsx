import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { Locale } from './i18n';
import { appName, gitConfig } from './shared';

export function baseOptions(locale: Locale = 'zh'): BaseLayoutProps {
  const prefix = locale === 'en' ? '/en' : '';
  return {
    i18n: true,
    nav: { title: appName, url: `${prefix}/` },
    links: [
      { text: locale === 'en' ? 'Articles' : '文章', url: `${prefix}/docs`, active: 'nested-url' },
      { text: locale === 'en' ? 'About' : '关于', url: `${prefix}/#about`, active: 'none' },
    ],
    themeSwitch: { enabled: true },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
