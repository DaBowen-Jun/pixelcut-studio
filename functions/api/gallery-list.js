// Cloudflare Pages Function — 社区画廊列表
// 路径：/api/gallery-list
// KV binding：BUCKET

export async function onRequestGet({ env }) {
  let index = [];
  try {
    const raw = await env.BUCKET.get('index');
    if (raw) index = JSON.parse(raw);
  } catch { /* 空画廊 */ }

  return new Response(JSON.stringify({ items: index }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=15',
      'access-control-allow-origin': '*',
    },
  });
}