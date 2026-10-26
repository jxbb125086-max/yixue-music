// 验证：老师端 / 学员端的画面舞台在任意窗口尺寸下都是 16:9，且不与其它功能区重叠
const { chromium, newPage, teacherGoLive, studentJoin, measureStage, ratioOk } = require('./lib');

const DESKTOP = [
  [1920, 1080, '1920×1080'],
  [1440, 900, '1440×900'],
  [1280, 800, '1280×800'],
  [1024, 768, '1024×768 4:3'],
  [1600, 700, '1600×700 扁'],
];
const MOBILE = [
  [390, 844, '390×844 iPhone'],
  [360, 780, '360×780 小安卓'],
  [430, 932, '430×932 大屏手机'],
  [768, 1024, '768×1024 竖屏平板'],
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const out = [];
  let fail = 0;

  function check(tag, m, opts = {}) {
    const problems = [];
    if (!m.stage) { problems.push('没有 .video-stage'); }
    else {
      if (!ratioOk(m)) problems.push(`比例 ${m.stage.ratio} ≠ 16:9`);
      if (m.stage.w < 120) problems.push(`画面太窄 ${m.stage.w}px`);
      if (m.video && (Math.abs(m.video.w - m.stage.w) > 2 || Math.abs(m.video.h - m.stage.h) > 2))
        problems.push(`video 没铺满舞台 ${m.video.w}×${m.video.h} vs ${m.stage.w}×${m.stage.h}`);
      if (m.objectFit !== 'cover') problems.push(`object-fit=${m.objectFit}（应为 cover）`);
      // 与下方功能区不能重叠
      if (m.below && m.below.t < m.stage.b - 1) problems.push(`与下方功能区重叠 ${m.below.t} < ${m.stage.b}`);
      if (m.area && (m.stage.t < m.area.t - 1 || m.stage.b > m.area.b + 1)) problems.push('舞台超出舞台区');
    }
    if (m.overflowX > 1) problems.push(`横向溢出 ${m.overflowX}px`);
    if (opts.noScrollY && m.overflowY > 1) problems.push(`纵向溢出 ${m.overflowY}px`);
    // 公屏必须一屏可见（不用滚），且在宽屏时应位于画面右侧
    if (opts.chatRight && m.rail && m.rail.l < m.stage.r - 1) problems.push('公屏没在画面右侧');
    if (opts.chatVisible && m.rail && m.rail.b > m.vh + 1) problems.push(`公屏超出视口 ${m.rail.b - m.vh}px`);
    // 播放框下面的功能框必须和播放框同宽、左对齐（用户要求「上下一样长」）
    if (opts.alignBelow && m.stage) {
      if (m.below && Math.abs(m.below.w - m.stage.w) > 2)
        problems.push(`下方功能框 ${m.below.w}px ≠ 播放框 ${m.stage.w}px`);
      if (m.bar && Math.abs(m.bar.w - m.stage.w) > 2)
        problems.push(`音频条 ${m.bar.w}px ≠ 播放框 ${m.stage.w}px`);
      if (m.below && Math.abs(m.below.l - m.stage.l) > 2)
        problems.push(`下方功能框左边 ${m.below.l} ≠ 播放框左边 ${m.stage.l}`);
      // 画面和右栏之间不能留空白（右栏要吃掉全部剩余宽度）
      if (m.rail && m.stage && m.rail.l - m.stage.r > 20)
        problems.push(`画面与右栏之间空出 ${m.rail.l - m.stage.r}px`);
    }
    // 桌面学员端：连线卡在右栏、公屏上方，且比公屏窄不了多少
    if (opts.connectInRail && m.conn) {
      if (m.rail && m.conn.l < m.rail.l - 2) problems.push('连线卡没在右栏');
      if (m.conn.t > m.stage.t) problems.push('连线卡应该和画面同高起头');
    }
    if (opts.connectInRail && !m.conn) problems.push('桌面学员端没有 .connect-card');

    const ok = problems.length === 0;
    if (!ok) fail++;
    out.push(`${ok ? '✅' : '❌'} ${tag}  画面 ${m.stage ? m.stage.w + '×' + m.stage.h + ' (' + m.stage.ratio + ')' : '-'}`
      + (ok ? '' : '  ← ' + problems.join('；')));
  }

  // ── 老师端 ──
  for (const [w, h, name] of DESKTOP) {
    const { ctx, page, errors } = await newPage(browser, { width: w, height: h });
    await teacherGoLive(page);
    const m = await measureStage(page);
    check(`老师 ${name}`, m, { noScrollY: w >= 900, alignBelow: w >= 900 });
    const real = errors.filter(e => !/no mic in test|获取设备失败/.test(e));
    if (real.length) out.push(`   ⚠ 老师 ${name} 报错: ${real[0]}`);
    await ctx.close();
  }

  // ── 学员端桌面 ──
  for (const [w, h, name] of DESKTOP) {
    const { ctx, page } = await newPage(browser, { width: w, height: h });
    await studentJoin(page, '999999');
    const m = await measureStage(page);
    check(`学员 ${name}`, m, { noScrollY: w >= 900, chatRight: w >= 900, chatVisible: true, alignBelow: w >= 900, connectInRail: w >= 900 });
    await ctx.close();
  }

  // ── 学员端移动端 ──
  for (const [w, h, name] of MOBILE) {
    const { ctx, page } = await newPage(browser, { width: w, height: h });
    await studentJoin(page, '999999');
    const m = await measureStage(page);
    check(`学员 ${name}`, m);
    // 手机上「画面 → 连线 → 音频 → 公屏」的顺序要正确
    const order = await page.evaluate(() => {
      const y = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top : null; };
      return { stage: y('.video-stage'), connect: y('.connect-zone'), audio: y('.audio-bar'), chat: y('.chat-card') };
    });
    const okOrder = order.stage < order.connect && order.connect < order.audio && order.audio < order.chat;
    if (!okOrder) fail++;
    out.push(`${okOrder ? '✅' : '❌'} 学员 ${name} 顺序 画面(${Math.round(order.stage)}) < 连线(${Math.round(order.connect)}) < 音频(${Math.round(order.audio)}) < 公屏(${Math.round(order.chat)})`);
    await ctx.close();
  }

  console.log(out.join('\n'));
  console.log(fail ? `\n❌ 失败 ${fail} 项` : '\n✅ 全部通过：画面舞台处处 16:9，版式无重叠无溢出');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
