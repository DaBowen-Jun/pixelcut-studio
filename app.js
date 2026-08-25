// 像素卡通生成器 —— 纯 Canvas 实现，无任何外部依赖
// 流程：降采样 → 中位切分量化 → 边缘描线（可选）→ 无平滑放大

const $ = (id) => document.getElementById(id);

const dropZone = $('dropZone');
const fileInput = $('fileInput');
const controls = $('controls');
const resultSection = $('result');
const srcCanvas = $('srcCanvas');
const outCanvas = $('outCanvas');
const generateBtn = $('generateBtn');
const downloadBtn = $('downloadBtn');
const resetBtn = $('resetBtn');
const densitySel = $('density');
const scaleSlider = $('scale');
const colorsSlider = $('colors');
const outlineChk = $('outline');
const styleSel = $('style');
const satSlider = $('saturation');
const conSlider = $('contrast');
const scaleVal = $('scaleVal');
const colorsVal = $('colorsVal');
const satVal = $('satVal');
const conVal = $('conVal');
const statusEl = $('status');
const formatSel = $('format');

let sourceImage = null;

// ---------- Fiverr 联盟营销（审核通过后替换 PLACEHOLDER_ID 为真实 a_id） ----------
const FIVERR_AFFILIATE_ID = 'YOUR_FIVERR_ID';  // ← 审核通过后用 sed 替换即可
const FIVERR_AFF_ENABLED = FIVERR_AFFILIATE_ID !== 'YOUR_FIVERR_ID';

// 根据用户生成的风格，匹配 Fiverr 上最适合的设计师品类（更高转化）
const FIVERR_STYLE_QUERIES = {
  neon:    { query: 'neon+pixel+art',         cta_zh: '找设计师把霓虹肖像做成动态 GIF', cta_en: 'Hire a designer to animate this neon portrait' },
  pop:     { query: 'pop+art+illustration',    cta_zh: '委托艺术家把这张做成限量海报',   cta_en: 'Commission a limited-edition poster of this' },
  cyber:   { query: 'cyberpunk+illustration',  cta_zh: '雇佣赛博朋克插画师扩展世界观',   cta_en: 'Hire a cyberpunk illustrator to expand the world' },
  ink:     { query: 'ink+illustration',        cta_zh: '找水墨插画师出品同款艺术微喷',   cta_en: 'Order a giclée print of this ink style' },
  vintage: { query: 'retro+illustration',     cta_zh: '委托艺术家做成复古胶片影集',     cta_en: 'Commission a retro photo-album edition' },
  thermal: { query: 'digital+art+commission',  cta_zh: '找数字艺术家定制热成像 NFT',     cta_en: 'Commission a thermal-style NFT' }
};

function buildFiverrUrl(query) {
  return `https://www.fiverr.com/search/gigs?query=${query}&a_id=${FIVERR_AFFILIATE_ID}`;
}

// 追踪联盟点击（送到 Clarity + console 留痕）
function trackAffiliateClick(label) {
  try { window.clarity && window.clarity('set', 'fiverr_click', label); } catch (e) {}
  console.log('[affiliate]', label);
}

