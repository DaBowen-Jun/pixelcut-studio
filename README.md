# PixelCut Studio

> 把照片变成 8-bit 像素艺术 | Turn photos into 8-bit pixel art

纯前端、零依赖、零成本。上传照片 → 浏览器本地生成像素卡通头像。所有处理在 Canvas 完成，不调用任何 API、不上传服务器。

**👉 在线体验：[pixcutstudio.netlify.app](https://pixcutstudio.netlify.app/)**

---

## 6 种风格

| 风格 | 效果 |
|------|------|
| 🌈 霓虹肖像 | 高饱和分块，赛博潮味 |
| 🎨 波普艺术 | 扁平色块，海报感 |
| 🤖 赛博朋克 | 冷色霓虹 + CRT 扫描线 |
| 🖌 水墨素描 | 纸墨分层，东方韵味 |
| 📷 复古胶片 | 怀旧 sepia 棕调 |
| 🌡 热成像 | 红外渐变，科技感 |

## 功能

- 🌐 中英文一键切换
- 🖼️ 拖拽/点击上传，实时预览
- 🔍 原图 vs 像素图并排对比
- 🎚️ 像素密度、放大倍数、色彩数、饱和度、对比度、轮廓线
- ⬇️ 下载 PNG / JPEG / WEBP
- 🔒 全程本地处理，照片不上传
- 💧 下载自动加半透明水印（品牌 + 网址）
- 🔗 一键复制分享文案

## 快速开始

```bash
# 直接双击 index.html 即可使用（无需服务器）

# 或用本地服务器：
npm run dev
# 打开 http://localhost:5173
```

## 部署

纯静态站点，随便扔哪都行：

- **Netlify**：拖 `dist/` 文件夹到 [app.netlify.com/drop](https://app.netlify.com/drop)
- **GitHub Pages**：push 后在 Settings → Pages → Source 选 main
- **Vercel / Cloudflare Pages**：连 Git 仓库，Build Command 留空

## 技术细节

1. **降采样** → 按像素密度缩到 64×64 / 96×96
2. **风格处理** → HSL 增强 + 亮度分层换色板 / sepia / 水墨 / 热成像渐变
3. **边缘描线** → 亮度差阈值检测色块边界
4. **无平滑放大** → `imageSmoothingEnabled=false` 保持锐利像素
5. **水印叠加** → 下载前 Canvas 绘制半透明品牌文字

## 文件结构

```
index.html          页面结构 + SEO meta + Open Graph
style.css           现代设计系统（玻璃拟态 / 渐变 / 响应式）
app.js              Canvas 像素化算法 + i18n + 水印 + 分享
assets/examples/    6 张风格展示图
assets/og-cover.svg 社交分享封面图
```

## License

MIT
