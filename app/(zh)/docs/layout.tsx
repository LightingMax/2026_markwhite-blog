import { articleTree } from '@/lib/navigation';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={articleTree('zh')} tabs={false} sidebar={{ defaultOpenLevel: 0 }} {...baseOptions()} links={[]}>
      {children}
    </DocsLayout>
  );
}