// ---------- 国际化（中 / EN） ----------
const I18N = {
  zh: {
    brand: 'PixelCut Studio',
    'nav.examples': '效果', 'nav.create': '创作', 'nav.gallery': '风格库', 'nav.how': '玩法', 'nav.features': '特性',
    'hero.badge': '100% 浏览器本地 · 免费 · 零上传',
    'hero.title1': '把照片变成', 'hero.title2': '8-bit 像素艺术',
    'hero.subtitle': '霓虹肖像、波普艺术、赛博朋克 … 六种风格一键生成。无需注册、不上传服务器，所有处理都在你的设备本地完成。',
    'hero.cta': '立即开始创作', 'hero.gallery': '浏览风格',
    'hero.stat1': '种风格', 'hero.stat2': 'API / 注册', 'hero.stat3': '本地处理',
    'hero.artbefore': '原图', 'hero.artafter': '像素化', 'hero.artcaption': '实时浏览器渲染 · 不上传',
    'studio.title': '开始创作', 'studio.desc': '上传一张照片，调节风格与参数，几秒后得到你的专属像素形象。',
    'upload.hint': '支持 JPG / PNG / WEBP · 图片全程在本地处理，不会离开你的设备',
    'privacy': '🔒 隐私说明：所有图像仅在你的浏览器内通过 Canvas 处理，不上传任何服务器。',
    'ctrl.style': '风格', 'ctrl.density': '像素密度', 'ctrl.scale': '放大倍数', 'ctrl.colors': '色彩层数',
    'ctrl.sat': '饱和度', 'ctrl.con': '对比度', 'ctrl.outline': '保留轮廓线', 'ctrl.format': '下载格式',
    'btn.generate': '⚡ 生成像素形象', 'btn.download': '⬇ 下载', 'btn.share': '🔗 分享', 'btn.reset': '↺ 重新上传',
    'result.original': '原图', 'result.pixel': '像素形象',
    'examples.title': '真实转换效果', 'examples.subtitle': '同一张照片，六种热门风格一键变身像素艺术。',
    'gallery.title': '六种风格，总有一款适合你', 'gallery.subtitle': '点击下方任意风格卡片，立即在上方创作区套用并预览。',
    'style.neon': '霓虹肖像', 'style.pop': '波普艺术', 'style.cyber': '赛博朋克',
    'style.ink': '水墨素描', 'style.vintage': '复古胶片', 'style.thermal': '热成像',
    'style.neon.desc': '高饱和分块 · 赛博潮味',
    'style.pop.desc': '扁平色块 · 海报感', 'style.cyber.desc': '冷色霓虹 + CRT 扫描线',
    'style.ink.desc': '纸墨分层 · 东方韵味', 'style.vintage.desc': '怀旧 sepia 棕调', 'style.thermal.desc': '红外渐变 · 科技感',
    'how.title': '三步，照片变像素', 'how.subtitle': '全程无需任何技术背景，打开网页就能玩。',
    'how.s1.t': '上传照片', 'how.s1.d': '拖拽或点击选择本地图片，立即显示预览。',
    'how.s2.t': '挑选风格', 'how.s2.d': '六种风格自由切换，调节像素密度与配色。',
    'how.s3.t': '下载分享', 'how.s3.d': '一键导出 PNG / JPEG / WEBP，随时使用。',
    'features.title': '为什么选择 PixelCut', 'features.subtitle': '简单、安全、免费，没有套路。',
    'feat.privacy.t': '隐私优先', 'feat.privacy.d': '所有处理在浏览器本地完成，照片从不离开你的设备。',
    'feat.free.t': '完全免费', 'feat.free.d': '零成本、零依赖、无需 API Key，打开网页直接用。',
    'feat.fast.t': '秒级生成', 'feat.fast.d': '纯 Canvas 算法，无需联网等待，即时出图。',
    'feat.styles.t': '风格丰富', 'feat.styles.d': '霓虹肖像、波普艺术、赛博朋克、水墨、热成像，一应俱全。',
    'footer.note': '纯前端像素艺术工具 · 所有图像均在本地处理，不上传服务器。',
    'upload.text.html': '拖拽图片到此处，或 <span class="link">点击选择</span>',
    'download': '⬇ 下载',
    'status.loaded': '已加载，点击「生成像素形象」开始转换。',
    'status.loading': '⏳ 正在生成…',
    'status.done': '✅ 完成：{dims} 像素块 · {style} · {colors} 色层',
    'status.fail': '❌ 生成失败：',
    'share.text': '我用 PixelCut Studio 把照片变成了像素风🎨 6种风格免费玩👉 ',
    'share.copied': '✅ 分享文案已复制到剪贴板',
    'sponsor.label': '赞助内容 · Sponsored',
    'sponsor.fallback.t': '想在这里展示你的产品？',
    'sponsor.fallback.d': '面向设计/开发者人群，CPM $3-$8，无中间商抽佣。',
    'sponsor.fallback.cta': '联系投放',
    'aff.badge': '推荐服务 · Recommended',
    'aff.t': '想把作品升级？',
    'aff.cta': '前往 Fiverr →',
    'footer.aff.t': '想把这张头像做成周边？',
    'footer.aff.d': 'Fiverr 上 5 万 + 设计师帮你出贴纸/T恤/动画',
    'footer.aff.cta': '找设计师 ›'
  },
  en: {
    brand: 'PixelCut Studio',
    'nav.examples': 'Examples', 'nav.create': 'Create', 'nav.gallery': 'Styles', 'nav.how': 'How', 'nav.features': 'Features',
    'hero.badge': '100% in-browser · Free · Zero upload',
    'hero.title1': 'Turn photos into', 'hero.title2': '8-bit pixel art',
    'hero.subtitle': 'Neon portrait, pop art, cyberpunk … six styles in one tap. No signup, no upload — everything runs locally on your device.',
    'hero.cta': 'Start creating', 'hero.gallery': 'Browse styles',
    'hero.stat1': 'styles', 'hero.stat2': 'API / signup', 'hero.stat3': 'local processing',
    'hero.artbefore': 'Original', 'hero.artafter': 'Pixelized', 'hero.artcaption': 'Rendered live in browser · no upload',
    'studio.title': 'Start creating', 'studio.desc': 'Upload a photo, tweak the style and parameters, and get your pixel avatar in seconds.',
    'upload.hint': 'JPG / PNG / WEBP · your image stays on your device',
    'privacy': '🔒 Privacy: all processing happens locally via Canvas. Nothing is uploaded.',
    'ctrl.style': 'Style', 'ctrl.density': 'Pixel density', 'ctrl.scale': 'Scale', 'ctrl.colors': 'Color steps',
    'ctrl.sat': 'Saturation', 'ctrl.con': 'Contrast', 'ctrl.outline': 'Keep outlines', 'ctrl.format': 'Download format',
    'btn.generate': '⚡ Generate', 'btn.download': '⬇ Download', 'btn.share': '🔗 Share', 'btn.reset': '↺ Upload again',
    'result.original': 'Original', 'result.pixel': 'Pixel art',
    'examples.title': 'Real conversion results', 'examples.subtitle': 'The same photo, six hot styles turned into pixel art with one tap.',
    'gallery.title': 'Six styles, pick your vibe', 'gallery.subtitle': 'Tap any style card to apply it in the studio above.',
    'style.neon': 'Neon', 'style.pop': 'Pop', 'style.cyber': 'Cyberpunk',
    'style.ink': 'Ink', 'style.vintage': 'Vintage', 'style.thermal': 'Thermal',
    'style.neon.desc': 'High-sat blocks · cyber edge',
    'style.pop.desc': 'Flat blocks · poster feel', 'style.cyber.desc': 'Cool neon + CRT scanlines',
    'style.ink.desc': 'Paper & ink layers · oriental', 'style.vintage.desc': 'Nostalgic sepia tone', 'style.thermal.desc': 'Infrared gradient · tech',
    'how.title': 'Three steps to pixel', 'how.subtitle': 'No tech skills needed — just open the page.',
    'how.s1.t': 'Upload', 'how.s1.d': 'Drag or click to pick a local image, preview instantly.',
    'how.s2.t': 'Pick a style', 'how.s2.d': 'Switch among 6 styles and tune density & colors.',
    'how.s3.t': 'Download', 'how.s3.d': 'Export to PNG / JPEG / WEBP anytime.',
    'features.title': 'Why PixelCut', 'features.subtitle': 'Simple, safe, free — no catch.',
    'feat.privacy.t': 'Privacy first', 'feat.privacy.d': 'All processing is local. Your photo never leaves the device.',
    'feat.free.t': 'Completely free', 'feat.free.d': 'Zero cost, zero deps, no API key — just open and use.',
    'feat.fast.t': 'Instant', 'feat.fast.d': 'Pure Canvas math, no waiting on a server.',
    'feat.styles.t': 'Rich styles', 'feat.styles.d': 'Neon, pop, cyberpunk, ink, thermal — all included.',
    'footer.note': 'A pure front-end pixel art tool · images are processed locally, never uploaded.',
    'upload.text.html': 'Drag an image here, or <span class="link">click to choose</span>',
    'download': '⬇ Download',
    'status.loaded': 'Loaded. Click "Generate" to start.',
    'status.loading': 'Generating…',
    'status.done': '✅ Done: {dims} pixels · {style} · {colors} color steps',
    'status.fail': '❌ Failed: ',
    'share.text': 'Turned my photo into pixel art with PixelCut Studio 🎨 6 styles, free👉 ',
    'share.copied': '✅ Share text copied to clipboard',
    'sponsor.label': 'Sponsored',
    'sponsor.fallback.t': 'Want to show your product here?',
    'sponsor.fallback.d': 'Reach designers & devs. CPM $3–$8, no middleman.',
    'sponsor.fallback.cta': 'Book ad slot',
    'aff.badge': 'Recommended',
    'aff.t': 'Want to take it further?',
    'aff.cta': 'See Fiverr designers →',
    'footer.aff.t': 'Turn this avatar into merch?',
    'footer.aff.d': '50,000+ Fiverr designers for stickers, tees, animations',
    'footer.aff.cta': 'Find a designer ›'
  }
};

