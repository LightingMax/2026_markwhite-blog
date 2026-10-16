import { Provider } from '@/components/provider';
import './global.css';

export const metadata = {
  metadataBase: new URL('https://markwhite.cn/blog/'),
  title: 'Mark White · 个人博客',
  description: '记录个人思考、计算机技术、计算机视觉、论文阅读与项目实践。',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
