// 验证：全屏观看 + 「被浏览器暂停」的自愈
//
// 报过的 bug：手机上进出全屏后画面黑掉 / 跑出播放框，要手动点播放才恢复。
// 根因：浏览器在进出全屏时会把 <video> 暂停，而且 iPhone 上我们用了
// video.webkitEnterFullscreen()，把视频交给了系统播放器。
//
// 这个脚本守住三件事：
//   ① 进出全屏前后，视频一直在播（paused === false）
//   ② 视频永远待在播放框里，不会跑到框外
//   ③ 就算被浏览器暂停了，1 秒内能自己恢复播放
const { chromium, newPage, teacherGoLive, waitVideo, KILL_ELEMENT_FS, BASE } = require('./lib');

const out = [];
let fail = 0;
function ok(cond, msg) { if (!cond) fail++; out.push(`${cond ? '✅' : '❌'} ${msg}`); }

const state = page => page.evaluate(() => {
  const st = document.querySelector('.video-stage');
  const v = st && st.querySelector('video');
  const r = el => { const b = el.getBoundingClientRect(); return { t: Math.round(b.top), l: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  return {
    nativeFs: !!document.fullscreenElement,
    immersive: !!(st && st.classList.contains('immersive')),
    stage: st ? r(st) : null,
    video: v ? r(v) : null,
    paused: v ? v.paused : null,
    readyState: v ? v.readyState : null,
    hasSrc: !!(v && v.srcObject),
    objFit: v ? getComputedStyle(v).objectFit : '',
    vw: window.innerWidth, vh: window.innerHeight,
    needTap: !!document.querySelector('.resume-btn'),
    exitBtn: !!document.querySelector('.immersive-exit'),
    locked: document.documentElement.classList.contains('stage-locked'),
  };
});

// 视频必须待在播放框里（退出全屏后不能跑出去）
function inFrame(s) {
  if (!s.stage || !s.video) return false;
  return s.video.t >= s.stage.t - 2 && s.video.l >= s.stage.l - 2 &&
    s.video.r <= s.stage.r + 2 && s.video.b <= s.stage.b + 2;
}

async function startTeacher(browser) {
  const t = await newPage(browser, { width: 1440, height: 900 });
  await teacherGoLive(t.page);
  const url = (await t.page.textContent('.invite-url') || '').trim();
  return { ...t, roomId: (url.match(/\/student\/(\d+)/) || [])[1] };
}

async function joinStudent(browser, roomId, viewport, opts = {}) {
  const s = await newPage(browser, viewport, { noFakeCapture: true, ...opts });
  if (opts.killElementFs) await s.page.addInitScript(KILL_ELEMENT_FS);
  await s.page.goto(BASE + '/student/' + roomId, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await s.page.waitForTimeout(400);
  await s.page.fill('input[placeholder="例如：王小明"]', '测试学员');
  await s.page.click('text=进入沙龙');
  await s.page.waitForSelector('.video-stage', { timeout: 8000 });
  const got = await waitVideo(s.page);
  await s.page.waitForTimeout(600);
  return { ...s, got };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const t = await startTeacher(browser);
  ok(!!t.roomId, `老师开课，房间 ${t.roomId}`);

  // ─────────── ① 桌面：走浏览器全屏 ───────────
  {
    const s = await joinStudent(browser, t.roomId, { width: 1440, height: 900 });
    ok(s.got, '桌面学员收到画面');

    const before = await state(s.page);
    ok(before.paused === false, '初始正在播放');
    ok(inFrame(before), '初始画面在播放框内');

    await s.page.click('.fs-btn');
    await s.page.waitForTimeout(900);
    const fs = await state(s.page);
    ok(fs.nativeFs, '桌面进入浏览器全屏');
    ok(fs.paused === false, `全屏中仍在播放（paused=${fs.paused}）`);
    ok(fs.stage.w >= fs.vw - 1 && fs.stage.h >= fs.vh - 1, `全屏铺满（${fs.stage.w}×${fs.stage.h}）`);

    await s.page.evaluate(() => (document.exitFullscreen || document.webkitExitFullscreen).call(document));
    await s.page.waitForTimeout(1000);
    const back = await state(s.page);
    ok(!back.nativeFs, '退出浏览器全屏');
    ok(back.paused === false, `★ 退出全屏后仍在播放（paused=${back.paused}）`);
    ok(!back.needTap, '没有弹出「点击继续播放」');
    ok(inFrame(back), `★ 画面回到播放框内（video ${JSON.stringify(back.video)} / stage ${JSON.stringify(back.stage)}）`);
    ok(Math.abs(back.stage.w / back.stage.h - 16 / 9) < 0.02, `退出后仍是 16:9（${back.stage.w}×${back.stage.h}）`);

    // ── 模拟「浏览器把视频暂停了」──
    const pausedNow = await s.page.evaluate(() => {
      const v = document.querySelector('.video-stage video')
      v.pause()
      return v.paused          // 同步读，确认真的停了（随后守卫会把它拉回来）
    })
    await s.page.waitForTimeout(1400);
    const healed = await state(s.page);
    ok(pausedNow === true, '（人为暂停一次，确认真的暂停了）');
    ok(healed.paused === false, `★ 被暂停后自动恢复播放（paused=${healed.paused}）`);

    // 退出后能打字
    await s.page.fill('.chat-input-row input', '退出全屏后可以打字');
    ok((await s.page.inputValue('.chat-input-row input')) === '退出全屏后可以打字', '退出全屏后公屏可打字');
    await s.ctx.close();
  }

  // ─────────── ② 手机（iPhone 路径：没有元素全屏 API）→ CSS 沉浸式 ───────────
  {
    const s = await joinStudent(browser, t.roomId, { width: 390, height: 844 },
      { hasTouch: true, isMobile: true, killElementFs: true });
    ok(s.got, '手机学员收到画面');

    const before = await state(s.page);
    ok(before.paused === false, '手机初始正在播放');
    ok(inFrame(before), '手机初始画面在框内');

    await s.page.click('.fs-btn');
    await s.page.waitForTimeout(900);
    const fs = await state(s.page);
    ok(fs.immersive, 'iPhone 路径走 CSS 沉浸式（不碰浏览器全屏）');
    ok(!fs.nativeFs, '没有进入浏览器全屏（避免被系统播放器接管）');
    ok(fs.locked, '页面滚动已锁住');
    ok(fs.stage.w >= fs.vw - 2 && fs.stage.h >= fs.vh - 2,
      `竖屏时画面已转 90° 铺满（${fs.stage.w}×${fs.stage.h} / 视口 ${fs.vw}×${fs.vh}）`);
    ok(fs.paused === false, `★ 沉浸式下仍在播放（paused=${fs.paused}）`);
    ok(fs.objFit === 'contain', `沉浸式用 contain 不裁内容（${fs.objFit}）`);
    ok(fs.exitBtn, '浮出「退出全屏」按钮');

    // 全屏必须是「干净的画面」：不能有「把手机横过来」这类提示
    ok(!(await s.page.$('.immersive-hint')), '全屏里没有「横过来看」的提示');
    ok(!(await s.page.$('.fs-btn')), '全屏里没有第二个全屏按钮');

    // ★ 用户报的 bug：手一碰屏幕任意位置就退回竖屏。现在只有「退出全屏」按钮能退。
    await s.page.touchscreen.tap(Math.round(fs.vw / 2), Math.round(fs.vh / 2));
    await s.page.waitForTimeout(600);
    ok((await state(s.page)).immersive, '★ 点画面正中间不会退出全屏');
    await s.page.touchscreen.tap(20, Math.round(fs.vh / 2));
    await s.page.waitForTimeout(600);
    ok((await state(s.page)).immersive, '★ 点画面左侧空白也不会退出全屏');

    // 再点一次退出
    await s.page.click('.immersive-exit');
    await s.page.waitForTimeout(1000);
    const back = await state(s.page);
    ok(!back.immersive, '退出沉浸式');
    ok(!back.locked, '页面滚动解锁');
    ok(back.paused === false, `★ 退出后仍在播放（paused=${back.paused}）`);
    ok(!back.needTap, '没有弹出「点击继续播放」');
    ok(inFrame(back), '★ 画面回到播放框内');
    ok(Math.abs(back.stage.w / back.stage.h - 16 / 9) < 0.02, `退出后仍是 16:9（${back.stage.w}×${back.stage.h}）`);

    // 再进一次全屏，仍然在播
    await s.page.click('.fs-btn');
    await s.page.waitForTimeout(900);
    const fs2 = await state(s.page);
    ok(fs2.immersive && fs2.paused === false, `★ 再次进全屏不卡住（paused=${fs2.paused}）`);

    // Esc 退出
    await s.page.keyboard.press('Escape');
    await s.page.waitForTimeout(700);
    ok(!(await state(s.page)).immersive, '按 Esc 能退出沉浸式');

    // 退出后能打字 + 公屏可见
    await s.page.fill('.chat-input-row input', '全屏回来还能打字');
    ok((await s.page.inputValue('.chat-input-row input')) === '全屏回来还能打字', '退出全屏后公屏可打字');
    await s.ctx.close();
  }

  // ─────────── ③ 手机横屏（自然横过来）不旋转 ───────────
  {
    const s = await joinStudent(browser, t.roomId, { width: 844, height: 390 },
      { hasTouch: true, isMobile: true, killElementFs: true });
    await s.page.click('.fs-btn');
    await s.page.waitForTimeout(900);
    const fs = await state(s.page);
    ok(fs.immersive, '横屏手机进入沉浸式');
    ok(fs.stage.w >= fs.vw - 2 && fs.stage.h >= fs.vh - 2, `横屏时铺满且不旋转（${fs.stage.w}×${fs.stage.h}）`);
    ok(fs.paused === false, `横屏沉浸式仍在播放（paused=${fs.paused}）`);
    await s.ctx.close();
  }

  // ─────────── ④ 老师端全屏也要「干净画面」───────────
  {
    await t.page.click('.fs-btn');
    await t.page.waitForTimeout(800);
    const st = await t.page.evaluate(() => {
      const badge = document.querySelector('.live-badge');
      const hint = document.querySelector('.immersive-hint');
      return {
        fs: !!document.fullscreenElement,
        badge: badge ? getComputedStyle(badge).display : 'none',
        hint: !!hint,
      };
    });
    ok(st.fs, '老师端进入浏览器全屏');
    ok(st.badge === 'none', '★ 全屏时「直播中」徽标已收起');
    ok(!st.hint, '老师端全屏里没有多余提示');
    await t.page.evaluate(() => (document.exitFullscreen || document.webkitExitFullscreen).call(document));
    await t.page.waitForTimeout(700);
    const back = await t.page.evaluate(() => ({
      fs: !!document.fullscreenElement,
      badge: getComputedStyle(document.querySelector('.live-badge')).display,
      stageW: Math.round(document.querySelector('.video-stage').getBoundingClientRect().width),
      inviteW: Math.round(document.querySelector('.invite-card').getBoundingClientRect().width),
    }));
    ok(!back.fs, '老师端退出全屏');
    ok(back.badge !== 'none', '退出后徽标回来');
    ok(Math.abs(back.stageW - back.inviteW) <= 2, `★ 退出后链接卡仍与画面同宽（${back.inviteW} vs ${back.stageW}）`);
  }

  const realErr = t.errors.filter(e => !/no mic in test|获取设备失败/.test(e));
  ok(realErr.length === 0, `老师端无 JS 报错${realErr.length ? '：' + realErr[0] : ''}`);
  console.log(out.join('\n'));
  console.log(fail ? `\n❌ 失败 ${fail} 项` : '\n✅ 全部通过：全屏进出播放不断、画面不出框、被暂停能自愈');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
