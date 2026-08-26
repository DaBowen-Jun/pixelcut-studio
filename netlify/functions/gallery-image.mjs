import { getStore } from '@netlify/blobs';

// 按 id 返回社区画廊中的图片二进制
export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return new Response('Bad id', { status: 400 });
  }

  const store = getStore('pixelcut-gallery');
  let b64, meta;
  try {
    b64 = await store.get(id, { type: 'text' });
    meta = await store.getMetadata(id);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (b64 == null) return new Response('Not found', { status: 404 });

  const mime = (meta && meta.mime) || 'image/png';
  const buf = Buffer.from(b64, 'base64');
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': mime,
      'cache-control': 'public, max-age=86400',
      'access-control-allow-origin': '*',
    },
  });
};
