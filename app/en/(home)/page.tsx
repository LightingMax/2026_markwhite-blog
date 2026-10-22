import Link from 'next/link';
import { OceanHero } from '@/components/ocean/hero';
import { ArticleIndex } from '@/components/article-index';
export default function Home() {
 return <main className="ocean-home"><OceanHero locale="en" /><div className="site-home home-reading" id="writing" tabIndex={-1}>
 <div className="reading-intro"><span>BELOW THE SURFACE</span><p>From seeing to understanding.</p></div>
 <section className="home-section"><div className="section-heading"><span className="section-index">01</span><h2>Writing</h2><Link href="/en/docs/" className="section-more">All articles ↗</Link></div><ArticleIndex locale="en" /></section>
 <section className="home-section about-section" id="about"><div className="section-heading"><span className="section-index">02</span><h2>About</h2></div><div className="about-layout"><p className="about-statement">A place for ideas<br />to take shape.</p><div className="about-detail"><p>I’m Mark. I write code, build robots, and try to explain things more clearly. These notes, images, and code are open source.</p><p>English editions appear here as they become available.</p></div></div></section>
 <footer className="home-footer"><span>© 2026 Mark White</span><span>Made for careful thinking.</span></footer></div></main>;
}