const STYLE_NAMES = {
  neon:    { zh: '🌈 霓虹肖像', en: '🌈 Neon' },
  pop:     { zh: '🎨 波普艺术', en: '🎨 Pop' },
  cyber:   { zh: '🤖 赛博朋克', en: '🤖 Cyberpunk' },
  ink:     { zh: '🖌 水墨素描', en: '🖌 Ink' },
  vintage: { zh: '📷 复古胶片', en: '📷 Vintage' },
  thermal: { zh: '🌡 热成像', en: '🌡 Thermal' },
};

let currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem('pc_lang')) || 'zh';
function t(key) {
  const dict = I18N[currentLang] || I18N.zh;
  return dict[key] != null ? dict[key] : (I18N.zh[key] != null ? I18N.zh[key] : key);
}

// ---------- 上传交互 ----------
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadFile(file);
});

['dragover', 'dragenter'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag');
  })
);
dropZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

function loadFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      drawSource(img);
      controls.hidden = false;
      resultSection.hidden = false;
      downloadBtn.disabled = true;
      statusEl.textContent = t('status.loaded');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 原图预览（等比缩放，最长边 280px）
function drawSource(img) {
  const maxSide = 280;
  let w = img.width, h = img.height;
  if (w > h && w > maxSide) { h = Math.round(h * maxSide / w); w = maxSide; }
  else if (h > maxSide) { w = Math.round(w * maxSide / h); h = maxSide; }
  srcCanvas.width = w;
  srcCanvas.height = h;
  srcCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
}

