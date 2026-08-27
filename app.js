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
const cleanDownloadBtn = $('cleanDownloadBtn');
const merchBtn = $('merchBtn');
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

// ---------- 联盟营销（双线）：中文 → 淘宝联盟，英文 → AppSumo ----------
// 中文用户 → 淘宝联盟（阿里妈妈 pub.alimama.com）
//   PID 形如 mm_xxx_xxx_xxx；纯前端无法自动转链，默认用公开搜索页（不带佣金）。
//   开通 PID 后，把 TAOBAO_PROMO_BASE 改成阿里妈妈后台「带 PID 的 uland 链接」，并在其中用 {q} 作为关键词占位即可拿到佣金。
const TAOBAO_PROMO_BASE = 'https://s.taobao.com/search?q='; // ← 开通后换成 uland.taobao.com/...?pid=mm_xxx&q={q}
const TAOBAO_ENABLED = !TAOBAO_PROMO_BASE.includes('YOUR_TAOBAO');

// 英文用户 → AppSumo（appsumo.com/partners）
//   审核通过后在 dashboard 拿到 referral code（appsumo.com/r/XXXX 的 XXXX）
const APPSUMO_REF = 'YOUR_APPSUMO_REF';
const APPSUMO_ENABLED = APPSUMO_REF !== 'YOUR_APPSUMO_REF';

// 根据用户生成的风格，匹配 Fiverr 上最适合的设计师品类（更高转化）
// 中文：淘宝搜索关键词（按风格唤起定制 / 周边）
const TAOBAO_STYLE_KEYWORDS = {
  neon:    '像素风霓虹插画定制',
  pop:     '波普艺术海报定制',
  cyber:   '赛博朋克插画定制',
  vintage: '复古风插画定制',
  thermal: '数字艺术定制'
};
// 英文：AppSumo 推荐的具体产品（按风格匹配设计工具）
const APPSUMO_STYLE_SLUGS = {
  neon:    'canva',
  pop:     'canva',
  cyber:   'figma',
  vintage: 'envato-elements',
  thermal: 'design'
};

function buildTaobaoUrl(kw) {
  if (TAOBAO_PROMO_BASE.includes('{q}')) return TAOBAO_PROMO_BASE.replace('{q}', encodeURIComponent(kw));
  return TAOBAO_PROMO_BASE + encodeURIComponent(kw);
}
function buildAppSumoUrl() {
  return `https://appsumo.com/r/${APPSUMO_REF}`; // 通用归因链接，覆盖全部产品
}

