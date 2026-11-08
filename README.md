# PanfengHong's Personal Homepage

个人主页站点，基于 GitHub Pages 部署，展示个人简介、笔记与项目。

在线访问：[https://panfenghong.github.io](https://panfenghong.github.io)

## 项目介绍

纯静态单页站点，无需框架运行时，页面由以下几个板块组成：

| 板块 | 说明 |
| --- | --- |
| 个人简介 | Carbon 风格代码窗口 + 技术栈标签 + 社交链接 |
| 笔记 | 实用工具库、LeetCode 算法笔记等卡片入口 |
| 项目 | 数字孪生（Three.js 3D 可视化）等项目展示 |
| 数据统计 | 代码量、用户数等数据卡片 |

站点特性：

- 深色 GitHub 风格主题，移动端响应式适配（导航折叠、栅格布局）
- 图标全部使用内联 SVG，无第三方图标库依赖
- 图片统一转为 WebP 格式并压缩，整体资源体积 < 250KB

## 技术栈

- **HTML5**：单页结构，语义化标签
- **CSS**：
  - [Tailwind CSS v3](https://tailwindcss.com/)（JIT 按需生成工具类，产物为 `tailwind.min.css`）
  - `assets/css/style.css`：自定义样式（代码窗口、引用卡片等）
- **JavaScript**：原生 ES Module，无任何运行时依赖（事件委托处理占位卡片提示）
- **构建工具**：Node.js + npm（仅用于构建 CSS，无打包器）

## 项目结构

```text
├── index.html              # 主页面
├── tailwind.config.js      # Tailwind 配置（含 gh-* GitHub Dark 色板）
├── tailwind.min.css        # Tailwind 构建产物
├── src/tailwind.css        # Tailwind 入口源文件
├── postcss.config.js       # PostCSS 配置（tailwindcss + autoprefixer）
├── assets/
│   ├── css/style.css       # 自定义样式
│   └── images/             # WebP 格式图片资源
└── package.json
```

## 如何运行

### 本地开发

1. 克隆仓库：

   ```bash
   git clone https://github.com/PanfengHong/panfenghong.github.io.git
   cd panfenghong.github.io
   ```

2. 安装依赖（Node.js >= 16）：

   ```bash
   npm install
   ```

3. 启动监听模式（修改类名后自动重建 `tailwind.min.css`）：

   ```bash
   npm run watch
   ```

4. 直接用浏览器打开 `index.html`，或启动任意静态服务器（如 VS Code 的 Live Server）预览。

### 构建与部署

```bash
# 重新生成 tailwind.min.css（一次性构建）
npm run build
```

站点托管在 GitHub Pages，推送到 `main` 分支后自动生效。注意：`tailwind.min.css` 是构建产物，修改 HTML 中的 Tailwind 类名后需要重新执行 `npm run build` 并一并提交。

## 维护指南

- **新增页面内容**：直接编辑 `index.html`；若引入了新的 Tailwind 工具类，需重新构建
- **新增自定义样式**：优先写入 `src/tailwind.css`（配合 `@apply`）或 `assets/css/style.css`
- **新增图片**：建议使用 WebP 格式（可借助 Pillow/ImageMagick 压缩），并在 `<img>` 上标注 `width/height` 防止布局偏移
- **新增图标**：直接内联 SVG（`fill="currentColor"` + Tailwind 尺寸类），不引入图标字体

## License

MIT
