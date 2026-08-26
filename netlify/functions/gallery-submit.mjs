import { getStore } from '@netlify/blobs';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}

// 提交一张用户作品到社区画廊（存 Blob + 更新索引）
export default async (request) => {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  // 轻量防护：仅接受来自本站域名的提交，过滤大部分随机刷量 / 跨站调用
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  if (!origin.includes('pixcutstudio.netlify.app')) {
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

  const store = getStore('pixelcut-gallery');
  await store.set(id, b64, { metadata: { mime, style, createdAt: Date.now() } });

  let index = [];
  try {
    const raw = await store.get('index', { type: 'json' });
    if (Array.isArray(raw)) index = raw;
  } catch { /* 首次为空 */ }

  index.unshift({ id, style, caption, createdAt: Date.now() });
  if (index.length > 300) index = index.slice(0, 300);
  await store.set('index', JSON.stringify(index));

  return json({ ok: true, id }, 200);
};