// 追踪联盟点击（送到 Clarity + console 留痕）
function trackAffiliateClick(label) {
  try { window.clarity && window.clarity('set', 'aff_click', label); } catch (e) {}
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
    'style.vintage': '复古胶片', 'style.thermal': '热成像',
    'style.neon.desc': '高饱和分块 · 赛博潮味',
    'style.pop.desc': '扁平色块 · 海报感', 'style.cyber.desc': '冷色霓虹 + CRT 扫描线',
    'style.vintage.desc': '怀旧 sepia 棕调', 'style.thermal.desc': '红外渐变 · 科技感',
    'how.title': '三步，照片变像素', 'how.subtitle': '全程无需任何技术背景，打开网页就能玩。',
    'how.s1.t': '上传照片', 'how.s1.d': '拖拽或点击选择本地图片，立即显示预览。',
    'how.s2.t': '挑选风格', 'how.s2.d': '六种风格自由切换，调节像素密度与配色。',
    'how.s3.t': '下载分享', 'how.s3.d': '一键导出 PNG / JPEG / WEBP，随时使用。',
    'features.title': '为什么选择 PixelCut', 'features.subtitle': '简单、安全、免费，没有套路。',
    'feat.privacy.t': '隐私优先', 'feat.privacy.d': '所有处理在浏览器本地完成，照片从不离开你的设备。',
    'feat.free.t': '完全免费', 'feat.free.d': '零成本、零依赖、无需 API Key，打开网页直接用。',
    'feat.fast.t': '秒级生成', 'feat.fast.d': '纯 Canvas 算法，无需联网等待，即时出图。',
    'feat.styles.t': '风格丰富', 'feat.styles.d': '原图、霓虹肖像、波普艺术、赛博朋克、复古胶片、热成像，一应俱全。',
    'footer.note': '纯前端像素艺术工具 · 所有图像均在本地处理，不上传服务器。',
    'upload.text.html': '拖拽图片到此处，或 <span class="link">点击选择</span>',
    'download': '⬇ 下载',
    'btn.clean': '💎 下载无水印（免费）',
    'btn.clean.unlocked': '✨ 下载无水印（已解锁）',
    'paid.welcome': '✨ 感谢支持！干净版下载已在本浏览器解锁。',
    'status.loaded': '已加载，点击「生成像素形象」开始转换。',
    'status.loading': '⏳ 正在生成…',
    'status.done': '✅ 完成：{dims} 像素块 · {style} · {colors} 色层',
    'status.donePerler': '✅ 完成：{dims} 豆 · {style} · {colors} 色层',
    'status.fail': '❌ 生成失败：',
    'share.text': '我用 PixelCut Studio 把照片变成了像素风🎨 6种风格免费玩👉 ',
    'share.title': '分享给朋友',
    'share.twitter': 'X / Twitter',
    'share.facebook': 'Facebook',
    'share.linkedin': 'LinkedIn',
    'share.pinterest': 'Pinterest',
    'share.weibo': '微博',
    'share.wechat': '微信',
    'share.tiktok': 'TikTok',
    'share.copy': '复制链接',
    'share.wechat.tip': '微信扫码或复制链接发送给朋友',
    'share.copied': '✅ 分享文案已复制到剪贴板',
    'sponsor.label': '赞助内容 · Sponsored',
    'sponsor.fallback.t': '想在这里展示你的产品？',
    'sponsor.fallback.d': '面向设计/开发者人群，CPM $3-$8，无中间商抽佣。',
    'sponsor.fallback.cta': '联系投放',
    'myworks.title': '我的作品',
    'myworks.subtitle': '本地保存的最近生成记录，下次打开还能翻到。',
    'myworks.empty': '还没有作品，去上方生成一张吧～',
    'myworks.download': '⬇ 下载',
    'myworks.delete': '🗑 删除',
    'community.nav': '社区',
    'community.title': '社区画廊',
    'community.hint': '用户分享的像素作品 · 点击看大图',
    'community.refresh': '刷新',
    'community.loading': '加载中…',
    'community.loadFail': '加载失败，请稍后重试',
    'community.empty': '还没有作品，去生成一张分享到社区吧！',
    'community.share': '🖼 分享到社区',
    'community.shared': '✅ 已分享到社区画廊！',
    'community.sharedShort': '已分享',
    'community.shareFail': '⚠️ 分享失败，请重试',
    'merch.btn': '📱 预览周边',
    'merch.title': '把头像变成专属周边',
    'merch.subtitle': '生成像素头像后，一键预览它印在手机壳、马克杯、T 恤、海报上的样子，还能保存效果图分享给朋友。',
    'merch.cta': '🎨 先生成头像',
    'merch.tab.phone': '手机壳', 'merch.tab.mug': '马克杯', 'merch.tab.tee': 'T 恤', 'merch.tab.poster': '海报',
    'merch.save': '⬇ 保存效果图', 'merch.order': '🛒 定制真机壳',
    'merch.orderSoon': '定制购买即将上线，先把效果图保存到相册分享给朋友吧～',
    'merch.tip': '创意预览 · 实际产品以成品为准',
    'merch.example.t': '先看看效果',
    'merch.example.d': '你的头像印在手机壳上，是不是很有感觉？生成一张就能预览同款。',
    'ctrl.mode': '模式',
    'mode.normal': '标准',
    'mode.perler': '🧩 拼豆',
    'perler.btn': '🧩 拼豆图纸',
    'perler.list': '🧮 用豆清单',
    'perler.grid': '▦ 网格',
    'perler.grid.on': '网格 开',
    'perler.grid.off': '网格 关',
    'perler.title': '拼豆图纸',
    'perler.patternTip': '每格 = 1 颗豆，照着 pegboard 摆即可 · 可下载打印',
    'perler.save': '⬇ 下载图纸',
    'perler.listTitle': '用豆清单',
    'perler.listTip': '照着清单买对应颜色的豆，数量已帮你数好',
    'perler.download': '⬇ 下载清单 (CSV)',
    'perler.close': '关闭',
    'perler.paletteNote': '色值按 Perler / Hama 近似色卡匹配，实际请以你手头豆色为准',
    'perler.show.title': '拼豆适合什么照片？',
    'perler.show.subtitle': '不只大头贴——宠物、动漫、Logo 都能拼。主体越大、颜色越干净，效果越好。',
    'perler.show.avatar': '👤 头像 / 大头贴',
    'perler.show.avatar.d': '正面、纯色背景最佳',
    'perler.show.pet': '🐱 宠物',
    'perler.show.pet.d': '猫狗辨识度高，超受欢迎',
    'perler.show.anime': '🎮 动漫 / 角色',
    'perler.show.anime.d': '线条清晰，天生适合拼豆',
    'perler.show.cta': '🧩 试试拼豆模式'
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
    'style.vintage': 'Vintage', 'style.thermal': 'Thermal',
    'style.neon.desc': 'High-sat blocks · cyber edge',
    'style.pop.desc': 'Flat blocks · poster feel', 'style.cyber.desc': 'Cool neon + CRT scanlines',
    'style.vintage.desc': 'Nostalgic sepia tone', 'style.thermal.desc': 'Infrared gradient · tech',
    'how.title': 'Three steps to pixel', 'how.subtitle': 'No tech skills needed — just open the page.',
    'how.s1.t': 'Upload', 'how.s1.d': 'Drag or click to pick a local image, preview instantly.',
    'how.s2.t': 'Pick a style', 'how.s2.d': 'Switch among 6 styles and tune density & colors.',
    'how.s3.t': 'Download', 'how.s3.d': 'Export to PNG / JPEG / WEBP anytime.',
    'features.title': 'Why PixelCut', 'features.subtitle': 'Simple, safe, free — no catch.',
    'feat.privacy.t': 'Privacy first', 'feat.privacy.d': 'All processing is local. Your photo never leaves the device.',
    'feat.free.t': 'Completely free', 'feat.free.d': 'Zero cost, zero deps, no API key — just open and use.',
    'feat.fast.t': 'Instant', 'feat.fast.d': 'Pure Canvas math, no waiting on a server.',
    'feat.styles.t': 'Rich styles', 'feat.styles.d': 'Original, neon, pop, cyberpunk, vintage & thermal — all included.',
    'footer.note': 'A pure front-end pixel art tool · images are processed locally, never uploaded.',
    'upload.text.html': 'Drag an image here, or <span class="link">click to choose</span>',
    'download': '⬇ Download',
    'btn.clean': '💎 Download clean (no watermark) · Free',
    'btn.clean.unlocked': '✨ Download clean (unlocked)',
    'paid.welcome': '✨ Thanks for supporting! Clean download unlocked in this browser.',
    'status.loaded': 'Loaded. Click "Generate" to start.',
    'status.loading': 'Generating…',
    'status.done': '✅ Done: {dims} pixels · {style} · {colors} color steps',
    'status.donePerler': '✅ Done: {dims} beads · {style} · {colors} color steps',
    'status.fail': '❌ Failed: ',
    'share.text': 'Turned my photo into pixel art with PixelCut Studio 🎨 6 styles, free👉 ',
    'share.title': 'Share with friends',
    'share.twitter': 'X / Twitter',
    'share.facebook': 'Facebook',
    'share.linkedin': 'LinkedIn',
    'share.pinterest': 'Pinterest',
    'share.weibo': 'Weibo',
    'share.wechat': 'WeChat',
    'share.tiktok': 'TikTok',
    'share.copy': 'Copy link',
    'share.wechat.tip': 'Scan or copy the link to share on WeChat',
    'share.copied': '✅ Share text copied to clipboard',
    'sponsor.label': 'Sponsored',
    'sponsor.fallback.t': 'Want to show your product here?',
    'sponsor.fallback.d': 'Reach designers & devs. CPM $3–$8, no middleman.',
    'sponsor.fallback.cta': 'Book ad slot',
    'myworks.title': 'My works',
    'myworks.subtitle': 'Your recent generations, saved locally — come back anytime.',
    'myworks.empty': 'No works yet — generate one above!',
    'myworks.download': '⬇ Download',
    'myworks.delete': '🗑 Delete',
    'community.nav': 'Community',
    'community.title': 'Community Gallery',
    'community.hint': 'Pixel art shared by users · click to enlarge',
    'community.refresh': 'Refresh',
    'community.loading': 'Loading…',
    'community.loadFail': 'Failed to load. Try again later.',
    'community.empty': 'No works yet — generate one and share it!',
    'community.share': '🖼 Share to Community',
    'community.shared': '✅ Shared to the community gallery!',
    'community.sharedShort': 'Shared',
    'community.shareFail': '⚠️ Share failed. Try again.',
    'merch.btn': '📱 Preview merch',
    'merch.title': 'Turn your avatar into merch',
    'merch.subtitle': 'After generating, preview your pixel avatar printed on a phone case, mug, T-shirt or poster — and save the mockup to share.',
    'merch.cta': '🎨 Generate first',
    'merch.tab.phone': 'Phone case', 'merch.tab.mug': 'Mug', 'merch.tab.tee': 'T-shirt', 'merch.tab.poster': 'Poster',
    'merch.save': '⬇ Save mockup', 'merch.order': '🛒 Order real product',
    'merch.orderSoon': 'Ordering is coming soon — save the mockup to your album and share it with friends for now!',
    'merch.tip': 'Creative preview · actual product may vary',
    'merch.example.t': 'See the idea first',
    'merch.example.d': 'Your avatar on a phone case — pretty cool, right? Generate one to preview the same.',
    'ctrl.mode': 'Mode',
    'mode.normal': 'Normal',
    'mode.perler': '🧩 Beads',
    'perler.btn': '🧩 Bead pattern',
    'perler.list': '🧮 Bead list',
    'perler.grid': '▦ Grid',
    'perler.grid.on': 'Grid On',
    'perler.grid.off': 'Grid Off',
    'perler.title': 'Bead pattern',
    'perler.patternTip': 'Each cell = 1 bead · place on a pegboard · download to print',
    'perler.save': '⬇ Download pattern',
    'perler.listTitle': 'Bead list',
    'perler.listTip': 'Buy beads by these colors — counts are pre-counted',
    'perler.download': '⬇ Download list (CSV)',
    'perler.close': 'Close',
    'perler.paletteNote': 'Colors matched to approximate Perler / Hama palette; verify against your actual beads',
    'perler.show.title': 'What photos work for beads?',
    'perler.show.subtitle': 'Not just selfies — pets, anime, logos all work. Bigger subject and cleaner colors = better result.',
    'perler.show.avatar': '👤 Avatar / portrait',
    'perler.show.avatar.d': 'Front-facing, plain background is best',
    'perler.show.pet': '🐱 Pets',
    'perler.show.pet.d': 'Cats & dogs read well, very popular',
    'perler.show.anime': '🎮 Anime / character',
    'perler.show.anime.d': 'Clean lines, born for beads',
    'perler.show.cta': '🧩 Try bead mode'
  }
};

