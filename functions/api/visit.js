// Cloudflare Pages Function — 访问统计埋点
// 路径：/api/visit  （POST，来自站内 beacon，fire-and-forget）
// KV binding：BUCKET（与画廊共用同一命名空间，键前缀 stats:）

function dayKey(date) {
  // 以北京时间(UTC+8)为一天的分界
  const d = new Date(date.getTime() + 8 * 3600 * 1000);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

function deviceType(ua) {
  ua = (ua || '').toLowerCase();
  if (/mobile|iphone|android|ipod|blackberry|opera mini|iemobile|windows phone/.test(ua)) return 'mobile';
  if (/ipad|tablet|kindle|playbook|silk|nexus 7|nexus 9/.test(ua)) return 'tablet';
  return 'desktop';
}

export async function onRequestPost({ request, env }) {
  let payload = {};
  try { payload = await request.json(); } catch { /* 忽略 */ }

  const path = (payload.path || '/').toString().slice(0, 120) || '/';
  const ua = request.headers.get('user-agent') || '';
  const country = (request.cf && request.cf.country) || 'XX';
  const device = deviceType(ua);

  // 访客唯一 ID（cookie），用于 UV 去重
  let uid = '';
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)pc_uid=([^;]+)/);
  if (m) uid = m[1];
  let setCookie = null;
  if (!uid) {
    uid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    setCookie = 'pc_uid=' + uid + '; Max-Age=31536000; Path=/; SameSite=Lax';
  }

  const key = 'stats:' + dayKey(new Date());
  let rec = { pv: 0, uvs: [], paths: {}, countries: {}, devices: {} };
  try {
    const raw = await env.BUCKET.get(key);
    if (raw) rec = JSON.parse(raw);
  } catch { /* 首次为空 */ }

  rec.pv = (rec.pv || 0) + 1;
  if (!rec.uvs.includes(uid)) {
    rec.uvs.push(uid);
    if (rec.uvs.length > 8000) rec.uvs = rec.uvs.slice(-8000); // 安全阀
  }
  rec.paths[path] = (rec.paths[path] || 0) + 1;
  rec.countries[country] = (rec.countries[country] || 0) + 1;
  rec.devices[device] = (rec.devices[device] || 0) + 1;

  await env.BUCKET.put(key, JSON.stringify(rec));

  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
  if (setCookie) headers['set-cookie'] = setCookie;
  return new Response(JSON.stringify({ ok: true }), { headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}
