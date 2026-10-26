// 共用工具：假屏幕共享 + 页面度量
// 目的：不用真的开屏幕录制权限，也能把「上课中」这一屏完整跑起来做版式验证。
const BASE = process.env.YIXUE_URL || 'http://localhost:3000';

// Playwright 优先用项目/全局装的，找不到再退回本机托管的那份
let pw;
try { pw = require('playwright'); }
catch (e) { pw = require('/Users/g-seven/.workbuddy-ai/binaries/node/workspace/node_modules/playwright'); }
const chromium = pw.chromium;

// 造一条 16:9 的假屏幕流（老师端 getDisplayMedia 的替身）
const FAKE_CAPTURE = () => {
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720;
  const ctx = c.getContext('2d');
  let t = 0;
  setInterval(() => {
    t++;
    ctx.fillStyle = '#0b0f16'; ctx.fillRect(0, 0, 1280, 720);
    // 画一个会动的方块，方便肉眼确认「画面真的在动」
    ctx.fillStyle = `hsl(${(t * 2) % 360},70%,55%)`;
    ctx.fillRect(60 + (t * 4) % 1100, 280, 160, 160);
    ctx.fillStyle = '#e0b15e';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('16:9 TEST', 420, 140);
  }, 100);
  const stream = c.captureStream(15);
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getDisplayMedia = async () => stream;
    // 麦克风不给权限，让业务代码走「拿不到麦也能开课」的分支
    navigator.mediaDevices.getUserMedia = async () => { throw new Error('no mic in test'); };
  }
};

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, permissions: [] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(FAKE_CAPTURE);
  return { ctx, page, errors };
}

// 老师端：输入姓名 → 进入 → 开始上课
async function teacherGoLive(page) {
  await page.goto(BASE + '/');
  await page.waitForTimeout(400);
  await page.fill('input[placeholder="例如：李老师"]', '测试老师');
  await page.click('text=进入沙龙');
  await page.waitForTimeout(500);
  await page.click('text=开始上课');
  await page.waitForSelector('.video-stage', { timeout: 8000 });
  await page.waitForTimeout(900);
}

// 学员端：输入姓名 → 进入
async function studentJoin(page, roomId) {
  await page.goto(BASE + '/student/' + roomId);
  await page.waitForTimeout(400);
  await page.fill('input[placeholder="例如：王小明"]', '测试学员');
  await page.click('text=进入沙龙');
  await page.waitForSelector('.video-stage', { timeout: 8000 });
  await page.waitForTimeout(600);
}

// 量画面舞台 + 周边功能区的位置关系
async function measureStage(page) {
  return page.evaluate(() => {
    const box = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        t: Math.round(r.top), b: Math.round(r.bottom),
        l: Math.round(r.left), r: Math.round(r.right),
        w: Math.round(r.width), h: Math.round(r.height),
        ratio: r.height ? +(r.width / r.height).toFixed(4) : 0,
      };
    };
    const stage = document.querySelector('.video-stage');
    const video = stage && stage.querySelector('video');
    const main = document.querySelector('.live-main');
    const area = document.querySelector('.stage-area');
    const below = document.querySelector('.connect-zone, .invite-card');
    const bar = document.querySelector('.audio-strip, .audio-bar');
    const rail = document.querySelector('.live-rail, .chat-card');
    return {
      vw: window.innerWidth, vh: window.innerHeight,
      stage: box(stage), video: box(video), area: box(area), main: box(main),
      below: box(below), bar: box(bar), rail: box(rail),
      objectFit: video ? getComputedStyle(video).objectFit : '',
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
    };
  });
}

function ratioOk(m, tol = 0.02) {
  return Math.abs(m.stage.ratio - 16 / 9) <= tol;
}

module.exports = { chromium, BASE, FAKE_CAPTURE, newPage, teacherGoLive, studentJoin, measureStage, ratioOk };