// ---------- 核心：生成像素图 ----------
function generate() {
  if (!sourceImage) return;
  generateBtn.disabled = true;
  statusEl.textContent = t('status.loading');

  // 让 UI 先刷新再执行（避免卡顿假死）
  setTimeout(() => {
    try {
      const density = parseInt(densitySel.value, 10);
      const scale = parseInt(scaleSlider.value, 10);
      const colorCount = parseInt(colorsSlider.value, 10);
      const withOutline = outlineChk.checked;
      const style = styleSel.value;
      const saturation = parseInt(satSlider.value, 10) / 100;
      const contrast = parseInt(conSlider.value, 10) / 100;

      const out = pixelize(sourceImage, density, scale, colorCount, withOutline, style, saturation, contrast);

      outCanvas.width = out.width;
      outCanvas.height = out.height;
      outCanvas.getContext('2d').putImageData(out, 0, 0);

      downloadBtn.disabled = false;
      downloadBtn.dataset.ready = '1';
      const dims = out.width + '×' + out.height;
      const styleLabel = (STYLE_NAMES[style] && STYLE_NAMES[style][currentLang]) || style;
      statusEl.textContent = t('status.done')
        .replace('{dims}', dims)
        .replace('{style}', styleLabel)
        .replace('{colors}', colorCount);

      // 渲染「下一步推荐」联盟卡片（仅当 ID 已替换）
      renderAffiliateCard(style);
    } catch (err) {
      statusEl.textContent = t('status.fail') + err.message;
    } finally {
      generateBtn.disabled = false;
    }
  }, 30);
}

// 渲染联盟卡片：用户生成完成 → 推荐相关品类 Fiverr 设计师
function renderAffiliateCard(style) {
  if (!FIVERR_AFF_ENABLED) return;
  const slot = $('affiliateSlot');
  if (!slot) return;
  const m = FIVERR_STYLE_QUERIES[style] || { query: 'pixel+art', cta_zh: '找设计师继续创作', cta_en: 'Hire a designer to keep creating' };
  const cta = currentLang === 'zh' ? m.cta_zh : m.cta_en;
  const url = buildFiverrUrl(m.query);

  slot.innerHTML = `
    <div class="affiliate-card">
      <span class="affiliate-card__badge" data-i18n="aff.badge">推荐服务 · Recommended</span>
      <div class="affiliate-card__body">
        <span class="affiliate-card__icon" aria-hidden="true">🎨</span>
        <div class="affiliate-card__text">
          <strong data-i18n="aff.t">想把作品升级？</strong>
          <span>${escapeHtml(cta)}</span>
        </div>
        <a class="btn btn--primary btn--sm"
           href="${url}"
           target="_blank"
           rel="sponsored noopener"
           data-affiliate="result"
           data-aff-query="${m.query}">
           <span data-i18n="aff.cta">前往 Fiverr →</span>
        </a>
      </div>
    </div>
  `;
  applyLang(currentLang);

  // 一次事件代理：拦截所有联盟链接点击用于统计
  slot.querySelectorAll('a[data-affiliate]').forEach(a => {
    a.addEventListener('click', () => {
      trackAffiliateClick(`${a.dataset.affiliate}:${a.dataset.affQuery}`);
    });
  });
}

