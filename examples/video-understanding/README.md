# TSM：真实卷积特征可视化

运行 `uv run examples/video-understanding/generate_features.py` 重新生成资源。
脚本在头部声明 Python 及依赖版本；首次运行会下载 Torchvision 官方 ImageNet ResNet18 权重。

- 输入：scikit-image 发布的 NASA 宇航员 Eileen Collins 公有领域照片。
  原图：https://github.com/scikit-image/scikit-image/blob/v0.19.3/skimage/data/astronaut.png
  来源及许可：https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.astronaut
- 8 帧由同一原图平移裁剪生成，模拟相机平移，并非录制视频。
- 每帧经过 ImageNet 预训练 ResNet18 的 `conv1 -> bn1 -> relu`，在 maxpool 之前取出 `[64, 112, 112]` 特征。
- 64 个通道全部导出为无损 WebP。每个通道以 8 帧中的共同最大激活归一化显示，避免逐帧拉伸亮度引入误导；统一使用平方根显示变换增亮弱响应，不更改用于位移检验的原始浮点矩阵。
- 网页仅选择相应来源帧的同一通道图像：C0–C7 来自下一帧，C8–C15 来自上一帧，其余保持本帧；越界为全零。
- Python 脚本在原始浮点张量上验证整张矩阵搬运与边界零填充。
- 这是对 TSM 操作的可复现实验；没有使用训练好的 TSM checkpoint，也没有宣称该示例能够识别动作。

RGB 树形图复用同一张照片，分别输出彩色分量显示和灰度数值显示，不转载 Medium 配图。
