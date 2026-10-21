import Link from 'next/link';
import { OceanHero } from '@/components/ocean/hero';

const entries = [
  {
    section: '计算机视觉 / 数据标注',
    title: '用 CVAT 标注视频轨迹与动作阶段',
    description: '从数据组织到 Outside 轨迹恢复，把器械跟踪和帧级 Tag 的使用方法讲清楚。',
    meta: '中文 · 2026.10.21',
    href: '/docs/computer-vision/cvat-video-annotation-zh/',
  },
  {
    section: 'COMPUTER VISION / ANNOTATION',
    title: 'Video Tracking and Action Phases with CVAT',
    description: 'A practical guide to keyframes, track identities, Outside states, and phase tags.',
    meta: 'English · 2026.10.21',
    href: '/docs/computer-vision/cvat-video-annotation-en/',
  },
  {
    section: '计算机视觉 / 相机与色彩',
    title: '颜色与相机成像',
    description: '从光谱、传感器和 RAW 开始，一直走到 ISP、照片风格与计算机视觉。',
    meta: '9 篇 · ICCV 2019 tutorial',
    href: '/docs/computer-vision/camera-color/',
  },
  {
    section: '计算机视觉 / 论文阅读',
    title: '相机与色彩论文',
    description: '把教程里的成像问题放回论文、数据集和实验协议。',
    meta: '阅读索引',
    href: '/docs/computer-vision/paper-reading/camera-color/',
  },
  {
    section: '项目记录',
    title: '一块能长期维护的写作系统',
    description: '记录这个博客的内容结构、素材管理和发布路径。',
    meta: '项目记录 · 01',
    href: '/docs/projects/writing-system/',
  },
];

export default function HomePage() {
  return (
    <main className="ocean-home">
      <OceanHero />
      <div className="site-home home-reading" id="writing" tabIndex={-1}>
        <div className="reading-intro"><span>BELOW THE SURFACE</span><p>把看见的，变成理解的。</p></div>

      <section className="home-section" aria-labelledby="featured-heading">
        <div className="section-heading">
          <span className="section-index">01</span>
          <h2 id="featured-heading">正在写</h2>
        </div>
        <Link className="featured-series" href="/docs/computer-vision/camera-color/">
          <div className="featured-series-copy">
            <p className="home-overline">FEATURED SERIES / 颜色与相机成像</p>
            <h3>一张照片，经过了什么？</h3>
            <p>从光谱与 CIE 颜色科学，到 RAW、白平衡、色调映射和学习式 ISP。九篇文章，逐步拆开相机如何把光变成颜色。</p>
          </div>
          <div className="featured-series-meta"><span>阅读系列</span><strong>↗</strong></div>
        </Link>
      </section>

      <section className="home-section" aria-labelledby="entries-heading">
        <div className="section-heading">
          <span className="section-index">02</span>
          <h2 id="entries-heading">文章</h2>
          <Link href="/docs/" className="section-more">查看全部 <span>↗</span></Link>
        </div>
        <div className="entry-list">
          {entries.map((entry) => (
            <Link className="entry-row" href={entry.href} key={entry.title}>
              <span className="entry-section">{entry.section}</span>
              <span className="entry-main"><strong>{entry.title}</strong><small>{entry.description}</small></span>
              <span className="entry-meta">{entry.meta}<b>↗</b></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section about-section" id="about" aria-labelledby="about-heading">
        <div className="section-heading">
          <span className="section-index">03</span>
          <h2 id="about-heading">关于</h2>
        </div>
        <div className="about-layout">
          <p className="about-statement">这里先保持简单。<br />内容变多以后，再让目录变复杂。</p>
          <div className="about-detail"><p>我是 Mark，持续写代码、做机器人，也在学习如何把一个问题讲得更准确。这个博客的文章、图片和代码都公开，方便回看，也方便继续修改。</p><p className="about-note">更新于 2026 年 10 月 · <a href="https://github.com/LightingMax/2026_markwhite-blog">GitHub ↗</a></p></div>
        </div>
      </section>
      <footer className="home-footer"><span>© 2026 Mark White</span><span>Made for careful thinking.</span></footer>
      </div>
    </main>
  );
}