const STYLE_NAMES = {
  original:{ zh: '📷 原图', en: '📷 Original' },
  neon:    { zh: '🌈 霓虹肖像', en: '🌈 Neon' },
  pop:     { zh: '🎨 波普艺术', en: '🎨 Pop' },
  cyber:   { zh: '🤖 赛博朋克', en: '🤖 Cyberpunk' },
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
  const sg = $('shareGalleryBtn');
  if (sg) { sg.disabled = false; sg.textContent = t('community.share'); }

  // 让 UI 先刷新再执行（避免卡顿假死）
  setTimeout(() => {
    try {
      const density = Math.max(1, Math.floor(parseInt(densitySel.value, 10) || 64));
      const scale = Math.max(1, Math.floor(parseInt(scaleSlider.value, 10) || 8));
      const colorCount = Math.max(2, Math.floor(parseInt(colorsSlider.value, 10) || 8));
      const withOutline = outlineChk.checked;
      const style = styleSel.value;
      const saturation = Math.max(0, parseInt(satSlider.value, 10) || 100) / 100;
      const contrast = Math.max(0, parseInt(conSlider.value, 10) || 100) / 100;
      lastScale = scale;

      // 拼豆模式：先中心裁剪为正方形（拼豆板是方的），再生成
      let workImg = sourceImage;
      if (perlerMode) {
        const srcW = Math.floor(sourceImage.width || 1), srcH = Math.floor(sourceImage.height || 1);
        const s = Math.min(srcW, srcH);
        const cx = Math.floor((srcW - s) / 2), cy = Math.floor((srcH - s) / 2);
        const sq = document.createElement('canvas');
        sq.width = s; sq.height = s;
        sq.getContext('2d').drawImage(sourceImage, cx, cy, s, s, 0, 0, s, s);
        workImg = sq;
      }

      const out = pixelize(workImg, density, scale, colorCount, withOutline, style, saturation, contrast, perlerMode, perlerMode ? PERLER_PALETTE : null);

      outCanvas.width = out.width;
      outCanvas.height = out.height;
      outCanvas.getContext('2d').putImageData(out, 0, 0);

      // 拼豆模式：启用图纸/清单/网格按钮并叠加 pegboard 网格
      if (perlerMode) {
        perlerBtn.disabled = false;
        beadListBtn.disabled = false;
        pegGridBtn.disabled = false;
        pegGridBtn.textContent = t('perler.grid.on');
        pegGridBtn.classList.add('is-active');
        drawPegGrid();
      } else {
        perlerBtn.disabled = true;
        beadListBtn.disabled = true;
        pegGridBtn.disabled = true;
      }

      downloadBtn.disabled = false;
      downloadBtn.dataset.ready = '1';
      cleanDownloadBtn.disabled = false;
      if (merchBtn) merchBtn.disabled = false;
      const dims = perlerMode ? (density + '×' + density) : (out.width + '×' + out.height);
      const styleLabel = (STYLE_NAMES[style] && STYLE_NAMES[style][currentLang]) || style;
      statusEl.textContent = t(perlerMode ? 'status.donePerler' : 'status.done')
        .replace('{dims}', dims)
        .replace('{style}', styleLabel)
        .replace('{colors}', colorCount);

      // 保存到本地作品历史
      saveWork(style, styleLabel);

      // 渲染「下一步推荐」联盟卡片（仅当 ID 已替换）
      renderAffiliateCard(style);
    } catch (err) {
      statusEl.textContent = t('status.fail') + err.message;
    } finally {
      generateBtn.disabled = false;
    }
  }, 30);
}

