# Mark White 博客

[https://markwhite.cn/blog/](https://markwhite.cn/blog/) 的公开源代码、文章和实验素材。视觉基调保持克制：一个文章入口，主题在侧栏中展开，支持跟随浏览器的浅色/深色模式。

## 内容结构

- `content/docs/computer-vision/camera-color`：颜色与相机成像专题（9 篇）
- `content/docs/computer-vision/paper-reading`：计算机视觉下的论文阅读
- `content/docs/engineering`：工程与工具
- `content/docs/thoughts`：个人思考
- `content/docs/projects`：项目记录
- `public/assets/camera-color`：相机色彩专题配图
- `examples/camera-color`：配套 Python 实验

文章使用 MDX frontmatter 保存 `date`、`tags`、`series`、`part`、`source` 等信息。目录由各级 `meta.json` 管理，暂时只保留一套“文章”入口；内容增加后再拆分。

## 本地开发

```bash
npm install
npm run dev
```

打开 <http://localhost:3000/blog/>。生产构建：

```bash
npm run types:check
npm run build
```

构建结果在 `out/`，部署时将其内容同步到服务器 `/var/www/blog/`。

## 许可证与来源

代码使用 MIT，原创文章和原创图片默认使用 CC BY-NC-SA 4.0，详见 [CONTENT-LICENSE.md](CONTENT-LICENSE.md)。相机色彩专题中标注为 `source` 的讲义图片仅用于教学上下文，并在素材目录中单独说明来源。