// HTML 转义（防御 XSS）
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 加载页脚联盟横条（始终展示，不影响主功能）
function renderFooterAffiliateBar() {
  if (!FIVERR_AFF_ENABLED) return;
  const slot = $('footerAffiliateBar');
  if (!slot) return;
  const url = buildFiverrUrl('pixel+art+designer');
  slot.innerHTML = `
    <div class="aff-bar">
      <span class="aff-bar__dot"></span>
      <span class="aff-bar__text">
        <strong data-i18n="footer.aff.t">想把这张头像做成周边？</strong>
        <span data-i18n="footer.aff.d">Fiverr 上 5 万 + 设计师帮你出贴纸/T恤/动画</span>
      </span>
      <a class="aff-bar__cta"
         href="${url}"
         target="_blank"
         rel="sponsored noopener"
         data-affiliate="footer"
         data-aff-query="pixel+art+designer"
         data-i18n="footer.aff.cta">找设计师 ›</a>
    </div>
  `;
  applyLang(currentLang);
  slot.querySelector('a[data-affiliate]').addEventListener('click', e => {
    trackAffiliateClick(`${e.currentTarget.dataset.affiliate}:${e.currentTarget.dataset.affQuery}`);
  });
}

// 根据语言变化刷新联盟卡片文案
function refreshAffiliateCards() {
  const slot = $('affiliateSlot');
  if (slot && slot.firstElementChild) {
    const style = styleSel ? styleSel.value : null;
    if (style) renderAffiliateCard(style);
  }
}
  // 1) 计算降采样目标尺寸（保持比例，density 为长边像素数）
  let tw = img.width, th = img.height;
  if (tw >= th) { th = Math.round(th * density / tw); tw = density; }
  else { tw = Math.round(tw * density / th); th = density; }

  // 2) 降采样：开启平滑获得每块平均色
  const small = document.createElement('canvas');
  small.width = tw; small.height = th;
  const sctx = small.getContext('2d');
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(img, 0, 0, tw, th);

  const imgData = sctx.getImageData(0, 0, tw, th);
  const data = imgData.data;

  // 3) 按风格处理颜色（统一调度，详见 processStyle）
  processStyle(style, data, colorCount, saturation, contrast);

  // 4) 边缘描线（在量化后的小图上执行，放大后即为粗轮廓）
  if (withOutline) applyOutline(data, tw, th);

  // 5) 无平滑放大到显示分辨率
  const out = document.createElement('canvas');
  out.width = tw * scale;
  out.height = th * scale;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false; // 关键：保持锐利像素块
  const tmp = document.createElement('canvas');
  tmp.width = tw; tmp.height = th;
  tmp.getContext('2d').putImageData(imgData, 0, 0);
  octx.drawImage(tmp, 0, 0, tw * scale, th * scale);

  // 赛博朋克：叠加 CRT 扫描线，强化科技感
  if (style === 'cyber') {
    octx.globalAlpha = 0.10;
    octx.fillStyle = '#000000';
    for (let y = 0; y < out.height; y += Math.max(2, scale)) {
      octx.fillRect(0, y, out.width, 1);
    }
    octx.globalAlpha = 1;
  }

  return octx.getImageData(0, 0, out.width, out.height);
}

// ---------- HSL 工具 ----------
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 按亮度分层映射到指定色板（霓虹/波普核心）
function mapLuminanceToPalette(data, palette, levels) {
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // levels 决定亮度分层数量，再映射到色板
    const band = Math.min(levels - 1, Math.floor((lum / 256) * levels));
    const idx = Math.min(palette.length - 1, Math.floor((band / levels) * palette.length));
    const c = palette[idx];
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
  }
}

// ---------- 风格预设与处理 ----------
const PALETTES = {
  neon:    [[20, 20, 60], [128, 0, 255], [255, 0, 128], [ 255, 80, 0], [255, 220, 0], [0, 255, 160], [0, 255, 255]],
  pop:     [[40, 40, 100], [255, 60, 160], [255, 210, 0], [60, 180, 255], [245, 245, 210]],
  cyber:   [[8, 10, 34], [120, 0, 255], [255, 0, 200], [0, 255, 255], [255, 240, 0], [0, 255, 120]],
  thermal: [[0, 0, 0], [40, 0, 90], [130, 0, 160], [200, 30, 40], [255, 120, 0], [255, 210, 40], [255, 255, 235]],
};

function boostSatCon(data, sat, con) {
  for (let i = 0; i < data.length; i += 4) {
    let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    s = Math.min(1, s * sat);
    l = (l - 0.5) * con + 0.5;
    l = Math.max(0, Math.min(1, l));
    [data[i], data[i + 1], data[i + 2]] = hslToRgb(h, s, l);
  }
}

function mapGradient(data, gradient, levels) {
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const q = Math.round((lum / 255) * levels) / levels; // 0..1，分 levels 级
    const pos = q * (gradient.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(gradient.length - 1, i0 + 1);
    const f = pos - i0;
    data[i]     = Math.round(gradient[i0][0] * (1 - f) + gradient[i1][0] * f);
    data[i + 1] = Math.round(gradient[i0][1] * (1 - f) + gradient[i1][1] * f);
    data[i + 2] = Math.round(gradient[i0][2] * (1 - f) + gradient[i1][2] * f);
  }
}

