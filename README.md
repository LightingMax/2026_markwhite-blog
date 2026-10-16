# Mark White 博客

[https://markwhite.cn/blog/](https://markwhite.cn/blog/) 的公开源代码和文章。站点使用 Next.js、Fumadocs 和 MDX 构建，生成静态文件后由 Nginx 提供服务。

## 内容结构

- `content/docs/thoughts`：个人思考
- `content/docs/engineering`：计算机技术
- `content/docs/computer-vision`：计算机视觉，包括相机与色彩系列
- `content/docs/paper-reading`：论文阅读，按计算机视觉、相机色彩、检测、分割、表示学习、机器人细分
- `content/docs/projects`：项目记录
- `public/assets`：文章图片和静态素材

文章使用 MDX frontmatter 保存 `date`、`tags`、`series`、`part`、`source` 等信息，目录由各级 `meta.json` 管理。

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

## 图片

小图和文章配图优先放在 `public/assets/`，在 MDX 中使用 `/blog/assets/example.png` 引用。这样素材与文章一起开源、版本化；大体积原图日后可以迁移到对象存储。

## 许可证

代码使用 MIT，文章和原创图片默认使用 CC BY-NC-SA 4.0，详见 [CONTENT-LICENSE.md](CONTENT-LICENSE.md)。
