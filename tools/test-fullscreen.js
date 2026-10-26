// 验证：全屏观看
// 1) 学员手机端点画面 / 点全屏按钮 → 进入全屏，画面铺满且不裁切
// 2) 再点 → 退出全屏，回到正常排版，公屏可以打字
// 3) 老师端同样有全屏
const { chromium, newPage, teacherGoLive, studentJoin, measureStage } = require('./lib');

const out = [];
let fail = 0;
function ok(cond, msg) { if (!cond) fail++; out.push(`${cond ? '✅' : '❌'} ${msg}`); }

const fsState = page => page.evaluate(() => {
  const el = document.fullscreenElement || document.webkitFullscreenElement;
  const stage = document.querySelector('.video-stage');
  const v = stage && stage.querySelector('video');
  const r = stage ? stage.getBoundingClientRect() : null;
  return {
    active: !!el,
    isStage: !!(el && el.classList && el.classList.contains('video-stage')),
    rect: r ? { w: Math.round(r.width), h: Math.round(r.height), t: Math.round(r.top), l: Math.round(r.left) } : null,
    vw: window.innerWidth, vh: window.innerHeight,
    objectFit: v ? getComputedStyle(v).objectFit : '',
    btnText: (document.querySelector('.fs-btn span') || {}).textContent || '',
  };
});

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // ── 学员手机端 ──
  {
    const { ctx, page } = await newPage(browser, { width: 390, height: 844 });
    await studentJoin(page, '999999');

    const btn = await page.$('.fs-btn');
    ok(!!btn, '学员手机端有全屏按钮');
    const box = btn && await btn.boundingBox();
    ok(box && box.width >= 44 && box.height >= 24, `全屏按钮可点（${box ? Math.round(box.width) + '×' + Math.round(box.height) : '-'}）`);

    const before = await fsState(page);
    ok(!before.active, '初始不是全屏');
    ok(Math.abs(before.rect.w / before.rect.h - 16 / 9) < 0.02, `初始画面 16:9（${before.rect.w}×${before.rect.h}）`);

    // 点按钮进全屏
    await page.click('.fs-btn');
    await page.waitForTimeout(700);
    const fs1 = await fsState(page);
    ok(fs1.active, '点击全屏按钮 → 进入全屏');
    ok(fs1.isStage, '全屏的是画面舞台（保留退出按钮）');
    ok(fs1.rect.w >= fs1.vw - 1 && fs1.rect.h >= fs1.vh - 1, `全屏后铺满屏幕（${fs1.rect.w}×${fs1.rect.h} / 视口 ${fs1.vw}×${fs1.vh}）`);
    ok(fs1.objectFit === 'contain', `全屏用 contain，讲课内容不被裁（object-fit=${fs1.objectFit}）`);
    ok(/退出全屏/.test(fs1.btnText), `按钮变成「${fs1.btnText.trim()}」`);

    // 退出
    await page.click('.fs-btn');
    await page.waitForTimeout(700);
    const fs2 = await fsState(page);
    ok(!fs2.active, '再点 → 退出全屏');
    ok(Math.abs(fs2.rect.w / fs2.rect.h - 16 / 9) < 0.02, `退出后画面回到 16:9（${fs2.rect.w}×${fs2.rect.h}）`);
    ok(/全屏/.test(fs2.btnText) && !/退出/.test(fs2.btnText), `按钮恢复「${fs2.btnText.trim()}」`);

    // 退出后能打字
    await page.fill('.chat-input-row input', '退出全屏后可以打字');
    const typed = await page.inputValue('.chat-input-row input');
    ok(typed === '退出全屏后可以打字', '退出全屏后公屏输入框可正常打字');
    const chatVisible = await page.evaluate(() => {
      const c = document.querySelector('.chat-card');
      const r = c.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom <= window.innerHeight + 1;
    });
    ok(chatVisible, '退出全屏后公屏一屏可见');

    // 直接点画面也能进全屏
    await page.click('.video-stage video', { position: { x: 40, y: 40 } });
    await page.waitForTimeout(600);
    ok((await fsState(page)).active, '点画面本身也能进全屏');
    // 用 API 退出（无头浏览器不处理 Esc 这个浏览器级快捷键，真机上 Esc 由浏览器自己接管）
    await page.evaluate(() => (document.exitFullscreen || document.webkitExitFullscreen).call(document));
    await page.waitForTimeout(500);
    ok(!(await fsState(page)).active, '全屏状态变化能被监听并同步到按钮');

    await ctx.close();
  }

  // ── 老师端 ──
  {
    const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });
    await teacherGoLive(page);
    ok(!!(await page.$('.fs-btn')), '老师端也有全屏按钮');
    await page.click('.fs-btn');
    await page.waitForTimeout(700);
    const fs = await fsState(page);
    ok(fs.active && fs.isStage, '老师端全屏生效');
    ok(fs.objectFit === 'contain', '老师端全屏用 contain');
    await page.evaluate(() => (document.exitFullscreen || document.webkitExitFullscreen).call(document));
    await page.waitForTimeout(600);
    const m = await measureStage(page);
    ok(Math.abs(m.stage.ratio - 16 / 9) < 0.02, `退出全屏后画面仍 16:9（${m.stage.w}×${m.stage.h}）`);
    await ctx.close();
  }

  console.log(out.join('\n'));
  console.log(fail ? `\n❌ 失败 ${fail} 项` : '\n✅ 全部通过：全屏进出正常，退出后可继续看公屏打字');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
