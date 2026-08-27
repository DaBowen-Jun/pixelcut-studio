// Cloudflare Pages Function — 社区画廊图片二进制
// 路径：/api/gallery-image?id=xxx
// KV binding：BUCKET

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return new Response('Bad id', { status: 400 });
  }

  let b64, meta;
  try {
    b64 = await env.BUCKET.get(id);
    meta = await env.BUCKET.getWithMetadata(id);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (b64 == null) return new Response('Not found', { status: 404 });

  const mime = (meta && meta.metadata && meta.metadata.mime) || 'image/png';
  // base64 → Uint8Array
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': mime,
      'cache-control': 'public, max-age=86400',
      'access-control-allow-origin': '*',
    },
  });
}