// 渲染联盟卡片：用户生成完成 → 按当前语言推荐 淘宝 / AppSumo
function renderAffiliateCard(style) {
  const slot = $('affiliateSlot');
  if (!slot) return;
  const isZh = currentLang === 'zh';
  let url, badge, title, text, cta, icon, affKey;
  if (isZh) {
    const kw = perlerMode ? '拼豆 融豆 材料包 29板 透明板 基础板' : (TAOBAO_STYLE_KEYWORDS[style] || '像素风插画定制');
    url = buildTaobaoUrl(kw);
    badge = '推荐 · 淘宝';
    title = '想进阶创作？';
    text = '淘宝上找插画师做同款周边 / 定制';
    cta = '去淘宝看看 ›';
    icon = '🛒';
    affKey = 'taobao:' + kw;
  } else {
    const slug = APPSUMO_STYLE_SLUGS[style] || 'canva';
    url = buildAppSumoUrl(slug);
    badge = 'Recommended · AppSumo';
    title = 'Level up your art?';
    text = 'Find design tools & lifetime deals on AppSumo';
    cta = 'Explore AppSumo ›';
    icon = '🚀';
    affKey = 'appsumo:' + slug;
  }
  slot.innerHTML = `
    <div class="affiliate-card">
      <span class="affiliate-card__badge">${badge}</span>
      <div class="affiliate-card__body">
        <span class="affiliate-card__icon" aria-hidden="true">${icon}</span>
        <div class="affiliate-card__text">
          <strong>${title}</strong>
          <span>${text}</span>
        </div>
        <a class="btn btn--primary btn--sm"
           href="${url}"
           target="_blank"
           rel="sponsored noopener"
           data-affiliate="result"
           data-aff-query="${affKey}">
           ${cta}
        </a>
      </div>
    </div>
  `;
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

// 加载页脚联盟横条（始终展示，按语言分流 淘宝 / AppSumo）
function renderFooterAffiliateBar() {
  const slot = $('footerAffiliateBar');
  if (!slot) return;
  const isZh = currentLang === 'zh';
  let url, text, cta, affKey;
  if (isZh) {
    url = buildTaobaoUrl('像素风周边定制');
    text = '把这张头像做成贴纸 / T恤 / 手机壳？';
    cta = '去淘宝找定制 ›';
    affKey = 'taobao:merch';
  } else {
    url = buildAppSumoUrl('design');
    text = 'Turn this into stickers, tees & merch on AppSumo';
    cta = 'Explore AppSumo ›';
    affKey = 'appsumo:merch';
  }
  slot.innerHTML = `
    <div class="aff-bar">
      <span class="aff-bar__dot"></span>
      <span class="aff-bar__text">
        <strong>${text}</strong>
      </span>
      <a class="aff-bar__cta"
         href="${url}"
         target="_blank"
         rel="sponsored noopener"
         data-affiliate="footer"
         data-aff-query="${affKey}">${cta}</a>
    </div>
  `;
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

function pixelize(img, density, scale, colorCount, withOutline, style, saturation, contrast, perler, palette) {
  // 防御性整数化：Canvas API 要求整数宽高，浮点会报 "Value is not of type 'long'"
  density = Math.max(1, Math.floor(+density || 64));
  scale = Math.max(1, Math.floor(+scale || 8));
  colorCount = Math.max(2, Math.floor(+colorCount || 8));

  // 1) 计算降采样目标尺寸（保持比例，density 为长边像素数）
  let tw = Math.floor(img.width || 1), th = Math.floor(img.height || 1);
  if (tw >= th) { th = Math.max(1, Math.round(th * density / tw)); tw = density; }
  else { tw = Math.max(1, Math.round(tw * density / th)); th = density; }
  tw = Math.max(1, Math.floor(tw));
  th = Math.max(1, Math.floor(th));

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

  // 4.5) 拼豆模式：把每个像素吸附到真实豆色卡，并统计「用豆清单」
  if (perler && palette) {
    const rgbPal = palette.map(p => p.rgb);
    const counts = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = nearestColor([data[i], data[i + 1], data[i + 2]], rgbPal);
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
      const key = (r << 16) | (g << 8) | b;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    perlerBeadList = [...counts.entries()].map(([key, c]) => {
      const r = (key >> 16) & 255, g = (key >> 8) & 255, b = key & 255;
      const p = palette.find(p => p.rgb[0] === r && p.rgb[1] === g && p.rgb[2] === b) || { name: '自定义', hex: rgbToHex(r, g, b) };
      return { hex: p.hex, name: p.name, count: c };
    }).sort((a, b) => b.count - a.count);
  }

  // 5) 无平滑放大到显示分辨率
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.floor(tw * scale));
  out.height = Math.max(1, Math.floor(th * scale));
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false; // 关键：保持锐利像素块
  const tmp = document.createElement('canvas');
  tmp.width = tw; tmp.height = th;
  tmp.getContext('2d').putImageData(imgData, 0, 0);
  if (perler) perlerSmallCanvas = tmp; // 保存 1 像素=1 豆 的小图，供拼豆图纸/清单使用
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
    case 'original': {
      // 原图像素：从图片本身颜色提取调色板，保留真实色彩（最适合拼豆）
      const palette = medianCutPalette(data, colorCount);
      mapToPalette(data, palette);
      break;
    }
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
const WATERMARK_SITE = 'pixelcut-studio.pages.dev';
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

// ---------- 干净版下载（Stripe Payment Links，无后端）----------
// 用户从 Stripe 后台创建一个 $0.99 的 Payment Link，并在「支付完成后跳转地址」里配置：
//   https://pixelcut-studio.pages.dev/?paid=1
// 把链接粘到下面 STRIPE_PAYMENT_LINK 即可启用。
const STRIPE_PAYMENT_LINK = ''; // 已关闭：Stripe 账号国家/地区合规问题，付费下载暂下线，干净版改为免费
const CLEAN_UNLOCK_KEY = 'pixelcut_clean_unlocked';

// 直接导出干净版（不加水印）
function cleanDownload() {
  if (outCanvas.width === 0) return;
  const type = formatSel.value;
  const ext = formatSel.selectedOptions[0].getAttribute('data-ext') || 'png';
  const quality = type === 'image/png' ? undefined : 0.95;
  const dataUrl = outCanvas.toDataURL(type, quality);
  const link = document.createElement('a');
  link.download = 'pixel-avatar-clean.' + ext;
  link.href = dataUrl;
  link.click();
}

// 检测是否已解锁干净版下载（URL ?paid=1 或 localStorage）
function detectCleanUnlock() {
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('paid') === '1') {
      localStorage.setItem(CLEAN_UNLOCK_KEY, '1');
      // 清除 URL 参数，保持地址栏干净
      u.searchParams.delete('paid');
      const clean = u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash;
      history.replaceState({}, '', clean);
      // 在状态区显示欢迎
      const st = $('status');
      if (st) st.textContent = t('paid.welcome');
      return true;
    }
  } catch (e) {}
  return localStorage.getItem(CLEAN_UNLOCK_KEY) === '1';
}

function applyCleanUnlockedUI() {
  if (!detectCleanUnlock()) return;
  if (!cleanDownloadBtn) return;
  cleanDownloadBtn.textContent = t('btn.clean.unlocked');
  cleanDownloadBtn.dataset.unlocked = '1';
  // 顶部浮窗提示（无论有没有图都看得到）
  showPaidToast();
}

function showPaidToast() {
  // 避免重复叠加（同一会话多次跳转）
  if (document.querySelector('.paid-toast')) return;
  const el = document.createElement('div');
  el.className = 'paid-toast';
  el.textContent = t('paid.welcome');
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('paid-toast--visible'));
  setTimeout(() => {
    el.classList.remove('paid-toast--visible');
    setTimeout(() => el.remove(), 400);
  }, 4500);
}

// 打开 Stripe 支付（新标签页，避免丢失当前生成的图）
function openStripeCheckout() {
  if (!STRIPE_PAYMENT_LINK) {
    statusEl.textContent = '⚠️ 支付链接未配置，请联系站长。';
    return;
  }
  window.open(STRIPE_PAYMENT_LINK, '_blank', 'noopener');
}

// ---------- 事件绑定 ----------
generateBtn.addEventListener('click', generate);
downloadBtn.addEventListener('click', download);
cleanDownloadBtn.addEventListener('click', () => { cleanDownload(); });
applyCleanUnlockedUI();

// ---------- 分享面板（多平台） ----------
const shareBtn = $('shareBtn');
const sharePanel = $('sharePanel');
const shareBackdrop = $('shareBackdrop');
const sharePanelClose = $('sharePanelClose');
const shareWechat = $('shareWechat');
const shareWechatQr = $('shareWechatQr');

const OG_IMAGE = 'https://pixelcut-studio.pages.dev/assets/og-cover.svg';

function getShareText() { return t('share.text') + ' ' + location.href; }

function openSharePanel() {
  if (sharePanel) {
    sharePanel.hidden = false;
    if (shareBackdrop) shareBackdrop.hidden = false;
    if (shareWechat) shareWechat.hidden = true;
    if (shareWechatQr) shareWechatQr.src = '';
  }
}
function closeSharePanel() {
  if (sharePanel) sharePanel.hidden = true;
  if (shareBackdrop) shareBackdrop.hidden = true;
}

shareBtn.addEventListener('click', openSharePanel);
if (sharePanelClose) sharePanelClose.addEventListener('click', closeSharePanel);
if (shareBackdrop) shareBackdrop.addEventListener('click', closeSharePanel);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSharePanel(); });

document.querySelectorAll('.share-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const platform = e.currentTarget.getAttribute('data-platform');
    if (platform) handleShare(platform);
  });
});

