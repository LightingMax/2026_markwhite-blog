import { articleTree } from '@/lib/navigation';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
export default function Layout({ children }: { children: React.ReactNode }) {
 return <DocsLayout tree={articleTree('en')} tabs={false} sidebar={{ defaultOpenLevel: 0 }} {...baseOptions('en')} links={[]}>{children}</DocsLayout>;
}
