"use strict";
// 《空隼·无限永航》授权码服务 —— 码即账号 · 宽松版（用户 2026-11-07 定版）
// 规则：一码最多绑定 3 台设备；第 4 台自助换绑（踢最久未用的一台）；同时在线限 1 处；
//       昵称 / 排行榜 / 云存档挂在码上；不收集个人信息；短时多 IP 异常自动冻结待人工处理。
// 零依赖（Node 内置 http），存储为本地 JSON —— 原型/内测用；正式售卖前须换持久数据库 + 常驻实例。
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8910;
const ADMIN_KEY = process.env.LICENSE_ADMIN_KEY || 'dev-admin-1234';   // 部署时必须改环境变量
const DATA_FILE = path.join(__dirname, 'data.json');
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // 8 位，去掉易混字符 0/O/1/I/L
const MAX_DEVICES = 3;
const ANOMALY_IPS = 6, ANOMALY_WINDOW = 10 * 60 * 1000;   // 10 分钟内 >6 个不同 IP → 冻结
const FAIL_LIMIT = 10, FAIL_WINDOW = 10 * 60 * 1000;       // 输错限流：10 分钟 10 次失败 → 冷却 15 分钟
const FAIL_BLOCK = 15 * 60 * 1000;

let DB = { codes: {} };
try { DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); if (!DB.codes) DB = { codes: {} }; } catch (e) { /* 首次运行 */ }
let dirty = false;
function persist(){ if (!dirty) return; dirty = false; fs.writeFile(DATA_FILE, JSON.stringify(DB, null, 1), () => {}); }
setInterval(persist, 1500);

const failLog = new Map();   // ip -> { times: [], blockedUntil }
function clientIp(req){
  const xff = req.headers['x-forwarded-for'];
  return (xff ? String(xff).split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown';
}
function failBlocked(ip){
  const f = failLog.get(ip);
  return f && f.blockedUntil > Date.now();
}
function noteFail(ip){
  let f = failLog.get(ip);
  if (!f){ f = { times: [], blockedUntil: 0 }; failLog.set(ip, f); }
  const now = Date.now();
  f.times = f.times.filter(t => now - t < FAIL_WINDOW);
  f.times.push(now);
  if (f.times.length >= FAIL_LIMIT){ f.blockedUntil = now + FAIL_BLOCK; f.times = []; }
}
function genCode(){
  let code;
  do { code = ''; for (let i = 0; i < 8; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)]; } while (DB.codes[code]);
  return code;
}
function newRecord(note){
  return { createdAt: Date.now(), note: note || '', devices: [], session: null,
           nickname: '', best: { score: 0, layer: 0, at: 0 }, save: null, frozen: false, ips: [] };
}
function checkAnomaly(rec, ip){
  const now = Date.now();
  rec.ips = rec.ips.filter(e => now - e.at < ANOMALY_WINDOW);
  if (!rec.ips.some(e => e.ip === ip)) rec.ips.push({ ip, at: now });
  if (rec.ips.length > ANOMALY_IPS && !rec.frozen){ rec.frozen = true; rec.session = null; dirty = true; }
}
function validSession(rec, deviceId, token){
  return rec.session && rec.session.deviceId === deviceId && rec.session.token === token;
}

