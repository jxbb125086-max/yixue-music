// 确保 polyfill 在最顶部
import { Buffer } from 'buffer'
import process from 'process'
import stream from 'stream-browserify'
import util from 'util'
import events from 'events'
import assert from 'assert'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 全局注入
window.Buffer = Buffer
window.process = process
window.stream = stream
window.util = util
window.events = events
window.assert = assert
window.global = window

// 原有导入
import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import './style.css'
import router from './router/index.js'

// 触屏设备标记：全屏时竖屏要把画面转 90°，桌面（有鼠标）不转
try {
    if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
        document.documentElement.classList.add('is-touch')
    }
} catch (e) { /* 忽略 */ }

// ── 真实可视尺寸变量（老安卓适配）──
// 老安卓 Chrome 的 100vh 会把地址栏下方的高度也算进去，页面底部被顶出屏幕；
// CSS 在 100vh 与 100dvh 之间还有一级 calc(var(--vh) * 100)，就靠这里喂真实值。
// 跟随 resize / 转屏 / 地址栏伸缩（visualViewport）实时更新。
;(function () {
    const root = document.documentElement
    let raf = 0
    function apply() {
        raf = 0
        const vv = window.visualViewport
        const h = vv ? vv.height : window.innerHeight
        const w = vv ? vv.width : window.innerWidth
        if (h > 0) root.style.setProperty('--vh', (h * 0.01) + 'px')
        if (w > 0) root.style.setProperty('--vw', (w * 0.01) + 'px')
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(apply) }
    apply()
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule)
})()

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')
