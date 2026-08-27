// Cloudflare Pages Function — 社区画廊提交
// 路径：/api/gallery-submit
// KV binding：BUCKET（在 wrangler.toml 里绑定）

export async function onRequestPost({ request, env }) {
  // 轻量防护：仅接受来自本站域名的提交
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  const allowed =
    origin.includes('pixcutstudio.pages.dev') ||
    origin.includes('pixcutstudio.netlify.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');
  if (!allowed) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'bad json' }, 400);
  }

  const image = payload && payload.image;
  if (typeof image !== 'string') return json({ ok: false, error: 'no image' }, 400);
  const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return json({ ok: false, error: 'bad image' }, 400);
  if (image.length > 2_200_000) return json({ ok: false, error: 'too large' }, 413);

  const mime = m[1];
  const b64 = m[2];
  const style = (payload.style || 'unknown').toString().slice(0, 24);
  const caption = (payload.caption || '').toString().slice(0, 80);
  const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  await env.BUCKET.put(id, b64, {
    metadata: { mime, style, createdAt: String(Date.now()) },
  });

  let index = [];
  try {
    const raw = await env.BUCKET.get('index');
    if (raw) index = JSON.parse(raw);
  } catch { /* 首次为空 */ }

  index.unshift({ id, style, caption, createdAt: Date.now() });
  if (index.length > 300) index = index.slice(0, 300);
  await env.BUCKET.put('index', JSON.stringify(index));

  return json({ ok: true, id }, 200);
}

// 处理 CORS 预检
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}