function handleShare(platform) {
  const url = location.href;
  const text = t('share.text');
  switch (platform) {
    case 'twitter':
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      break;
    case 'facebook':
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      break;
    case 'linkedin':
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      break;
    case 'pinterest':
      window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(OG_IMAGE)}&description=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      break;
    case 'weibo':
      window.open(`https://service.weibo.com/share/share.php?title=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      break;
    case 'wechat':
      if (shareWechat && shareWechatQr) {
        shareWechat.hidden = false;
        shareWechatQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
      }
      break;
    case 'copy':
    case 'copy-wechat':
      copyToClipboard(url);
      break;
    case 'tiktok':
      copyToClipboard(`PixelCut Studio 🎨 Turn photos into 8-bit pixel art. Free, no upload. Check it out: ${url} #pixelart #8bit #ai #pixelcutstudio`);
      break;
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      statusEl.textContent = t('share.copied');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
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
  original:{ d: '64', c: 8,  sat: 100, con: 100, out: false },
  neon:    { d: '64', c: 8,  sat: 180, con: 130, out: false },
  pop:     { d: '64', c: 5,  sat: 160, con: 140, out: false },
  cyber:   { d: '64', c: 8,  sat: 170, con: 140, out: false },
  vintage: { d: '96', c: 12, sat: 120, con: 115, out: false },
  thermal: { d: '64', c: 12, sat: 100, con: 130, out: false },
};
styleSel.addEventListener('change', () => {
  const r = STYLE_PRESETS[styleSel.value] || {};
  // 拼豆模式密度由专属档位（16/24/29/32/48）控制，不能被标准预设（如 64）覆盖，否则下拉被塞非法值而显示错乱
  if (!perlerMode && r.d) densitySel.value = r.d;
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
// 仅翻译某个元素内部带 data-i18n / data-i18n-html 的节点（避免全页 applyLang 递归）
function localizeElement(el) {
  if (!el) return;
  el.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.getAttribute('data-i18n'));
  });
  el.querySelectorAll('[data-i18n-html]').forEach((node) => {
    node.innerHTML = t(node.getAttribute('data-i18n-html'));
  });
}

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
  renderFooterAffiliateBar();
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

// ===== 本地作品历史（localStorage，纯前端零成本） =====
const WORKS_KEY = 'pixelcut_works';
const MAX_WORKS = 12;

function makeThumb(canvas, maxW) {
  const ratio = canvas.width / canvas.height;
  const w = Math.min(maxW, canvas.width);
  const h = Math.round(w / ratio);
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  tmp.getContext('2d').drawImage(canvas, 0, 0, w, h);
  return tmp.toDataURL('image/png');
}

function loadWorks() {
  try { return JSON.parse(localStorage.getItem(WORKS_KEY)) || []; }
  catch (e) { return []; }
}

function saveWork(styleKey, styleLabel) {
  try {
    const thumb = makeThumb(outCanvas, 240);
    const works = loadWorks();
    works.unshift({ src: thumb, style: styleLabel || styleKey, ts: Date.now() });
    while (works.length > MAX_WORKS) works.pop();
    localStorage.setItem(WORKS_KEY, JSON.stringify(works));
    renderWorks();
  } catch (e) { /* localStorage 满或被禁用时静默跳过 */ }
}

function renderWorks() {
  const grid = $('myworksGrid');
  const empty = $('myworksEmpty');
  if (!grid) return;
  const works = loadWorks();
  grid.innerHTML = '';
  if (!works.length) { if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  works.forEach((w) => {
    const card = document.createElement('button');
    card.className = 'work-card';
    card.type = 'button';
    card.innerHTML = '<img src="' + w.src + '" alt="work" loading="lazy" />' +
      '<span class="work-card__meta">' + (w.style || '') + ' · ' + new Date(w.ts).toLocaleDateString() + '</span>';
    card.addEventListener('click', () => openWork(w));
    grid.appendChild(card);
  });
}

let activeWork = null;
function openWork(w) {
  activeWork = w;
  const modal = $('workModal');
  const img = $('workModalImg');
  const dl = $('workDownload');
  if (img) img.src = w.src;
  if (dl) dl.href = w.src;
  if (modal) modal.hidden = false;
  if ($('workBackdrop')) $('workBackdrop').hidden = false;
}
function closeWork() {
  if ($('workModal')) $('workModal').hidden = true;
  if ($('workBackdrop')) $('workBackdrop').hidden = true;
  activeWork = null;
}
function deleteWork() {
  if (!activeWork) return;
  const works = loadWorks().filter((w) => w.ts !== activeWork.ts);
  try { localStorage.setItem(WORKS_KEY, JSON.stringify(works)); } catch (e) {}
  closeWork();
  renderWorks();
}

const workModalClose = $('workModalClose');
const workDeleteBtn = $('workDelete');
const workBackdropEl = $('workBackdrop');
if (workModalClose) workModalClose.addEventListener('click', closeWork);
if (workDeleteBtn) workDeleteBtn.addEventListener('click', deleteWork);
if (workBackdropEl) workBackdropEl.addEventListener('click', closeWork);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeWork(); });

// ===== PWA：注册 Service Worker（支持离线打开 + 可安装到主屏） =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

// 首次加载渲染作品画廊
renderWorks();

// ===== 社区画廊（Netlify Functions + Blobs 后端） =====
const communityBtn = $('communityBtn');
const communityModal = $('communityModal');
const communityBackdrop = $('communityBackdrop');
const communityClose = $('communityClose');
const communityRefresh = $('communityRefresh');
const communityGrid = $('communityGrid');
const communityEmpty = $('communityEmpty');
const communityLightbox = $('communityLightbox');
const communityLightboxClose = $('communityLightboxClose');
const communityLightboxImg = $('communityLightboxImg');
const shareGalleryBtn = $('shareGalleryBtn');

function openCommunity() {
  if (!communityModal) return;
  communityModal.hidden = false;
  if (communityBackdrop) communityBackdrop.hidden = false;
  localizeElement(communityModal);
  loadCommunity();
}
function closeCommunity() {
  if (communityModal) communityModal.hidden = true;
  if (communityBackdrop) communityBackdrop.hidden = true;
  if (communityLightbox) communityLightbox.hidden = true;
}

async function shareToGallery() {
  const out = outCanvas;
  if (!out || !out.width) return;
  if (shareGalleryBtn) shareGalleryBtn.disabled = true;
  statusEl.textContent = t('community.loading');
  try {
    const thumb = makeThumb(out, 360);
    const style = styleSel ? styleSel.value : 'unknown';
    const res = await fetch('/api/gallery-submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: thumb, style: style, caption: '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.ok) {
      statusEl.textContent = t('community.shared');
      if (shareGalleryBtn) shareGalleryBtn.textContent = '✅ ' + t('community.sharedShort');
    } else {
      statusEl.textContent = t('community.shareFail');
      if (shareGalleryBtn) shareGalleryBtn.disabled = false;
    }
  } catch (e) {
    statusEl.textContent = t('community.shareFail');
    if (shareGalleryBtn) shareGalleryBtn.disabled = false;
  }
}

async function loadCommunity() {
  if (!communityGrid) return;
  communityGrid.innerHTML = '<p class="community__loading">' + t('community.loading') + '</p>';
  if (communityEmpty) communityEmpty.hidden = true;
  try {
    const res = await fetch('/api/gallery-list');
    const data = await res.json().catch(() => ({ items: [] }));
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      communityGrid.innerHTML = '';
      if (communityEmpty) communityEmpty.hidden = false;
      return;
    }
    communityGrid.innerHTML = '';
    items.forEach((it) => {
      const btn = document.createElement('button');
      btn.className = 'community__item';
      btn.type = 'button';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = '/api/gallery-image?id=' + encodeURIComponent(it.id);
      img.alt = (it.style || 'pixel') + ' pixel art';
      btn.appendChild(img);
      const cap = document.createElement('span');
      cap.className = 'community__cap';
      const sn = (STYLE_NAMES[it.style] && STYLE_NAMES[it.style][currentLang]) || it.style || '';
      cap.textContent = sn + (it.caption ? ' · ' + it.caption : '');
      btn.appendChild(cap);
      btn.addEventListener('click', () => openCommunityLightbox(it.id));
      communityGrid.appendChild(btn);
    });
  } catch (e) {
    communityGrid.innerHTML = '<p class="community__loading">' + t('community.loadFail') + '</p>';
  }
}