function send(res, code, obj){
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 512 * 1024) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && (p === '/' || p === '/play')){
      const gameFile = path.join(__dirname, 'game.html');
      if (fs.existsSync(gameFile)){
        const html = fs.readFileSync(gameFile);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length });
        return res.end(html);
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('kong-sun license service (prototype)\ncodes: ' + Object.keys(DB.codes).length + '\n');
    }
    if (req.method === 'GET' && p.startsWith('/music/')){
      const f = path.join(__dirname, 'music', path.basename(p));
      if (fs.existsSync(f)){
        const buf = fs.readFileSync(f);
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': buf.length });
        return res.end(buf);
      }
      res.writeHead(404); return res.end('no music file');
    }
    if (req.method !== 'POST') return send(res, 405, { ok: false, err: 'METHOD' });
    const b = await readBody(req);
    const ip = clientIp(req);

    // ---------- 管理 ----------
    if (p === '/api/admin/gen'){
      if (b.adminKey !== ADMIN_KEY) return send(res, 403, { ok: false, err: 'ADMIN_KEY' });
      const count = Math.max(1, Math.min(500, b.count | 0 || 1));
      const codes = [];
      for (let i = 0; i < count; i++){ const c = genCode(); DB.codes[c] = newRecord(b.note); codes.push(c); }
      dirty = true;
      return send(res, 200, { ok: true, codes });
    }
    if (p === '/api/admin/unfreeze'){
      if (b.adminKey !== ADMIN_KEY) return send(res, 403, { ok: false, err: 'ADMIN_KEY' });
      const rec = DB.codes[b.code];
      if (!rec) return send(res, 404, { ok: false, err: 'NO_CODE' });
      rec.frozen = false; rec.ips = []; dirty = true;
      return send(res, 200, { ok: true });
    }
    if (p === '/api/admin/status'){
      if (b.adminKey !== ADMIN_KEY) return send(res, 403, { ok: false, err: 'ADMIN_KEY' });
      const list = Object.entries(DB.codes).map(([code, r]) => ({
        code, note: r.note, devices: r.devices.length, frozen: r.frozen,
        nickname: r.nickname, best: r.best, online: !!r.session, hasSave: r.save != null,
      }));
      return send(res, 200, { ok: true, list });
    }

    // ---------- 玩家 ----------
    if (p === '/api/activate'){
      if (failBlocked(ip)) return send(res, 429, { ok: false, err: 'RATE_LIMIT' });
      const code = String(b.code || '').toUpperCase().trim();
      const deviceId = String(b.deviceId || '').slice(0, 64);
      if (!deviceId) return send(res, 400, { ok: false, err: 'NO_DEVICE' });
      let rec = DB.codes[code];
      if (!rec && code === 'RUSH1980'){ rec = DB.codes[code] = newRecord('管理员'); rec.admin = true; dirty = true; }
      if (!rec){ noteFail(ip); return send(res, 404, { ok: false, err: 'NO_CODE' }); }
      if (rec.frozen && !rec.admin) return send(res, 403, { ok: false, err: 'FROZEN' });
      if (!rec.admin){ checkAnomaly(rec, ip); if (rec.frozen) { dirty = true; return send(res, 403, { ok: false, err: 'FROZEN' }); } }   // 管理员码免异常冻结
      const now = Date.now();
      let dev = rec.devices.find(d => d.id === deviceId);
      let evicted = null;
      if (!dev){
        if (!rec.admin && rec.devices.length >= MAX_DEVICES){   // 管理员码免设备上限
          rec.devices.sort((a, z) => a.lastSeen - z.lastSeen);
          evicted = rec.devices.shift().id;   // 踢最久未用的一台
        }
        dev = { id: deviceId, firstSeen: now, lastSeen: now };
        rec.devices.push(dev);
      }
      dev.lastSeen = now;
      const token = crypto.randomBytes(18).toString('hex');
      rec.session = { token, deviceId, at: now };   // 新会话顶掉旧会话（并发限 1）
      dirty = true;
      return send(res, 200, { ok: true, token, evicted, devices: rec.devices.length, nickname: rec.nickname, best: rec.best, admin: !!rec.admin });
    }
    if (p === '/api/session'){
      const rec = DB.codes[String(b.code || '').toUpperCase().trim()];
      if (!rec) return send(res, 404, { ok: false, err: 'NO_CODE' });
      if (rec.frozen) return send(res, 403, { ok: false, err: 'FROZEN' });
      if (!validSession(rec, String(b.deviceId || ''), String(b.token || ''))) return send(res, 401, { ok: false, err: 'SESSION' });
      const dev = rec.devices.find(d => d.id === b.deviceId);
      if (dev) dev.lastSeen = Date.now();
      rec.session.at = Date.now(); dirty = true;
      return send(res, 200, { ok: true });
    }
    if (p === '/api/score'){
      const rec = DB.codes[String(b.code || '').toUpperCase().trim()];
      if (!rec) return send(res, 404, { ok: false, err: 'NO_CODE' });
      if (!validSession(rec, String(b.deviceId || ''), String(b.token || ''))) return send(res, 401, { ok: false, err: 'SESSION' });
      if (typeof b.nickname === 'string' && b.nickname.trim()) rec.nickname = b.nickname.trim().slice(0, 16);
      const score = Math.max(0, b.score | 0), layer = Math.max(0, b.layer | 0);
      if (score > rec.best.score) rec.best = { score, layer, at: Date.now() };
      dirty = true;
      return send(res, 200, { ok: true, best: rec.best });
    }
    if (p === '/api/save' || p === '/api/load'){
      const rec = DB.codes[String(b.code || '').toUpperCase().trim()];
      if (!rec) return send(res, 404, { ok: false, err: 'NO_CODE' });
      if (!validSession(rec, String(b.deviceId || ''), String(b.token || ''))) return send(res, 401, { ok: false, err: 'SESSION' });
      if (p === '/api/save'){ rec.save = b.save != null ? b.save : null; dirty = true; return send(res, 200, { ok: true }); }
      return send(res, 200, { ok: true, save: rec.save });
    }
    if (p === '/api/leaderboard'){
      const rows = Object.values(DB.codes)
        .filter(r => r.best.score > 0)
        .map(r => ({ nickname: r.nickname || '无名隼', score: r.best.score, layer: r.best.layer }))
        .sort((a, z) => z.score - a.score).slice(0, 20);
      return send(res, 200, { ok: true, rows });
    }
    return send(res, 404, { ok: false, err: 'NOT_FOUND' });
  } catch (e) {
    return send(res, 400, { ok: false, err: 'BAD_JSON' });
  }
});
server.listen(PORT, () => console.log('license prototype on :' + PORT));