function applyContrastRGB(r, g, b, con) {
  const f = (x) => { const v = (x / 255 - 0.5) * con + 0.5; return v * 255; };
  return [f(r), f(g), f(b)];
}
function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function processStyle(style, data, colorCount, saturation, contrast) {
  switch (style) {
    case 'neon':
      boostSatCon(data, saturation, contrast);
      mapLuminanceToPalette(data, PALETTES.neon, colorCount);
      break;
    case 'pop':
      boostSatCon(data, saturation, contrast);
      mapLuminanceToPalette(data, PALETTES.pop, colorCount);
      break;
    case 'cyber':
      boostSatCon(data, saturation, contrast);
      mapLuminanceToPalette(data, PALETTES.cyber, colorCount);
      break;
    case 'thermal':
      mapGradient(data, PALETTES.thermal, colorCount);
      break;
    case 'ink': {
      // 水墨：纸为底、墨为形，按亮度分层
      const paper = [244, 240, 228];
      const ink = [28, 30, 44];
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const t = Math.min(1, Math.round((lum / 255) * colorCount) / colorCount); // 1=亮
        const f = 1 - t; // 暗处转墨
        data[i]     = Math.round(paper[0] * t + ink[0] * f);
        data[i + 1] = Math.round(paper[1] * t + ink[1] * f);
        data[i + 2] = Math.round(paper[2] * t + ink[2] * f);
      }
      break;
    }
    case 'vintage': {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let nr = 0.393 * r + 0.769 * g + 0.189 * b;
        let ng = 0.349 * r + 0.686 * g + 0.168 * b;
        let nb = 0.272 * r + 0.534 * g + 0.131 * b;
        [nr, ng, nb] = applyContrastRGB(nr, ng, nb, contrast);
        data[i] = clamp255(nr); data[i + 1] = clamp255(ng); data[i + 2] = clamp255(nb);
      }
      break;
    }
    default: {
      const palette = medianCutPalette(data, colorCount);
      mapToPalette(data, palette);
    }
  }
}

// ---------- 中位切分量化（Median Cut） ----------
function medianCutPalette(data, maxColors) {
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  let boxes = [makeBox(pixels)];
  while (boxes.length < maxColors) {
    // 选颜色跨度最大的盒子
    boxes.sort((a, b) => b.range() - a.range());
    const box = boxes.shift();
    const split = box.split();
    if (!split) break;
    boxes.push(split[0], split[1]);
  }
  return boxes.map((b) => b.average());
}

function makeBox(pixels) {
  return {
    pixels,
    range() {
      let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
      for (const p of this.pixels) {
        rmin = Math.min(rmin, p[0]); rmax = Math.max(rmax, p[0]);
        gmin = Math.min(gmin, p[1]); gmax = Math.max(gmax, p[1]);
        bmin = Math.min(bmin, p[2]); bmax = Math.max(bmax, p[2]);
      }
      return Math.max(rmax - rmin, gmax - gmin, bmax - bmin);
    },
    split() {
      if (this.pixels.length < 2) return null;
      const rmin = Math.min(...this.pixels.map((p) => p[0]));
      const rmax = Math.max(...this.pixels.map((p) => p[0]));
      const gmin = Math.min(...this.pixels.map((p) => p[1]));
      const gmax = Math.max(...this.pixels.map((p) => p[1]));
      const bmin = Math.min(...this.pixels.map((p) => p[2]));
      const bmax = Math.max(...this.pixels.map((p) => p[2]));
      const ranges = [rmax - rmin, gmax - gmin, bmax - bmin];
      const ch = ranges.indexOf(Math.max(...ranges));
      this.pixels.sort((a, b) => a[ch] - b[ch]);
      const mid = this.pixels.length >> 1;
      return [makeBox(this.pixels.slice(0, mid)), makeBox(this.pixels.slice(mid))];
    },
    average() {
      let r = 0, g = 0, b = 0;
      for (const p of this.pixels) { r += p[0]; g += p[1]; b += p[2]; }
      const n = this.pixels.length || 1;
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    }
  };
}

function mapToPalette(data, palette) {
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = nearestColor([data[i], data[i + 1], data[i + 2]], palette);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
}

