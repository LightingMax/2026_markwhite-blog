/* eslint-disable @next/next/no-img-element */
const root = '/blog/assets/video-understanding';

export function RGBChannelDiagram() {
  return (
    <figure className="rgb-tree">
      <div className="rgb-tree-head"><strong>一张 RGB 图像 = 三张二维数值矩阵</strong><span>同一场景，同一组空间坐标</span></div>
      <div className="rgb-tree-grid">
        <div className="rgb-tree-original"><img src={`${root}/frame-4.webp`} alt="NASA 宇航员照片，作为 RGB 输入" width="224" height="224" /><b>RGB 原图</b><span>3 × 224 × 224</span></div>
        {['R', 'G', 'B'].map((name, index) => <div className={`rgb-tree-branch rgb-tree-${name.toLowerCase()}`} key={name}>
          <span className="rgb-tree-connector" aria-hidden="true">↳</span>
          <div><img src={`${root}/rgb-${name.toLowerCase()}.webp`} alt={`只点亮 ${name} 分量的显示效果`} width="224" height="224" /><b>{name} · {['红', '绿', '蓝'][index]}分量</b></div>
          <span className="rgb-tree-equals" aria-hidden="true">→</span>
          <div><img src={`${root}/gray-${name.toLowerCase()}.webp`} alt={`${name} 通道的数值以灰度显示`} width="224" height="224" /><b>同一通道的灰度显示</b><span>1 × 224 × 224</span></div>
        </div>)}
      </div>
      <figcaption>每一行中，左图和右图使用完全相同的通道数值，只是显示方法不同。亮处代表这个分量数值大，暗处代表数值小；单个通道本身不带“红色”或“绿色”。照片：NASA / scikit-image，公有领域。图示为本文重新生成。</figcaption>
    </figure>
  );
}
