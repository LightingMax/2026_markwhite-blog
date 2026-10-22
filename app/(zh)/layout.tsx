import { Provider } from '@/components/provider';
import '../global.css';
import { translationLinks } from '@/lib/navigation';

export const metadata = {
  metadataBase: new URL('https://markwhite.cn/blog/'),
  title: 'Mark White — Notes on Seeing & Building',
  description: '记录相机与色彩、计算机视觉、工程实践，以及正在形成的想法。',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider translations={translationLinks()}>{children}</Provider>
      </body>
    </html>
  );
}
