import { Provider } from '@/components/provider';
import { translationLinks } from '@/lib/navigation';
import '../global.css';
export const metadata = { metadataBase: new URL('https://markwhite.cn/blog/'), title: 'Mark White — Notes on Seeing & Building', description: 'Notes on computer vision, technology, and building things.' };
export default function Layout({ children }: { children: React.ReactNode }) {
 return <html lang="en" suppressHydrationWarning><body className="flex flex-col min-h-screen"><Provider locale="en" translations={translationLinks()}>{children}</Provider></body></html>;
}
