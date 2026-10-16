import Link from 'next/link';

const categories = [
  { title: '个人思考', eyebrow: 'THOUGHTS', description: '关于工作、学习、生活，以及那些还没有结论的问题。', href: '/docs/thoughts' },
  { title: '计算机技术', eyebrow: 'ENGINEERING', description: '软件工程、系统实践、工具选择与持续交付。', href: '/docs/engineering' },
  { title: '计算机视觉', eyebrow: 'COMPUTER VISION', description: '从图像处理到视觉系统，把理解写成可以复用的笔记。', href: '/docs/computer-vision' },
  { title: '论文阅读', eyebrow: 'PAPER READING', description: '按专题整理论文、实验和自己的批注。', href: '/docs/paper-reading' },
  { title: '项目记录', eyebrow: 'PROJECTS', description: '记录正在构建的项目、踩过的坑和最终留下的方案。', href: '/docs/projects' },
];

export default function HomePage() {
  return (
    <main className="site-home">
      <section className="home-hero">
        <p className="eyebrow">MARK WHITE · NOTES & BUILDS</p>
        <h1>把正在思考的事，<br /><em>写下来。</em></h1>
        <p className="home-intro">这里记录机器人、软件工程、计算机视觉和日常观察。文章会保持开放，代码与图片也会跟着一起成长。</p>
        <div className="home-actions">
          <Link className="primary-button" href="/docs">开始阅读 <span>↓</span></Link>
          <a className="text-link" href="https://github.com/LightingMax/2026_markwhite-blog">查看源代码 <span>↗</span></a>
        </div>
      </section>

      <section className="home-section" aria-labelledby="categories-title">
        <div className="section-label"><span>01</span><h2 id="categories-title">文章分类</h2></div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link className={`category-card ${index === 2 ? 'category-card-featured' : ''}`} href={category.href} key={category.title}>
              <span className="category-number">0{index + 1}</span>
              <span className="category-eyebrow">{category.eyebrow}</span>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <span className="category-arrow">阅读这一栏 <span>↗</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section series-section" aria-labelledby="series-title">
        <div className="section-label"><span>02</span><h2 id="series-title">正在写的系列</h2></div>
        <Link className="series-card" href="/docs/computer-vision/camera-color">
          <div>
            <p className="category-eyebrow">ICCV 2019 · CAMERA & COLOR</p>
            <h3>相机色彩：从光线到像素</h3>
            <p>一套从相机成像流水线出发的教学笔记，逐步理解传感器、RAW、白平衡、颜色空间，以及论文里经常被省略的工程细节。</p>
          </div>
          <span className="series-arrow">进入系列 <span>↗</span></span>
        </Link>
      </section>

      <section className="home-section about-section" id="about" aria-labelledby="about-title">
        <div className="section-label"><span>03</span><h2 id="about-title">关于这个空间</h2></div>
        <div className="about-grid">
          <p className="about-lead">我是 Mark，一名持续写代码、做机器人和探索新工具的人。</p>
          <div className="about-copy"><p>博客使用 Next.js、Fumadocs 和 MDX 构建，文章源代码与图片都放在公开仓库中。希望这里既是一个可以阅读的地方，也是一个可以继续参与的项目。</p><p className="muted">最后更新：2026 年 10 月</p></div>
        </div>
      </section>
    </main>
  );
}
