// 端到端：老师开课 → 学员加入 → 学员真的收到画面
// 重点验证「采集端 16:9 → 分享框 16:9 → 画面刚好铺满、不裁不黑边」
const { chromium, newPage, teacherGoLive, studentJoin, BASE } = require('./lib');

const out = [];
let fail = 0;
function ok(cond, msg) { if (!cond) fail++; out.push(`${cond ? '✅' : '❌'} ${msg}`); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 老师开课
  const t = await newPage(browser, { width: 1440, height: 900 });
  await teacherGoLive(t.page);
  const url = (await t.page.textContent('.invite-url') || '').trim();
  const roomId = (url.match(/\/student\/(\d+)/) || [])[1];
  ok(!!roomId, `老师已开课，房间号 ${roomId || '(没拿到)'}`);

  // 学员加入
  const s = await newPage(browser, { width: 1440, height: 900 });
  await s.page.goto(BASE + '/student/' + roomId);
  await s.page.waitForTimeout(400);
  await s.page.fill('input[placeholder="例如：王小明"]', '测试学员');
  await s.page.click('text=进入沙龙');
  await s.page.waitForSelector('.video-stage', { timeout: 8000 });

  // 等 WebRTC 连上
  let got = null;
  for (let i = 0; i < 40; i++) {
    got = await s.page.evaluate(() => {
      const v = document.querySelector('.video-stage video');
      if (!v) return null;
      const r = v.getBoundingClientRect();
      return {
        vw: v.videoWidth, vh: v.videoHeight, paused: v.paused,
        w: Math.round(r.width), h: Math.round(r.height),
        connected: !!v.srcObject,
      };
    });
    if (got && got.vw > 0) break;
    await s.page.waitForTimeout(250);
  }

  ok(got && got.vw > 0, `学员收到画面（${got ? got.vw + '×' + got.vh : '没收到'}）`);
  if (got && got.vw > 0) {
    const srcRatio = +(got.vw / got.vh).toFixed(4);
    const boxRatio = +(got.w / got.h).toFixed(4);
    ok(Math.abs(srcRatio - 16 / 9) < 0.01, `采集端画面是 16:9（${srcRatio}）`);
    ok(Math.abs(boxRatio - 16 / 9) < 0.02, `分享框也是 16:9（${boxRatio}）`);
    ok(Math.abs(srcRatio - boxRatio) < 0.02, `源比例与框比例一致 → cover 不裁任何内容`);
    ok(got.connected && !got.paused, '视频正在播放');
  }

  // 老师端学员列表应出现 1 人
  await t.page.waitForTimeout(800);
  const online = await t.page.evaluate(() => {
    const el = document.querySelector('.rail-card .chip');
    return el ? el.textContent.trim() : '';
  });
  ok(/1\s*人/.test(online), `老师端显示在线人数「${online}」`);

  // 公屏互通
  await s.page.fill('.chat-input-row input', '老师好，我是学员');
  await s.page.press('.chat-input-row input', 'Enter');
  await t.page.waitForTimeout(900);
  const chat = await t.page.evaluate(() => {
    const b = document.querySelectorAll('.chat-card .msg-bubble');
    return b.length ? b[b.length - 1].textContent : '';
  });
  ok(chat.includes('老师好，我是学员'), `公屏消息老师端收到了：「${chat}」`);

  const realErrors = s.errors.filter(e => !/no mic in test|获取设备失败/.test(e));
  ok(realErrors.length === 0, `学员端无 JS 报错${realErrors.length ? '：' + realErrors[0] : ''}`);

  console.log(out.join('\n'));
  console.log(fail ? `\n❌ 失败 ${fail} 项` : '\n✅ 全部通过：端到端链路正常，画面 16:9 刚好铺满分享框');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