function openCommunityLightbox(id) {
  if (!communityLightbox || !communityLightboxImg) return;
  communityLightboxImg.src = '/api/gallery-image?id=' + encodeURIComponent(id);
  communityLightbox.hidden = false;
}
function closeCommunityLightbox() {
  if (communityLightbox) communityLightbox.hidden = true;
}

if (communityBtn) communityBtn.addEventListener('click', openCommunity);
if (communityClose) communityClose.addEventListener('click', closeCommunity);
if (communityBackdrop) communityBackdrop.addEventListener('click', closeCommunity);
if (communityRefresh) communityRefresh.addEventListener('click', loadCommunity);
if (shareGalleryBtn) shareGalleryBtn.addEventListener('click', shareToGallery);
if (communityLightboxClose) communityLightboxClose.addEventListener('click', closeCommunityLightbox);
if (communityLightbox) communityLightbox.addEventListener('click', (e) => { if (e.target === communityLightbox) closeCommunityLightbox(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeCommunity(); closeCommunityLightbox(); }
});

// ---------- 周边预览（手机壳 / 马克杯 / T恤 / 海报）----------
// 把当前像素头像用 Canvas 程序化合成到各类产品 mockup 上，供用户预览 + 保存分享。
// 接入真实购买：把 MERCH_STORE_URL 填成 Printful / 自有店铺链接即可启用「定制真机壳」按钮。
const MERCH_STORE_URL = '';
let currentMerchType = 'phone';

const merchModal = $('merchModal');
const merchBackdrop = $('merchBackdrop');
const merchClose = $('merchClose');
const merchCanvas = $('merchCanvas');
const merchSave = $('merchSave');
const merchOrder = $('merchOrder');
const merchTabs = Array.from(document.querySelectorAll('.merch__tab'));

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 以 cover 方式把图像绘制进目标矩形（保持比例、居中裁剪）
function coverDraw(ctx, img, dx, dy, dw, dh) {
  const iw = img.width || img.naturalWidth || dw;
  const ih = img.height || img.naturalHeight || dh;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale, sh = dh / scale;
  const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawMerch(type) {
  if (!merchCanvas) return;
  const ctx = merchCanvas.getContext('2d');
  const S = 600;
  ctx.clearRect(0, 0, S, S);
  const avatar = outCanvas;
  if (!avatar || !avatar.width) return;

  if (type === 'phone') {
    const mx = 175, my = 40, mw = 250, mh = 520, mr = 40;
    const grad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    grad.addColorStop(0, '#ff2e93'); grad.addColorStop(1, '#7a2bff');
    roundRect(ctx, mx, my, mw, mh, mr);
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
    // 摄像头模组（左上）
    roundRect(ctx, mx + 22, my + 22, 66, 66, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    [[mx+41,my+41],[mx+79,my+41],[mx+41,my+79]].forEach(([cx,cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fillStyle = '#1b1d2a'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx-3, cy-3, 4, 0, Math.PI*2); ctx.fillStyle = 'rgba(120,200,255,0.9)'; ctx.fill();
    });
    // 头像区（避开摄像头，居中偏下）
    const ax = mx + 18, ay = my + 150, aw = mw - 36, ah = mh - 178;
    roundRect(ctx, ax, ay, aw, ah, 18);
    ctx.save(); ctx.clip();
    coverDraw(ctx, avatar, ax, ay, aw, ah);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 22px Inter, "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PixelCut', mx + mw/2, my + mh - 26);
  } else if (type === 'mug') {
    const mx = 175, my = 130, mw = 230, mh = 320, mr = 18;
    const grad = ctx.createLinearGradient(mx, my, mx, my + mh);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#eef1f6');
    roundRect(ctx, mx, my, mw, mh, mr);
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,22,40,0.18)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(mx + mw/2, my, mw/2, 16, 0, 0, Math.PI*2); ctx.fillStyle = '#d6dae3'; ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mw + 6, my + mh/2 - 10, 46, -Math.PI/2, Math.PI/2);
    ctx.lineWidth = 18; ctx.strokeStyle = '#eef1f6'; ctx.stroke();
    const ax = mx + 22, ay = my + 30, aw = mw - 44, ah = mh - 64;
    roundRect(ctx, ax, ay, aw, ah, 10);
    ctx.save(); ctx.clip();
    coverDraw(ctx, avatar, ax, ay, aw, ah);
    ctx.restore();
  } else if (type === 'tee') {
    const cx = 300, top = 120, w = 300, h = 380;
    ctx.beginPath();
    ctx.moveTo(cx - 60, top + 50);
    ctx.lineTo(cx - w/2, top + 90);
    ctx.lineTo(cx - w/2 + 20, top + 150);
    ctx.lineTo(cx - 90, top + 130);
    ctx.lineTo(cx - 90, top + h);
    ctx.lineTo(cx + 90, top + h);
    ctx.lineTo(cx + 90, top + 130);
    ctx.lineTo(cx + w/2 - 20, top + 150);
    ctx.lineTo(cx + w/2, top + 90);
    ctx.lineTo(cx + 60, top + 50);
    ctx.quadraticCurveTo(cx, top + 95, cx - 60, top + 50);
    ctx.closePath();
    ctx.fillStyle = '#2b2e3c'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 60, top + 50);
    ctx.quadraticCurveTo(cx, top + 95, cx + 60, top + 50);
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
    const ax = cx - 80, ay = top + 120, aw = 160, ah = 160;
    roundRect(ctx, ax, ay, aw, ah, 12);
    ctx.save(); ctx.clip();
    coverDraw(ctx, avatar, ax, ay, aw, ah);
    ctx.restore();
  } else if (type === 'poster') {
    const fx = 130, fy = 60, fw = 340, fh = 470, fr = 8;
    roundRect(ctx, fx, fy, fw, fh, fr);
    ctx.fillStyle = '#0b0d1a'; ctx.fill();
    ctx.lineWidth = 10; ctx.strokeStyle = '#ff2e93'; ctx.stroke();
    const ax = fx + 24, ay = fy + 24, aw = fw - 48, ah = 300;
    roundRect(ctx, ax, ay, aw, ah, 4);
    ctx.save(); ctx.clip();
    coverDraw(ctx, avatar, ax, ay, aw, ah);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 20px Inter, "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PixelCut · 你的像素头像', fx + fw/2, fy + fh - 28);
  }
}

function openMerch() {
  if (!outCanvas || !outCanvas.width) {
    if (statusEl) statusEl.textContent = '⚠️ ' + t('merch.cta') + ' / ' + (I18N[currentLang].merch ? '请先生成像素头像' : 'generate first');
    return;
  }
  if (merchModal) { merchModal.hidden = false; localizeElement(merchModal); }
  if (merchBackdrop) merchBackdrop.hidden = false;
  currentMerchType = 'phone';
  merchTabs.forEach(b => b.classList.toggle('is-active', b.dataset.merch === 'phone'));
  drawMerch('phone');
}
function closeMerch() {
  if (merchModal) merchModal.hidden = true;
  if (merchBackdrop) merchBackdrop.hidden = true;
}

