import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: appName,
      url: '/',
    },
    links: [
      { text: '文章', url: '/docs', active: 'nested-url' },
      { text: '关于', url: '/#about', active: 'none' },
      { text: 'GitHub', url: `https://github.com/${gitConfig.user}/${gitConfig.repo}`, external: true },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
