# 产品发布 Checklist（纯静态前端项目）

> 从零上线一个纯前端网站（HTML/CSS/JS）要做的所有事，按顺序执行。
> 复用自 PixelCut Studio（pixcutstudio.netlify.app）发布流程。

---

## 阶段 1：项目准备

- [ ] 项目根目录结构清晰：`index.html` / `style.css` / `app.js` / `assets/`
- [ ] 项目本地能跑（双击 index.html 或 `npm run dev`）
- [ ] 准备 README.md（介绍项目、用法、技术栈、License: MIT）
- [ ] 准备 .gitignore（忽略 dist/、node_modules/、.DS_Store 等）

---

## 阶段 2：GitHub 仓库

- [ ] 打开 https://github.com/new 创建仓库
  - 名字用 `kebab-case-name`（如 `pixelcut-studio`）
  - 选 **Public**
  - **不要**勾 README/.gitignore/license（本地已有）
- [ ] 本地初始化：

```bash
cd 项目根目录
git init
git branch -m main
git config user.email "你的邮箱"
git config user.name "你的名字"
```

- [ ] 首次推送：

```bash
git add -A
git commit -m "feat: 项目初始版本"
git remote add origin https://github.com/用户名/仓库名.git
git push -u origin main
```

- [ ] 如果 HTTPS 推送失败（Connection reset）：
  - 改用 SSH：生成 ed25519 key → 添加到 GitHub Settings → SSH keys → 切换 remote 为 `git@github.com:...`

---

## 阶段 3：基础部署（Netlify Drop）

> 优点：3 分钟上线、自动 HTTPS、CDN 全球加速
> 缺点：默认 URL 是 `xxx.netlify.app`，不能绑定自定义域名

- [ ] 准备 `dist/` 文件夹（纯静态文件 + assets）
- [ ] 打开 https://app.netlify.com/drop
- [ ] 拖入 `dist` 文件夹
- [ ] 等待 30 秒，得到 `xxx.netlify.app` 网址
- [ ] **改名**：Site settings → Change site name → 改成好记的名字
- [ ] **公开**：Site configuration → Project visibility → 改成 **Public**

### 或：Netlify 接 GitHub（推荐，一劳永逸）

- [ ] Netlify 后台 → Site configuration → Build & deploy → Continuous deployment
- [ ] Link repository → 选 GitHub → 授权 → 选你的仓库
- [ ] 配置：
  - Branch: `main`
  - Build command: 留空
  - **Publish directory: `.`**（仓库根目录已经是静态文件）
- [ ] Deploy
- [ ] 之后 `git push` 即可自动部署

---

## 阶段 4：SEO 基础（最重要，影响自然搜索流量）

- [ ] **`robots.txt`**（根目录）：

```
User-agent: *
Allow: /

Sitemap: https://你的域名/sitemap.xml
```

- [ ] **`sitemap.xml`**（根目录）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://你的域名/</loc>
    <lastmod>2026-XX-XX</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

- [ ] **`index.html` 头部补全 SEO meta**：

```html
<title>产品名 · 一句话卖点</title>
<meta name="description" content="中英文双语描述，150字以内" />
<meta name="keywords" content="关键词1, 关键词2, keyword1, keyword2" />
<link rel="canonical" href="https://你的域名/" />

<!-- Open Graph（社交分享卡片） -->
<meta property="og:type" content="website" />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:url" content="https://你的域名/" />
<meta property="og:image" content="https://你的域名/assets/og-cover.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://你的域名/assets/og-cover.png" />
```

- [ ] **OG 封面图** `assets/og-cover.png`（1200x630px，品牌名 + slogan + 视觉）
- [ ] **Favicon**（像素风/品牌色）

---

## 阶段 5：流量分析（看清来访用户）

### 🥇 Microsoft Clarity（强烈推荐，免费全套行为分析）

- [ ] 打开 https://clarity.microsoft.com/ 用微软账号登录
- [ ] Add new project → 得到追踪 ID
- [ ] 把脚本塞进 `index.html` 的 `<head>`：

```html
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "你的Clarity_ID");
</script>
```

- [ ] 提交 `git push` → 等 1-2 小时开始有数据
- [ ] 24-48 小时后看 **Recordings（录屏）**——最有价值

### 🥈 Netlify Observability（实时流量，免费够用）

- [ ] Netlify 后台 → Logs & metrics → Observability
- [ ] 实时看请求数、User agent、Status code
- [ ] 筛选 Browser 看真人访问，筛选 Crawler 看爬虫

---

## 阶段 6：Google 收录（让搜索能找到你）