if (merchBtn) merchBtn.addEventListener('click', openMerch);
if (merchClose) merchClose.addEventListener('click', closeMerch);
if (merchBackdrop) merchBackdrop.addEventListener('click', closeMerch);
merchTabs.forEach(b => b.addEventListener('click', () => {
  currentMerchType = b.dataset.merch;
  merchTabs.forEach(x => x.classList.toggle('is-active', x === b));
  drawMerch(currentMerchType);
}));
if (merchSave) merchSave.addEventListener('click', () => {
  if (!merchCanvas) return;
  const link = document.createElement('a');
  link.download = 'pixelcut-merch-' + currentMerchType + '.png';
  link.href = merchCanvas.toDataURL('image/png');
  link.click();
});
if (merchOrder) merchOrder.addEventListener('click', () => {
  if (MERCH_STORE_URL) {
    window.open(MERCH_STORE_URL, '_blank', 'noopener');
  } else {
    const tip = document.createElement('div');
    tip.className = 'paid-toast';
    tip.textContent = t('merch.orderSoon');
    document.body.appendChild(tip);
    requestAnimationFrame(() => tip.classList.add('paid-toast--visible'));
    setTimeout(() => { tip.classList.remove('paid-toast--visible'); setTimeout(() => tip.remove(), 400); }, 4500);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && merchModal && !merchModal.hidden) closeMerch();
});

// ================= 拼豆模式 (Perler / Hama fuse beads) =================
// 真实豆色卡（近似 Perler / Hama 常用色），用于吸附与清单。
const PERLER_PALETTE = [
  { name: '白 White',          hex: '#FFFFFF', rgb: [255, 255, 255] },
  { name: '浅灰 Light Gray',   hex: '#D3D3D3', rgb: [211, 211, 211] },
  { name: '银 Silver',         hex: '#C0C0C0', rgb: [192, 192, 192] },
  { name: '灰 Gray',           hex: '#808080', rgb: [128, 128, 128] },
  { name: '深灰 Dark Gray',    hex: '#404040', rgb: [ 64,  64,  64] },
  { name: '黑 Black',          hex: '#1A1A1A', rgb: [ 26,  26,  26] },
  { name: '红 Red',            hex: '#E4002B', rgb: [228,   0,  43] },
  { name: '酒红 Crimson',      hex: '#B80F3C', rgb: [184,  15,  60] },
  { name: '深红 Maroon',       hex: '#8B1A2B', rgb: [139,  26,  43] },
  { name: '粉 Pink',           hex: '#FF6EC7', rgb: [255, 110, 199] },
  { name: '浅粉 Light Pink',   hex: '#FFB6C1', rgb: [255, 182, 193] },
  { name: '橙 Orange',         hex: '#FF7900', rgb: [255, 121,   0] },
  { name: '桃 Peach',          hex: '#FFCBA4', rgb: [255, 203, 164] },
  { name: '黄 Yellow',         hex: '#FEE101', rgb: [254, 225,   1] },
  { name: '金 Gold',           hex: '#FFD700', rgb: [255, 215,   0] },
  { name: '浅黄 Cream',        hex: '#FFF3B0', rgb: [255, 243, 176] },
  { name: '绿 Green',          hex: '#00A650', rgb: [  0, 166,  80] },
  { name: '深绿 Forest',       hex: '#006B3F', rgb: [  0, 107,  63] },
  { name: '薄荷 Mint',         hex: '#9FE2BF', rgb: [159, 226, 191] },
  { name: '青柠 Lime',         hex: '#BFFF00', rgb: [191, 255,   0] },
  { name: '青 Turquoise',      hex: '#40E0D0', rgb: [ 64, 224, 208] },
  { name: '天青 Teal',         hex: '#008080', rgb: [  0, 128, 128] },
  { name: '蓝 Blue',           hex: '#0085CA', rgb: [  0, 133, 202] },
  { name: '浅蓝 Sky',          hex: '#87CEEB', rgb: [135, 206, 235] },
  { name: '藏青 Navy',         hex: '#1D2B5A', rgb: [ 29,  43,  90] },
  { name: '紫 Purple',         hex: '#7B2FBE', rgb: [123,  47, 190] },
  { name: '薰衣草 Lavender',   hex: '#B57EDC', rgb: [181, 126, 220] },
  { name: '品红 Magenta',      hex: '#FF00C8', rgb: [255,   0, 200] },
  { name: '棕 Brown',          hex: '#7B4B2A', rgb: [123,  75,  42] },
  { name: '浅棕 Tan',          hex: '#D2B48C', rgb: [210, 180, 140] },
  { name: '深棕 Dark Brown',   hex: '#5C3A21', rgb: [ 92,  58,  33] },
  { name: '肤色·浅 Light Skin',  hex: '#FFE0BD', rgb: [255, 224, 189] },
  { name: '肤色·中 Medium Skin', hex: '#E8B98C', rgb: [232, 185, 140] },
  { name: '肤色·深 Dark Skin',   hex: '#8D5524', rgb: [141,  85,  36] },
  { name: '肤色·深褐 Deep Skin', hex: '#5C3317', rgb: [ 92,  51,  23] },
];

const NORMAL_DENSITY = [['64', '64 × 64'], ['96', '96 × 96']];
const PERLER_DENSITY = [
  ['16', '16 × 16 · 钥匙扣'],
  ['24', '24 × 24 · 快速'],
  ['29', '29 × 29 · 一整板'],
  ['32', '32 × 32'],
  ['48', '48 × 48 · 四板'],
];

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

let perlerMode = false;
let perlerGridOn = true;
let lastScale = 8;
let perlerSmallCanvas = null;   // tw×th 小图（已吸附豆色）
let perlerBeadList = [];        // [{ hex, name, count }]

const modeSeg = $('modeSeg');
const pegOverlay = $('pegOverlay');
const perlerBtn = $('perlerBtn');
const beadListBtn = $('beadListBtn');
const pegGridBtn = $('pegGridBtn');

function buildDensityOptions(list, def) {
  densitySel.innerHTML = list.map(([v, l]) =>
    `<option value="${v}"${v === def ? ' selected' : ''}>${l}</option>`).join('');
}

function syncSliderLabels() {
  if (scaleVal) scaleVal.textContent = scaleSlider.value + '×';
  if (colorsVal) colorsVal.textContent = colorsSlider.value;
  if (satVal) satVal.textContent = satSlider.value + '%';
  if (conVal) conVal.textContent = conSlider.value + '%';
}

function applyMode() {
  const active = modeSeg && modeSeg.querySelector('.seg__btn.is-active');
  perlerMode = !!(active && active.dataset.mode === 'perler');
  if (perlerMode) {
    buildDensityOptions(PERLER_DENSITY, '29');
    if (pegOverlay) pegOverlay.hidden = !perlerGridOn;
    const hint = $('perlerHint'); if (hint) hint.hidden = false;
    // 拼豆默认推荐「原图」风格（最贴近真实颜色，适合摆豆）；但允许切换到其他风格，不再锁死
    if (styleSel) styleSel.disabled = false; // 保险：确保风格下拉始终可选
    if (styleSel && styleSel.value !== 'original') {
      styleSel.value = 'original';
      styleSel.dispatchEvent(new Event('change'));
    }
    // 已有结果则刷新网格与按钮状态（需确保是拼豆生成的结果）
    if (outCanvas && outCanvas.width && perlerSmallCanvas) {
      pegGridBtn.disabled = false;
      pegGridBtn.textContent = t('perler.grid.on');
      pegGridBtn.classList.add('is-active');
      perlerBtn.disabled = false;
      beadListBtn.disabled = false;
      drawPegGrid();
    } else {
      pegGridBtn.disabled = true;
      perlerBtn.disabled = true;
      beadListBtn.disabled = true;
    }
  } else {
    buildDensityOptions(NORMAL_DENSITY, '64');
    if (pegOverlay) pegOverlay.hidden = true;
    const hint = $('perlerHint'); if (hint) hint.hidden = true;
    pegGridBtn.disabled = true;
    pegGridBtn.classList.remove('is-active');
  }
}

