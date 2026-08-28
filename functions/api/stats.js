// Cloudflare Pages Function — 访问统计看板数据
// 路径：/api/stats  （GET，需带 x-stats-key 头）
// KV binding：BUCKET

function dayKey(date) {
  const d = new Date(date.getTime() + 8 * 3600 * 1000);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

export async function onRequestGet({ request, env }) {
  const key = request.headers.get('x-stats-key') || '';
  const PASS = env.STATS_PASSWORD || 'pixelcut2026'; // 默认口令，建议在 Pages 设置里用环境变量覆盖
  if (key !== PASS) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const now = new Date();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    days.push(dayKey(new Date(now.getTime() - i * 86400000)));
  }

  let windowPv = 0;
  const windowUvSet = new Set();
  let paths = {}, countries = {}, devices = {};
  const series = [];
  let today = { pv: 0, uv: 0, paths: {}, countries: {}, devices: {} };
  const todayKey = dayKey(now);

  for (const day of days) {
    let rec = null;
    try {
      const raw = await env.BUCKET.get('stats:' + day);
      if (raw) rec = JSON.parse(raw);
    } catch { /* 忽略 */ }
    if (!rec) { series.push({ date: day, pv: 0, uv: 0 }); continue; }

    windowPv += rec.pv || 0;
    (rec.uvs || []).forEach((u) => windowUvSet.add(u));
    for (const k in (rec.paths || {})) paths[k] = (paths[k] || 0) + (rec.paths[k] || 0);
    for (const k in (rec.countries || {})) countries[k] = (countries[k] || 0) + (rec.countries[k] || 0);
    for (const k in (rec.devices || {})) devices[k] = (devices[k] || 0) + (rec.devices[k] || 0);
    series.push({ date: day, pv: rec.pv || 0, uv: (rec.uvs || []).length });
    if (day === todayKey) {
      today = { pv: rec.pv || 0, uv: (rec.uvs || []).length, paths: rec.paths || {}, countries: rec.countries || {}, devices: rec.devices || {} };
    }
  }

  return new Response(
    JSON.stringify({ today, windowPv, windowUv: windowUvSet.size, days: series, paths, countries, devices }),
    { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }
  );
}
