'use client';

import { useState } from 'react';

export function TemporalShiftDemo() {
  const [frame, setFrame] = useState(4);
  const channels = 'ABCDEFGH'.split('');
  return (
    <div className="tsm-demo" aria-label="时间位移交互实验">
      <div className="tsm-demo-header"><div><strong>交互实验</strong><span>拖动滑块，观察当前帧的通道来源</span></div><b>Frame {frame} / 8</b></div>
      <label htmlFor="tsm-frame">选择当前帧</label>
      <input id="tsm-frame" type="range" min="1" max="8" value={frame} onChange={e => setFrame(Number(e.target.value))} />
      <div className="tsm-range"><span>1</span><span>8</span></div>
      <p>位移前 · 当前帧</p>
      <div className="tsm-channels">{channels.map(c => <div className="tsm-channel" key={c}><b>{c}<sub>{frame}</sub></b><small>本帧</small></div>)}</div>
      <div className="tsm-arrow">↓ Temporal Shift</div>
      <p>位移后 · 当前帧</p>
      <div className="tsm-channels">{channels.map((c, i) => {
        const source = i === 0 ? frame + 1 : i === 1 ? frame - 1 : frame;
        const missing = source < 1 || source > 8;
        return <div className={`tsm-channel ${i === 0 ? 'tsm-future' : i === 1 ? 'tsm-past' : ''}`} key={c}><b>{missing ? '0' : <>{c}<sub>{source}</sub></>}</b><small>{missing ? '零填充' : i === 0 ? '后一帧' : i === 1 ? '前一帧' : '本帧'}</small></div>;
      })}</div>
      <div className="tsm-note">每个方块代表一整张 H × W 特征图；颜色表示来源，不表示像素颜色。</div>
    </div>
  );
}
