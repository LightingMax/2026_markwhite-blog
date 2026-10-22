'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { OceanScene } from './scene';

export function OceanHero({ locale = 'zh' }: { locale?: 'zh' | 'en' }) {
  const en = locale === 'en';
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
    canvasRef.current?.dispatchEvent(new Event('oceanactivity'));
  }, [paused]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    let scene: OceanScene | null = null;
    let disposed = false;
    let inView = true;
    let raf = 0;
    let lastFrame = 0;
    let clock = 0;
    let progress = 0;
    let target = 0;
    let night = document.documentElement.classList.contains('dark') ? 1 : 0;
    let targetNight = night;
    let scale = 1;
    let frameCount = 0;
    let slowFrames = 0;
    let lastPaint = -1;
    let lastNight = -1;

    const syncProgress = (value: number) => {
      section.style.setProperty('--ocean-dive', value.toFixed(4));
      const submerged = String(value >= 0.625);
      if (section.dataset.submerged !== submerged) section.dataset.submerged = submerged;
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      scene?.resize(rect.width, rect.height, scale);
      lastPaint = -1;
    };
    const scroll = () => {
      const rect = section.getBoundingClientRect();
      const distance = section.offsetHeight - canvas.clientHeight;
      target = motion.matches ? 0 : Math.max(0, Math.min(1, (56 - rect.top) / Math.max(distance, 1)));
    };
    const frame = (now: number) => {
      raf = 0;
      if (disposed || !scene || !inView || document.hidden) return;
      const interval = compact ? 1000 / 30 : 1000 / 45;
      if (now - lastFrame < interval) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
      lastFrame = now;
      const still = motion.matches || pausedRef.current;
      if (!still) clock += elapsed;
      progress += (target - progress) * (still ? 1 : Math.min(elapsed * 7, 1));
      night += (targetNight - night) * (still ? 1 : Math.min(elapsed * 3, 1));
      const mustPaint = !still || Math.abs(lastPaint - progress) > 0.0001 || Math.abs(lastNight - night) > 0.001;
      if (mustPaint) {
        scene.render(clock + 12, progress, night);
        lastPaint = progress;
        lastNight = night;
        syncProgress(progress);
      }
      // Back off once on persistently slow hardware. Never increase resolution in a loop.
      if (!still && scale === 1) {
        frameCount++;
        if (elapsed > 0.055) slowFrames++;
        if (slowFrames > 24) { scale = 0.72; resize(); }
        if (frameCount >= 100) { frameCount = 0; slowFrames = 0; }
      }
      if (!still || Math.abs(progress - target) > 0.0001 || Math.abs(night - targetNight) > 0.001) {
        raf = requestAnimationFrame(frame);
      }
    };
    const wake = () => {
      if (!raf && !disposed && scene && inView && !document.hidden) {
        lastFrame = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const onScroll = () => { scroll(); wake(); };
    const onResize = () => { resize(); scroll(); wake(); };
    const onMotion = () => {
      section.dataset.reducedMotion = String(motion.matches);
      scroll();
      lastPaint = -1;
      wake();
    };
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else wake();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      section.dataset.rendered = 'false';
      syncProgress(0);
      scene?.dispose();
      scene = null;
    };
    const start = async () => {
      const { createOceanScene } = await import('./scene');
      if (disposed) return;
      scene = createOceanScene(canvas, compact);
      if (scene) {
        resize(); scroll();
        progress = target;
        lastPaint = progress;
        lastNight = night;
        syncProgress(progress);
        scene.render(clock + 12, progress, night);
        section.dataset.rendered = 'true';
        wake();
      } else {
        section.dataset.rendered = 'false';
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) wake();
      else { cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: '80px' });
    observer.observe(section);
    const theme = new MutationObserver(() => {
      targetNight = document.documentElement.classList.contains('dark') ? 1 : 0;
      wake();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const size = new ResizeObserver(onResize);
    size.observe(canvas);
    section.dataset.reducedMotion = String(motion.matches);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    canvas.addEventListener('oceanactivity', wake);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', start);
    void start().catch(() => { section.dataset.rendered = 'false'; });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect(); theme.disconnect(); size.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      canvas.removeEventListener('oceanactivity', wake);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', start);
      scene?.dispose();
    };
  }, []);

  return (
    <section className="ocean-cover" ref={sectionRef} data-paused={paused} aria-label={en ? 'Above and beneath the ocean' : '海面与水下封面'}>
      <div className="ocean-stage">
        <div className="ocean-fallback" aria-hidden="true" />
        <canvas className="ocean-canvas" ref={canvasRef} aria-hidden="true" />
        <div className="ocean-scrim" aria-hidden="true" />
        <div className="ocean-copy">
          <p className="ocean-kicker">MARK WHITE <span>/</span> NOTES ON SEEING &amp; BUILDING</p>
          <h1>{en ? 'Complex things,' : '把复杂的事，'}<br /><em>{en ? 'clearly told.' : '写清楚。'}</em></h1>
          <p className="ocean-lede">{en ? 'Keep looking beneath the surface.' : '在表象之下，继续探索。'}<br />{en ? 'On vision, technology, and ideas taking shape.' : '关于视觉、技术，和正在形成的想法。'}</p>
          <div className="ocean-links">
            <Link href={en ? "/en/docs/" : "/docs/"} className="ocean-read">{en ? "Explore the writing" : "阅读文章"} <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="ocean-submerged" aria-hidden="true"><span>BENEATH THE SURFACE</span><p>{en ? 'Let curiosity take you deeper.' : '好奇，向更深处。'}</p></div>
        <div className="ocean-caption">
          <a className="ocean-scroll" href="#writing"><span className="ocean-scroll-line" aria-hidden="true" /><span>{en ? 'Scroll into the writing' : '向下滚动，潜入文字'}</span></a>
          <button type="button" className="ocean-pause" aria-pressed={paused} onClick={() => setPaused(!paused)}>
            <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span> {paused ? (en ? 'Play waves' : '继续海浪') : (en ? 'Pause waves' : '暂停海浪')}
          </button>
        </div>
      </div>
    </section>
  );
}