- [ ] 打开 https://search.google.com/search-console/
- [ ] 添加资源 → 网址前缀 → 填 `https://你的域名/`
- [ ] 验证方式选 **HTML 标签**（最简单）
- [ ] 把得到的 meta 标签发给 AI 助手加到 `index.html`：

```html
<meta name="google-site-verification" content="xxxxx" />
```

- [ ] 推送代码 → 等部署 → 点 **验证** 按钮
- [ ] 验证通过后：左边菜单 → Sitemap → 提交 `sitemap.xml`
- [ ] （可选）网址检查 → 请求编入索引（每天限 10-12 次）

---

## 阶段 7：传播产品自带的分享力

- [ ] **下载水印**（自动引流）：下载图片右下角加半透明品牌名 + 网址
- [ ] **一键分享按钮**：点击复制预设文案 + 网址到剪贴板
- [ ] **预设分享文案**（中英双语各一段）：

```
中文：我用 [产品名] 把照片变成了 [核心特色]🎨 免费、隐私安全、3 秒出图👉 https://你的域名/

English: Turned my photo into [特色] with [产品名] 🎨 Free, private, 3 seconds👉 https://你的域名/
```

---

## 阶段 8：上线后第一周运营

- [ ] 每天回 Netlify Observability 看 1 次（5 分钟）
- [ ] 1-2 天后去 Clarity 看首次录屏
- [ ] 3-7 天后去 Google Search Console 看收录情况
- [ ] 至少发 3 个外链（V2EX / 掘金 / 知乎 / 小红书）
- [ ] 关注 Netlify → 100% errors 时立即修

---

## 阶段 9：（可选）自定义域名

- [ ] 买域名（推荐 Namecheap / 阿里云，.cc/.app/.io 都行）
- [ ] Netlify 后台 → Domain settings → Add custom domain
- [ ] 去域名商后台按 Netlify 提示加 DNS 记录（A + CNAME）
- [ ] 等待 DNS 生效（几分钟到 24 小时）
- [ ] Netlify 自动签发 HTTPS 证书
- [ ] 把 `index.html` 里所有写死的域名替换为新域名
  - canonical URL
  - og:url
  - og:image
  - twitter:image
  - 水印 SITE URL
  - 分享按钮里的 URL

---

## 阶段 10：内容沉淀与版本管理

- [ ] GitHub Issues 处理用户反馈
- [ ] 每次功能改动写 commit message（中文也行）
- [ ] 重要里程碑在 README 加更新日志（Changelog）
- [ ] 给仓库加 topics 标签（在 GitHub 仓库页右侧）：`pixel-art` `canvas` `frontend` 等

---

## 完整工作流（一行命令日常更新）

```bash
git add -A
git commit -m "describe your change"
git push
```

→ Netlify + GitHub Pages 自动部署  
→ Clarity 继续记录数据  
→ Google 爬虫通过 sitemap 重新抓取

---

## 关键工具清单

| 工具 | 用途 | 地址 |
|------|------|------|
| Netlify | 静态托管 + 自动部署 | app.netlify.com |
| GitHub | 代码托管 + 备用 Pages | github.com |
| Microsoft Clarity | 用户行为分析 | clarity.microsoft.com |
| Google Search Console | SEO 收录 | search.google.com/search-console |
| CloudStudio | WorkBuddy 一键部署（备用） | - |
| Google Analytics | 流量统计（可选） | analytics.google.com |

---

## 注意事项

1. **别把 `dist/` 推到 GitHub**（除非用 Netlify Build）
2. **永远保留 Google 验证 meta 标签**（删了 Search Console 会失效）
3. **OG 标签里的 URL 必须用最终域名**（否则分享卡片图片不显示）
4. **Clarity 录屏需 24-48 小时才出现**（别急）
5. **iOS 微信分享的卡片**有时缓存旧数据 → 改完用微信「重新进入」清缓存

---

## PixelCut Studio 实战数据（2026-08-24 ~ 25）

| 阶段 | 时间 | 关键节点 |
|------|------|---------|
| 项目完成 | 8/24 下午 | 6 种风格 + 双语 + 中位切分算法 |
| 部署 | 8/24 下午 | Netlify Drop → pixcutstudio.netlify.app |
| SEO | 8/24 晚上 | OG/robots/sitemap + Clarity |
| GitHub | 8/25 上午 | 仓库 DaBowen-Jun/pixelcut-studio + Pages |
| Netlify 自动化 | 8/25 上午 | 接 GitHub，git push 触发自动部署 |
| Google 收录 | 8/25 上午 | Search Console 验证 + 提交 sitemap |
| 流量爆发 | 8/25 10:55 | 1h 72 请求，Google 爬虫上线 |

**结论**：从零到「Google 爬虫来爬」用了 24 小时。PixelCut Studio 是这套流程的成功案例。