function nearestColor(c, palette) {
  let best = palette[0], bestD = Infinity;
  for (const p of palette) {
    const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// ---------- 边缘描线 ----------
function applyOutline(data, w, h) {
  // 计算亮度
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const TH = 48; // 亮度差阈值
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const right = x + 1 < w ? lum[idx + 1] : lum[idx];
      const down = y + 1 < h ? lum[idx + w] : lum[idx];
      if (Math.abs(lum[idx] - right) > TH || Math.abs(lum[idx] - down) > TH) {
        const i = idx * 4;
        data[i] = 25; data[i + 1] = 25; data[i + 2] = 35; data[i + 3] = 255;
      }
    }
  }
}

// ---------- 水印配置 ----------
const WATERMARK_ENABLED = true;
const WATERMARK_SITE = 'pixcutstudio.netlify.app';
const WATERMARK_LABEL = 'PixelCut Studio';

// 在画布右下角叠加半透明水印，返回带水印的 data URL
function addWatermark(canvas, type, quality) {
  if (!WATERMARK_ENABLED) return canvas.toDataURL(type, quality);
  const w = canvas.width, h = canvas.height;
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const ctx = tmp.getContext('2d');
  ctx.drawImage(canvas, 0, 0);

  // 水印字号自适应图片尺寸（约 3.5% 高度，最小 10px）
  const fontSize = Math.max(10, Math.round(h * 0.035));
  const line1 = WATERMARK_LABEL;
  const line2 = WATERMARK_SITE;
  ctx.font = `600 ${fontSize}px "Inter", "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';

  const pad = Math.max(6, Math.round(fontSize * 0.6));
  const lineH = Math.round(fontSize * 1.25);
  const x = w - pad;
  const y2 = h - pad;
  const y1 = y2 - lineH;

  // 半透明阴影 + 文字（白色带微弱描边，暗图亮图都能看清）
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#000000';
  ctx.fillText(line1, x + 1, y1 + 1);
  ctx.fillText(line2, x + 1, y2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, fontSize * 0.08);
  ctx.strokeText(line1, x, y1);
  ctx.fillText(line1, x, y1);
  ctx.strokeText(line2, x, y2);
  ctx.fillText(line2, x, y2);
  ctx.globalAlpha = 1;

  return tmp.toDataURL(type, quality);
}

// ---------- 下载（多格式 + 水印） ----------
function download() {
  if (downloadBtn.dataset.ready !== '1') return;
  const type = formatSel.value;
  const ext = formatSel.selectedOptions[0].getAttribute('data-ext') || 'png';
  const quality = type === 'image/png' ? undefined : 0.95;
  const dataUrl = addWatermark(outCanvas, type, quality);
  const link = document.createElement('a');
  link.download = 'pixel-avatar.' + ext;
  link.href = dataUrl;
  link.click();
}

// ---------- 事件绑定 ----------
generateBtn.addEventListener('click', generate);
downloadBtn.addEventListener('click', download);

// 分享按钮：复制预设文案 + 网址到剪贴板
const shareBtn = $('shareBtn');
shareBtn.addEventListener('click', () => {
  const siteUrl = location.href;
  const text = t('share.text') + siteUrl;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      statusEl.textContent = t('share.copied');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); statusEl.textContent = t('share.copied'); } catch (e) {}
  document.body.removeChild(ta);
}

resetBtn.addEventListener('click', () => {
  sourceImage = null;
  fileInput.value = '';
  controls.hidden = true;
  resultSection.hidden = true;
  const up = dropZone.querySelector('[data-i18n-html="upload.text"]');
  if (up) up.innerHTML = t('upload.text.html');
});
scaleSlider.addEventListener('input', () => (scaleVal.textContent = scaleSlider.value + '×'));
colorsSlider.addEventListener('input', () => (colorsVal.textContent = colorsSlider.value));
satSlider.addEventListener('input', () => (satVal.textContent = satSlider.value + '%'));
conSlider.addEventListener('input', () => (conVal.textContent = conSlider.value + '%'));

// 风格切换时自动推荐参数
const STYLE_PRESETS = {
  neon:    { d: '64', c: 8,  sat: 180, con: 130, out: false },
  pop:     { d: '64', c: 5,  sat: 160, con: 140, out: false },
  cyber:   { d: '64', c: 8,  sat: 170, con: 140, out: false },
  ink:     { d: '64', c: 8,  sat: 100, con: 120, out: true },
  vintage: { d: '96', c: 12, sat: 120, con: 115, out: false },
  thermal: { d: '64', c: 12, sat: 100, con: 130, out: false },
};
styleSel.addEventListener('change', () => {
  const r = STYLE_PRESETS[styleSel.value] || {};
  if (r.d) densitySel.value = r.d;
  if (r.c) colorsSlider.value = r.c;
  if (r.sat) satSlider.value = r.sat;
  if (r.con) conSlider.value = r.con;
  if (r.out !== undefined) outlineChk.checked = r.out;
  // 同步显示值
  scaleVal.textContent = scaleSlider.value + '×';
  colorsVal.textContent = colorsSlider.value;
  satVal.textContent = satSlider.value + '%';
  conVal.textContent = conSlider.value + '%';
});

// 下载格式变化时更新按钮文案
function syncDownloadLabel() {
  const ext = (formatSel.selectedOptions[0] && formatSel.selectedOptions[0].getAttribute('data-ext')) || 'png';
  downloadBtn.textContent = t('download') + ' ' + ext.toUpperCase();
}
formatSel.addEventListener('input', syncDownloadLabel);
syncDownloadLabel();

// ---------- 背景浮动像素装饰 ----------
function spawnDecorPixels() {
  const wrap = document.querySelector('.bg-pixels');
  if (!wrap) return;
  const colors = ['#ff5d5d', '#6bd96b', '#6d7bff', '#ffd23f', '#ff7ad9', '#52e0e0'];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    const size = 6 + Math.random() * 16;
    s.style.left = (Math.random() * 100) + '%';
    s.style.top = (Math.random() * 100) + '%';
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.background = colors[i % colors.length];
    s.style.animationDuration = (9 + Math.random() * 11) + 's';
    s.style.animationDelay = (-Math.random() * 18) + 's';
    wrap.appendChild(s);
  }
}
spawnDecorPixels();

// ---------- 国际化：应用语言 ----------
function applyLang(lang) {
  currentLang = lang;
  if (typeof localStorage !== 'undefined') localStorage.setItem('pc_lang', lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  // 重新渲染联盟卡片（语言切换后保持推荐语一致）
  refreshAffiliateCards();
  // 风格下拉文案
  for (const opt of styleSel.options) {
    const k = opt.value;
    if (STYLE_NAMES[k]) opt.textContent = STYLE_NAMES[k][lang];
  }
  // 语言按钮高亮
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('is-active', b.getAttribute('data-lang') === lang);
  });
  syncDownloadLabel();
  const loadedZh = I18N.zh['status.loaded'];
  const loadedEn = I18N.en['status.loaded'];
  if (statusEl.textContent === loadedZh || statusEl.textContent === loadedEn) {
    statusEl.textContent = t('status.loaded');
  }
  // 同步下载按钮文案（语言切换时）
  syncDownloadLabel();
}

document.querySelectorAll('.lang-btn').forEach((b) => {
  b.addEventListener('click', () => applyLang(b.getAttribute('data-lang')));
});

// ---------- 风格卡：点击套用并滚动 ----------
document.querySelectorAll('.style-card').forEach((card) => {
  card.addEventListener('click', () => {
    const s = card.getAttribute('data-style');
    if (!s) return;
    styleSel.value = s;
    styleSel.dispatchEvent(new Event('change'));
    const studio = document.getElementById('studio');
    if (studio) studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ---------- Hero：绘制像素示例头像 ----------
function drawHeroDemo() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const grid = 16;
  const cell = canvas.width / grid;
  const palette = { '.': null, '1': '#ffd23f', '2': '#0b0d1a' };
  const face = [
    '................',
    '................',
    '....11111111....',
    '..111111111111..',
    '..111111111111..',
    '..111111111111..',
    '..112211112211..',
    '..112211112211..',
    '..111111111111..',
    '..111111111111..',
    '..111222222111..',
    '..111222222111..',
    '..111111111111..',
    '..111111111111..',
    '....11111111....',
    '................',
  ];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const ch = face[y][x];
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }
}
drawHeroDemo();

// 初始化语言
applyLang(currentLang);

// ===== 联盟卡片：渲染（审核通过后再启用） =====
renderFooterAffiliateBar();

// ===== 赞助位：Carbon Ads 加载失败时回退到自营招租卡片 =====
(function initSponsor() {
  const slot = $('carbonads');
  const fallback = document.querySelector('.sponsor__fallback');
  if (!slot || !fallback) return;

  // Carbon 加载成功的标志：在 #carbonads 内插入 .carbon-wrap 元素
  let loaded = false;
  const observer = new MutationObserver(() => {
    if (slot.querySelector('.carbon-wrap, .carbonad, [data-carbon]') || slot.children.length > 1) {
      loaded = true;
      fallback.style.display = 'none';
      observer.disconnect();
    }
  });
  observer.observe(slot, { childList: true, subtree: true });

  // 8 秒超时仍未出现广告内容 → 显示招租 fallback
  setTimeout(() => {
    if (!loaded) {
      fallback.style.display = 'flex';
      observer.disconnect();
    }
  }, 8000);
})();
