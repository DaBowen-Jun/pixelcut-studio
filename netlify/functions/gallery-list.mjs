import { getStore } from '@netlify/blobs';

// 返回社区画廊索引（最近 300 张的元数据）
export default async () => {
  const store = getStore('pixelcut-gallery');
  let index = [];
  try {
    const raw = await store.get('index', { type: 'json' });
    if (Array.isArray(raw)) index = raw;
  } catch { /* 空画廊 */ }

  return new Response(JSON.stringify({ items: index }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=15',
      'access-control-allow-origin': '*',
    },
  });
};
