'use client';
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';

const root = '/blog/assets/video-understanding';
const representatives = [0, 8, 16, 24, 32, 40, 48, 56];
const valid = (t: number) => t >= 1 && t <= 8;
const feature = (t: number, c: number) => `${root}/${valid(t) ? `f${t}-c${c}` : 'zero'}.webp`;
const origin = (t: number, c: number) => c < 8 ? t + 1 : c < 16 ? t - 1 : t;
const group = (c: number) => c < 8 ? '后一帧 → 当前帧（C0–C7）' : c < 16 ? '前一帧 → 当前帧（C8–C15）' : '保持当前帧（C16–C63）';

export function TemporalShiftDemo() {
  const [frame, setFrame] = useState(4);
  const [channel, setChannel] = useState(0);
  const [shifted, setShifted] = useState(false);
  const [moving, setMoving] = useState(false);
  const sourceRefs = useRef<(HTMLImageElement | null)[]>([]);
  const targetRef = useRef<HTMLImageElement>(null);
  const source = origin(frame, channel);

  async function runShift() {
    if (moving) return;
    setMoving(true);
    const start = sourceRefs.current[source < frame ? 0 : source > frame ? 2 : 1];
    const target = targetRef.current;
    if (start && target && source !== frame && valid(source) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Move the actual source bitmap as one rectangle, without cropping or warping.
      const from = start.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const flying = document.createElement('img');
      flying.src = start.src;
      flying.alt = '';
      flying.setAttribute('aria-hidden', 'true');
      Object.assign(flying.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, zIndex: '100', pointerEvents: 'none', border: '3px solid #d38b44', borderRadius: '4px', boxSizing: 'border-box' });
      document.body.append(flying);
      try {
        await flying.animate([
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`, opacity: 1 },
        ], { duration: 1100, easing: 'ease-in-out', fill: 'forwards' }).finished;
      } finally { flying.remove(); }
    }
    setShifted(true);
    setMoving(false);
  }

  return (
    <section className="tsm-demo" aria-label="真实卷积特征图时间位移实验">
      <div className="tsm-demo-header"><div><strong>搬动一整张真实特征图</strong><span>原始帧 → 卷积响应 → 时间位移</span></div><b>Frame {frame} / 8</b></div>
      <label htmlFor="tsm-frame">① 选择接收特征的当前帧</label>
      <input id="tsm-frame" type="range" min="1" max="8" value={frame} disabled={moving} onChange={e => { setFrame(Number(e.target.value)); setShifted(false); }} />
      <div className="tsm-range"><span>1 · 看零填充</span><span>8 · 看零填充</span></div>
      <label htmlFor="tsm-channel">② 选择一个通道 · 共 64 张特征图</label>
      <select id="tsm-channel" value={channel} disabled={moving} onChange={e => { setChannel(Number(e.target.value)); setShifted(false); }}>
        {Array.from({ length: 64 }, (_, c) => <option value={c} key={c}>C{c} · {c < 8 ? '从后一帧移入' : c < 16 ? '从前一帧移入' : '留在本帧'}</option>)}
      </select>
      <div className="tsm-sources">{[frame - 1, frame, frame + 1].map((t, index) => <div className={`tsm-source ${t === source ? 'tsm-source-active' : ''}`} key={index}>
        <b>{['前一帧', '当前帧', '后一帧'][index]} · {valid(t) ? `F${t}` : '不存在'}</b>
        {valid(t) ? <img src={`${root}/frame-${t}.webp`} alt={`第 ${t} 帧 RGB 输入`} width="224" height="224" /> : <div className="tsm-no-frame">无输入帧</div>}
        <span className="tsm-convolution">↓ 同一组卷积权重</span>
        <img className="tsm-feature" ref={el => { sourceRefs.current[index] = el; }} src={feature(t, channel)} alt={valid(t) ? `第 ${t} 帧 C${channel} 的完整 112 × 112 特征图` : '缺失帧用全零矩阵表示'} width="112" height="112" />
        <small>{valid(t) ? `F${t} · C${channel}` : '全零矩阵'} · 112 × 112</small>
      </div>)}</div>
      <div className="tsm-transfer-controls"><button type="button" disabled={moving} onClick={runShift}>{moving ? '整张特征图正在迁移…' : channel >= 16 ? '③ 查看：保持本帧不变' : shifted ? '③ 再播放一次迁移' : '③ 执行整张特征图迁移'}</button><button type="button" disabled={moving || !shifted} onClick={() => setShifted(false)}>还原</button></div>
      <div className="tsm-result">
        <img ref={targetRef} src={feature(shifted ? source : frame, channel)} alt={`位移${shifted ? '后' : '前'}当前帧 C${channel} 的特征图`} width="112" height="112" />
        <div><strong>当前帧 F{frame} · C{channel}</strong><p aria-live="polite">{shifted ? valid(source) ? `现在来自 F${source}，整张 112 × 112 矩阵${source === frame ? '保持原样' : '已移入'}。` : '邻帧不存在，整张 112 × 112 矩阵填零。' : `位移前：仍是 F${frame} 自己的特征图。`}</p><small>{group(channel)}<br />位移后：F′[{frame}, {channel}, :, :] = {valid(source) ? `F[${source}, ${channel}, :, :]` : '0'}</small></div>
      </div>
      <details className="tsm-all-channels"><summary>展开：当前帧 64 个通道的缩略图（点击放大查看）</summary><div className="tsm-feature-grid">{Array.from({ length: 64 }, (_, c) => <button type="button" key={c} disabled={moving} aria-pressed={channel === c} onClick={() => { setChannel(c); }}><img src={feature(shifted ? origin(frame, c) : frame, c)} alt={`当前帧通道 C${c}`} width="112" height="112" loading="lazy" /><span>C{c}</span></button>)}</div></details>
      <p className="tsm-overview-title">{shifted ? '位移后' : '位移前'}：八组通道，各展示一张</p>
      <div className="tsm-channels">{representatives.map(c => {
        const t = shifted ? origin(frame, c) : frame;
        return <button type="button" className={`tsm-channel ${c < 8 ? 'tsm-future' : c < 16 ? 'tsm-past' : ''}`} key={c} aria-pressed={channel === c} disabled={moving} onClick={() => { setChannel(c); }}><img src={feature(t, c)} alt={`C${c} 的完整特征图`} width="112" height="112" /><b>C{c}</b><small>{valid(t) ? `来自 F${t}` : '全零'}</small></button>;
      })}</div>
      <div className="tsm-note">真实计算：ImageNet 预训练 ResNet18 的 conv1 → BN → ReLU 输出，形状为 8 × 64 × 112 × 112。输入是同一 NASA 照片裁剪得到的 8 帧模拟平移序列；这里演示 TSM 的搬运操作，不是训练后的 TSM 模型结果。灰度仅用于显示，越亮表示激活越大；同一通道的 8 帧共用一个显示尺度，并统一做平方根增亮以看清弱响应，原始特征矩阵不因此改变。</div>
    </section>
  );
}