if (modeSeg) modeSeg.querySelectorAll('.seg__btn').forEach(b => b.addEventListener('click', () => {
  modeSeg.querySelectorAll('.seg__btn').forEach(x => x.classList.remove('is-active'));
  b.classList.add('is-active');
  applyMode();
}));

// 把 pegboard 网格叠加到结果预览上（每格 = 1 颗豆）
function drawPegGrid() {
  if (!pegOverlay) return;
  if (!perlerMode || !perlerGridOn || !outCanvas.width || !perlerSmallCanvas) { pegOverlay.hidden = true; return; }
  const w = outCanvas.width, h = outCanvas.height, s = lastScale;
  pegOverlay.width = w; pegOverlay.height = h;
  pegOverlay.hidden = false;
  const c = pegOverlay.getContext('2d');
  c.clearRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.22)';
  c.lineWidth = 1;
  for (let x = 0; x <= w; x += s) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); c.stroke(); }
  for (let y = 0; y <= h; y += s) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); c.stroke(); }
  // 模拟 peg 孔位
  c.strokeStyle = 'rgba(0,0,0,0.18)';
  for (let y = s / 2; y < h; y += s) {
    for (let x = s / 2; x < w; x += s) {
      c.beginPath(); c.arc(x, y, Math.max(1, s * 0.16), 0, Math.PI * 2); c.stroke();
    }
  }
}

if (pegGridBtn) pegGridBtn.addEventListener('click', () => {
  perlerGridOn = !perlerGridOn;
  pegGridBtn.classList.toggle('is-active', perlerGridOn);
  pegGridBtn.textContent = perlerGridOn ? t('perler.grid.on') : t('perler.grid.off');
  drawPegGrid();
});

// ---------- 拼豆图纸弹窗 ----------
const perlerModal = $('perlerModal');
const perlerBackdrop = $('perlerBackdrop');
const perlerCanvas = $('perlerCanvas');
const perlerSave = $('perlerSave');

function drawPerlerPattern() {
  if (!perlerSmallCanvas || !perlerCanvas) return;
  const tw = perlerSmallCanvas.width, th = perlerSmallCanvas.height;
  const cell = 22;
  perlerCanvas.width = tw * cell;
  perlerCanvas.height = th * cell;
  const c = perlerCanvas.getContext('2d');
  c.fillStyle = '#0b0d1a'; c.fillRect(0, 0, perlerCanvas.width, perlerCanvas.height);
  const img = perlerSmallCanvas.getContext('2d').getImageData(0, 0, tw, th).data;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4;
      c.fillStyle = `rgb(${img[i]},${img[i + 1]},${img[i + 2]})`;
      c.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // 网格线
  c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 1;
  for (let x = 0; x <= tw; x++) { c.beginPath(); c.moveTo(x * cell + 0.5, 0); c.lineTo(x * cell + 0.5, th * cell); c.stroke(); }
  for (let y = 0; y <= th; y++) { c.beginPath(); c.moveTo(0, y * cell + 0.5); c.lineTo(tw * cell, y * cell + 0.5); c.stroke(); }
}

function openPerlerPattern() {
  if (!perlerSmallCanvas) { if (statusEl) statusEl.textContent = '⚠️ ' + t('merch.cta'); return; }
  if (perlerModal) { perlerModal.hidden = false; localizeElement(perlerModal); }
  if (perlerBackdrop) perlerBackdrop.hidden = false;
  drawPerlerPattern();
}
function closePerler() {
  if (perlerModal) perlerModal.hidden = true;
  if (perlerBackdrop) perlerBackdrop.hidden = true;
}
if (perlerBtn) perlerBtn.addEventListener('click', openPerlerPattern);
if (perlerSave) perlerSave.addEventListener('click', () => {
  if (!perlerCanvas) return;
  const a = document.createElement('a');
  a.download = 'pixelcut-bead-pattern.png';
  a.href = perlerCanvas.toDataURL('image/png');
  a.click();
});

// ---------- 用豆清单弹窗 ----------
const beadModal = $('beadModal');
const beadBackdrop = $('beadBackdrop');
const beadListEl = $('beadList');
const beadSummary = $('beadSummary');
const beadDownload = $('beadDownload');

function renderBeadList() {
  if (!perlerBeadList.length) { if (beadListEl) beadListEl.innerHTML = '<p>暂无数据</p>'; return; }
  const n = perlerSmallCanvas ? perlerSmallCanvas.width : 0;
  const total = perlerBeadList.reduce((s, b) => s + b.count, 0);
  const side = Math.max(1, Math.ceil(n / 29));
  const boards = side * side;
  if (beadSummary) {
    beadSummary.innerHTML = currentLang === 'zh'
      ? `共 <b>${total}</b> 颗豆 · 图幅 ${n}×${n} · 约需 <b>${boards}</b> 块 29×29 板（${side}×${side} 拼）`
      : `Total <b>${total}</b> beads · ${n}×${n} · needs ~<b>${boards}</b> 29×29 boards (${side}×${side})`;
  }
  if (beadListEl) beadListEl.innerHTML = perlerBeadList.map(b => `
    <div class="bead-row">
      <span class="bead-sw" style="background:${b.hex}"></span>
      <span class="bead-name">${escapeHtml(b.name)}</span>
      <span class="bead-hex">${b.hex}</span>
      <span class="bead-count">×${b.count}</span>
    </div>`).join('');
}

function openBeadList() {
  if (!perlerBeadList.length) { if (statusEl) statusEl.textContent = '⚠️ ' + t('merch.cta'); return; }
  if (beadModal) { beadModal.hidden = false; localizeElement(beadModal); }
  if (beadBackdrop) beadBackdrop.hidden = false;
  renderBeadList();
}
function closeBead() {
  if (beadModal) beadModal.hidden = true;
  if (beadBackdrop) beadBackdrop.hidden = true;
}
if (beadListBtn) beadListBtn.addEventListener('click', openBeadList);
if (beadDownload) beadDownload.addEventListener('click', () => {
  const n = perlerSmallCanvas ? perlerSmallCanvas.width : 0;
  const side = Math.max(1, Math.ceil(n / 29));
  let csv = '颜色名称,色值,数量\n';
  perlerBeadList.forEach(b => { csv += `${b.name},${b.hex},${b.count}\n`; });
  csv += `\n图幅,${n}x${n}\n所需板数,${side * side} (${side}x${side})\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.download = 'pixelcut-bead-list.csv';
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
});

if (perlerBackdrop) perlerBackdrop.addEventListener('click', closePerler);
if (beadBackdrop) beadBackdrop.addEventListener('click', closeBead);
const perlerClose = $('perlerClose'); if (perlerClose) perlerClose.addEventListener('click', closePerler);
const beadClose = $('beadClose'); if (beadClose) beadClose.addEventListener('click', closeBead);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (perlerModal && !perlerModal.hidden) closePerler();
    if (beadModal && !beadModal.hidden) closeBead();
  }
});

