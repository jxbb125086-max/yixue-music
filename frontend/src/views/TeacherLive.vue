<template>
  <div class="salon">
    <!-- ═══ 顶栏 ═══ -->
    <header class="topbar">
      <div class="brand">
        <svg class="logo" viewBox="0 0 28 28" width="30" height="30" aria-hidden="true">
          <rect x="1.5" y="1.5" width="25" height="25" rx="8" fill="#E0B15E"/>
          <rect x="6.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="11.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="16.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="9.2" y="7" width="2.2" height="8.5" fill="#E0B15E"/>
          <rect x="14.2" y="7" width="2.2" height="8.5" fill="#E0B15E"/>
        </svg>
        <span class="topbar-title">易学音乐沙龙</span>
      </div>
      <div v-if="stage === 'live'" class="topbar-link">
        <span class="tl-label">学生链接</span>
        <span class="tl-url" :title="classUrl">{{ classUrl }}</span>
        <button class="tl-btn" @click="copyLink">复制</button>
        <button class="tl-btn ghost hide-m" @click="openLink">打开</button>
      </div>
      <div class="topbar-right">
        <span v-if="stage === 'live'" class="chip gold hide-m">房间 {{ currentRoomId }}</span>
        <span v-if="teacherName" class="chip hide-m">{{ teacherName }} · 老师</span>
        <el-button v-if="stage === 'live'" size="small" class="btn-danger-ghost" @click="endClass">停止上课</el-button>
      </div>
    </header>

    <!-- ═══ ① 进入：姓名 ═══ -->
    <main v-if="stage === 'entry'" class="entry">
      <div class="entry-card card">
        <svg class="logo-lg" viewBox="0 0 28 28" width="72" height="72" aria-hidden="true">
          <rect x="1.5" y="1.5" width="25" height="25" rx="8" fill="#E0B15E"/>
          <rect x="6.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="11.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="16.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="9.2" y="7" width="2.2" height="8.5" fill="#E0B15E"/>
          <rect x="14.2" y="7" width="2.2" height="8.5" fill="#E0B15E"/>
        </svg>
        <h1 class="entry-title">易学音乐沙龙</h1>
        <p class="entry-sub">屏幕共享 · 实时连线 · 公屏互动<br/>一间随开随用的线上音乐教室</p>
        <div class="entry-field">
          <label class="field-label">您的姓名 <span class="field-tip">学员将看到</span></label>
          <el-input v-model="teacherNameInput" placeholder="例如：李老师" maxlength="12" size="large"
            @keyup.enter="enterPrep" />
        </div>
        <el-button class="btn-primary entry-btn" size="large" @click="enterPrep">进入沙龙 →</el-button>
        <div class="entry-steps">
          <div class="step"><i>1</i><span>输入姓名</span></div>
          <div class="step"><i>2</i><span>检查设备</span></div>
          <div class="step"><i>3</i><span>开始上课</span></div>
        </div>
      </div>
    </main>

    <!-- ═══ ② 课前准备 ═══ -->
    <main v-else-if="stage === 'prep'" class="prep">
      <div class="prep-card card">
        <h2 class="prep-title">准备好，就开始了</h2>
        <p class="prep-sub">花三十秒检查设备，上课后也能随时改</p>

        <div class="field">
          <div class="field-label">🎤 麦克风 <span class="field-tip">学生听您说话、弹琴</span></div>
          <div class="field-row">
            <el-select v-model="selectedMic" placeholder="选择麦克风" class="grow" @change="onMicChange">
              <el-option v-for="d in audioDevices.mics" :key="d.deviceId"
                :label="d.label || '麦克风 ' + (audioDevices.mics.indexOf(d)+1)" :value="d.deviceId" />
            </el-select>
            <div class="vol-bar"><div class="vol-fill" :style="{ width: micVolume + '%' }"></div></div>
            <span class="vol-val">{{ micVolume }}%</span>
            <el-button @click="testMic" :loading="testingMic">试听</el-button>
          </div>
        </div>

        <div class="field">
          <div class="field-label">🔊 扬声器 <span class="field-tip">您听学员说话</span></div>
          <el-select v-model="selectedSpeaker" placeholder="选择扬声器" class="grow" @change="onSpeakerChange">
            <el-option v-for="d in audioDevices.speakers" :key="d.deviceId"
              :label="d.label || '扬声器 ' + (audioDevices.speakers.indexOf(d)+1)" :value="d.deviceId" />
          </el-select>
        </div>

        <div class="field">
          <div class="field-label">🎹 声音模式</div>
          <div class="mode-cards">
            <div class="mode-card" :class="{ active: isMusicMode }" @click="setMusicMode(true)">
              <b>钢琴音质</b>
              <span>不加工、原样传输，弹琴音色最好</span>
            </div>
            <div class="mode-card" :class="{ active: !isMusicMode }" @click="setMusicMode(false)">
              <b>说话音质</b>
              <span>降噪更清晰，适合讲话多的时候</span>
            </div>
          </div>
        </div>

        <!-- 移动端老师：没有屏幕共享，用摄像头作为视频源 -->
        <div v-if="mobileTeacher" class="field">
          <div class="field-label">📷 视频源 <span class="field-tip">移动端用摄像头代替屏幕共享</span></div>
          <div class="mode-cards">
            <div class="mode-card" :class="{ active: !camSourceOn }" @click="!camSourceOn && startCamSource()">
              <b>开启摄像头源</b>
              <span>用后置摄像头作为画面，学员可看到你</span>
            </div>
            <div class="mode-card" :class="{ active: camSourceOn }" @click="camSourceOn && stopCamSource()">
              <b>关闭摄像头源</b>
              <span>停止向学员传输画面</span>
            </div>
          </div>
          <div v-if="camSourceOn" class="cam-source-preview">
            <video ref="camSourcePreview" autoplay playsinline muted></video>
          </div>
        </div>

        <el-button class="btn-primary start-btn" size="large" @click="startClass">开始上课</el-button>
        <p class="prep-tip">💡 桌面端：共享屏幕（教学排版台）；移动端：开启摄像头作为视频源</p>
      </div>
    </main>

    <!-- ═══ ③ 上课中 ═══ -->
    <main v-else class="live" ref="liveRef">
      <div class="live-main" ref="mainRef">
        <!-- 舞台：教学排版采集进来是 16:9，这里就固定 16:9，画面刚好铺满不留黑边 -->
        <div class="stage-area" ref="areaRef" :class="{ 'is-immersive': immersive }">
          <div class="video-stage card" ref="stageRef" :class="{ immersive }">
            <video ref="videoRef" autoplay muted playsinline></video>
            <div class="live-badge"><span class="rec-dot"></span>直播中 · {{ formatTime(classSeconds) }}</div>
            <button v-if="!immersive" class="fs-btn" :class="{ on: nativeFs }" @click="toggleFullscreen"
              :title="nativeFs ? '退出全屏（Esc）' : '全屏观看'">
              <svg v-if="!nativeFs" viewBox="0 0 24 24" width="16" height="16" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 9h5V4M20 9h-5V4M20 15h-5v5M4 15h5v5" />
              </svg>
              <span>{{ nativeFs ? '退出全屏' : '全屏' }}</span>
            </button>
            <button v-if="needTap" class="resume-btn" @click="resumeVideo">▶ 点击继续播放</button>
            <div v-if="!streamReady" class="video-hint">正在获取屏幕共享画面…</div>
          </div>
        </div>

        <!-- 沉浸式全屏时的浮层（在旋转容器外面，永远正着）——只有退出按钮，画面之外不放任何东西 -->
        <template v-if="immersive">
          <button class="immersive-exit" @click="toggleFullscreen" title="退出全屏">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </template>

        <div class="audio-strip card">
          <div class="strip-group">
            <span class="strip-label">麦克风</span>
            <el-select v-model="selectedMic" class="strip-select" size="small" @change="onMicChange">
              <el-option v-for="d in audioDevices.mics" :key="d.deviceId"
                :label="d.label || '麦克风 ' + (audioDevices.mics.indexOf(d)+1)" :value="d.deviceId" />
            </el-select>
            <div class="vol-bar sm"><div class="vol-fill" :style="{ width: micVolume + '%' }"></div></div>
          </div>
          <div class="strip-group hide-m">
            <span class="strip-label">扬声器</span>
            <el-select v-model="selectedSpeaker" class="strip-select" size="small" @change="onSpeakerChange">
              <el-option v-for="d in audioDevices.speakers" :key="d.deviceId"
                :label="d.label || '扬声器 ' + (audioDevices.speakers.indexOf(d)+1)" :value="d.deviceId" />
            </el-select>
          </div>
          <div class="strip-group">
            <span class="strip-label">声音</span>
            <el-button size="small" class="btn-ghost" @click="toggleAudioMode">
              {{ isMusicMode ? '🎵 钢琴音质' : '🗣️ 说话音质' }}
            </el-button>
          </div>
          <el-button class="strip-rec" size="small" :class="isRecording ? 'btn-danger-ghost' : 'btn-ghost'"
            @click="isRecording ? stopRecording() : startRecording()">
            {{ isRecording ? '⏹ 停止 ' + formatRecordTime(recordSeconds) : '⏺ 录制' }}
          </el-button>
        </div>
      </div>

      <aside class="live-rail">
        <!-- 学员 + 连线管理 -->
        <section class="card rail-card">
          <header class="rail-head">
            <span class="rail-title">👥 沙龙学员</span>
            <span class="chip">{{ students.length }} 人在线</span>
          </header>
          <div v-if="!students.length" class="rail-empty">
            还没有学员加入<br/>把顶栏的学生链接发给学员即可
          </div>
          <div class="student-scroll">
            <div v-for="u in students" :key="u.id" class="student-row" :class="{ speaking: u.micOn, camOn: u.camOn }">
              <span class="avatar" :class="{ on: u.micOn, cam: u.camOn }">{{ (u.name || '?').slice(0, 1) }}</span>
              <div class="student-meta">
                <span class="student-name">{{ u.name }}</span>
                <span class="student-state" :class="{ on: u.micOn }">
                  <template v-if="speakingId === u.id && speakingStatus === 'live'">● 连线中</template>
                  <template v-else-if="speakingId === u.id && speakingStatus === 'invited'">邀请中…</template>
                  <template v-else>在线</template>
                  <template v-if="u.camOn"> 📷</template>
                </span>
              </div>
              <div class="student-actions">
                <template v-if="speakingId === u.id">
                  <el-button size="small" class="btn-ghost" @click="endSpeak">断开</el-button>
                </template>
                <template v-else>
                  <el-button size="small" type="primary" @click="inviteSpeak(u.id)">邀请连线</el-button>
                </template>
                <el-button size="small" class="btn-danger-ghost" @click="kickStudent(u.id)">请出</el-button>
              </div>
            </div>
          </div>
          <p class="rail-hint">点「邀请连线」后，学员端的连线按钮会变绿，TA 点击即接入声音，公屏也会播报</p>
        </section>

        <!-- 学员摄像头画面窗（公屏上方，按学员逐个显示） -->
        <template v-for="u in students" :key="'cam-' + u.id">
          <div v-if="u.camOn" class="card cam-rail-item">
            <header class="rail-head">
              <span class="rail-title">📷 {{ u.name }}</span>
              <span class="chip">摄像头</span>
            </header>
            <div class="cam-rail-body">
              <video ref="el => setStudentCamRef(u.id, el)" autoplay playsinline muted class="cam-rail-video"></video>
            </div>
          </div>
        </template>

        <!-- 公屏聊天 -->
        <section class="card rail-card chat-card">
          <header class="rail-head">
            <span class="rail-title">💬 沙龙公屏</span>
            <span class="chip">{{ chatMessages.length }} 条</span>
          </header>
          <div class="chat-scroll" ref="chatScroll">
            <div v-if="!chatMessages.length" class="chat-empty">学员发的消息会显示在这里</div>
            <div v-else class="chat-list">
              <template v-for="msg in chatMessages" :key="msg.id">
                <div v-if="msg.senderRole === 'system'" class="msg-sys"><span>{{ msg.content }}</span></div>
                <div v-else class="msg-row" :class="'role-' + msg.senderRole">
                  <span class="msg-name">{{ msg.senderName }}</span>
                  <div class="msg-bubble" v-html="escapeHtml(msg.content)"></div>
                </div>
              </template>
            </div>
          </div>
          <div class="chat-input-row">
            <div class="emoji-wrap" ref="emojiWrap">
              <el-button class="emoji-trigger" @click="showEmojiPicker = !showEmojiPicker" title="表情">😊</el-button>
              <div v-if="showEmojiPicker" class="emoji-panel">
                <button v-for="e in emojis" :key="e" class="emoji-btn" @click="insertEmoji(e)">{{ e }}</button>
              </div>
            </div>
            <el-input v-model="chatInput" placeholder="说点什么，回车发送" size="default" @keyup.enter="sendChat" />
            <el-button type="primary" @click="sendChat">发送</el-button>
          </div>
        </section>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { io } from 'socket.io-client'
import SimplePeer from 'simple-peer'
import { ElMessage, ElMessageBox } from 'element-plus'

// 生产模式（前后端同端口部署）用同源连接；vite 开发模式(5173)才需要指定后端地址
const SERVER_URL = import.meta.env && import.meta.env.DEV ? 'http://localhost:3000' : undefined

// ── 流程状态：entry(姓名) → prep(设备) → live(上课中) ──
const stage = ref('entry')
const teacherNameInput = ref('')
const teacherName = ref('')

// 老师端是否使用摄像头作为视频源（移动端没有屏幕共享时用）
const useCamSource = ref(false)
const camSourceOn = ref(false)   // 摄像头源是否正在采集
const camSourcePreview = ref(null) // 本地预览 <video>
let camSourceStream = null       // 摄像头源流
// 老师端自己收到的学生摄像头画面（video refs 池，按 studentId 存）
const studentCamRefs = {}        // studentId → HTMLVideoElement
const studentCamNames = {}       // studentId → name（显示名字）

const videoRef = ref(null)
const stageRef = ref(null)
const mainRef = ref(null)
const areaRef = ref(null)
const liveRef = ref(null)
const nativeFs = ref(false)     // 浏览器全屏中
const immersive = ref(false)    // CSS 沉浸式全屏中
const chatScroll = ref(null)

const currentRoomId = ref('')
const classUrl = ref('')
const isClassStarted = ref(false)
const streamReady = ref(false)
const onlineUsers = ref([])
const speakingId = ref(null)
const speakingStatus = ref(null)

// ── 播放守卫状态（浏览器会把全屏切换中的视频暂停，需要主动续播）──
const wantsPlay = ref(false)
const needTap = ref(false)
let playFails = 0

const chatMessages = ref([])
const chatInput = ref('')
const emojis = ['😊', '💗', '😅', '😂', '🙋', '👏', '🤝']
const showEmojiPicker = ref(false)
const emojiWrap = ref(null)
function insertEmoji(e) {
    chatInput.value += e
    showEmojiPicker.value = false
}

// 计时 & 录制
const classSeconds = ref(0)
let classTimer = null
const isRecording = ref(false)
const recordSeconds = ref(0)
let recordTimer = null

// 音频设备
const audioDevices = reactive({ mics: [], speakers: [] })
const selectedMic = ref('')
const selectedSpeaker = ref('')
const testingMic = ref(false)
const micVolume = ref(0)
const isMusicMode = ref(localStorage.getItem('mc_audio_mode') !== 'voice')

// 网络 & 媒体
let socket = null
let socketClosed = false
let peers = {}            // studentId → SimplePeer
let stream = null         // 屏幕共享流
let micStream = null      // 推给学生的麦克风流
let peerStream = null     // 推给学生的完整流（画面+麦声）
let recorder = null
let recordingChunks = []
let audioContext = null, analyser = null, micSource = null, volumeInterval = null
let teacherMicStream = null

const students = computed(() => onlineUsers.value.filter(u => u.role === 'student'))

// ── 工具 ──
function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
}
function formatRecordTime(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return (h > 0 ? h + ':' : '') + m + ':' + sec
}
function formatClock(ts) { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
function escapeHtml(str) {
    const div = document.createElement('div'); div.textContent = str; return div.innerHTML
}
function copyLink() {
    navigator.clipboard.writeText(classUrl.value).then(() => ElMessage.success('链接已复制，发给学生即可'))
}
function openLink() { window.open(classUrl.value, '_blank') }

// ── 主列宽度 = 画面宽度，右栏吃掉所有剩余宽度 ──
// 画面是 16:9，窗口又宽又扁时会被「高度」卡住、比整列窄，于是画面和右栏之间空出一大块。
// 这里直接把主列宽度锁成画面宽度，右栏 flex 吃满剩余 → 任何尺寸都没有空隙。
// 关键：必须按「舞台可用高度」反算，绝不能按「当前画面宽度」迭代，
// 否则 width 变窄 → 可用高度变小 → 算出来更窄，会一路缩到底（自反馈死循环）。
let liveRO = null
function layoutLive() {
    const live = liveRef.value, area = areaRef.value, main = mainRef.value
    if (!live || !area || !main || !live.isConnected) return
    if (immersive.value || nativeFs.value) return       // 全屏时画面铺满视口，不用算
    if (window.innerWidth < 900) { main.style.width = ''; return }  // 单列布局，交给 CSS
    const availH = area.clientHeight
    if (availH < 120) return
    const cs = getComputedStyle(live)
    const totalW = live.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const gap = 16
    // 右栏的理想宽度（跟原来的 CSS clamp 一致），画面放得下就按它，放不下再让右栏吃剩余
    const railIdeal = Math.min(Math.max(window.innerWidth * 0.27, 352), 496)
    const byHeight = Math.round(availH * 16 / 9)
    const byWidth = Math.round(totalW - railIdeal - gap)
    const w = Math.max(320, Math.min(byHeight, byWidth))
    main.style.width = w + 'px'
}
function watchLiveLayout() {
    const live = liveRef.value
    if (!live) return
    if (typeof ResizeObserver === 'undefined') { layoutLive(); return }
    if (liveRO) liveRO.disconnect()
    liveRO = new ResizeObserver(layoutLive)
    liveRO.observe(live)
    // 首帧音频条可能先换行再回单行，量两遍就稳了
    requestAnimationFrame(() => { layoutLive(); requestAnimationFrame(layoutLive) })
}
function unwatchLiveLayout() {
    if (liveRO) { liveRO.disconnect(); liveRO = null }
}

// ── 全屏观看 ──
// 两条路：① 浏览器全屏（桌面 / Android）② CSS 沉浸式（iPhone / 应用内浏览器）
// 注意：**绝不能用 video.webkitEnterFullscreen()**，那会把 <video> 交给系统播放器，
// 退出后视频被暂停、还可能被搬离播放框，只能手动点播放才能恢复。
// 另外浏览器进出全屏一定会暂停媒体，所以每次状态变化后都要主动续播。
function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null }

function setImmersive(on) {
    const next = !!on
    if (immersive.value === next) return
    immersive.value = next
    document.documentElement.classList.toggle('stage-locked', next)
    if (next) lockLandscape()
    else { unlockOrientation(); resumeVideoSoon(); nextTick(layoutLive) }
}

async function toggleFullscreen() {
    const el = stageRef.value
    if (!el) return
    if (fsElement()) {
        try {
            const exit = document.exitFullscreen || document.webkitExitFullscreen
            if (exit) await exit.call(document)
        } catch (e) { /* 忽略 */ }
        return
    }
    if (immersive.value) { setImmersive(false); return }

    if (el.requestFullscreen || el.webkitRequestFullscreen) {
        try {
            if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
            else await el.webkitRequestFullscreen()
            lockLandscape()
            resumeVideoSoon()
            return
        } catch (e) { /* 被拒 → 退回 CSS 沉浸式 */ }
    }
    setImmersive(true)
}

// 手机上顺手锁横屏：讲课画面是 16:9，横着看才够大（不支持的浏览器直接忽略）
function lockLandscape() {
    try {
        const o = screen.orientation
        if (o && typeof o.lock === 'function') o.lock('landscape').catch(() => { })
    } catch (e) { /* 忽略 */ }
}
function unlockOrientation() {
    try {
        const o = screen.orientation
        if (o && typeof o.unlock === 'function') o.unlock()
    } catch (e) { /* 忽略 */ }
}

// ── 播放守卫 ──
// 浏览器在进出全屏、切后台回来时会把 <video> 暂停；只要「应该正在播」就自动续播。
function resumeVideo() {
    const v = videoRef.value
    if (!v || !wantsPlay.value) return
    if (!v.srcObject && stream) v.srcObject = stream
    if (!v.paused) return
    const p = v.play()
    if (p && p.catch) {
        p.then(() => { playFails = 0; needTap.value = false })
            .catch(() => { if (++playFails >= 3) needTap.value = true })
    }
}
function resumeVideoSoon(times = 5) {
    let n = 0
    const tick = () => { resumeVideo(); if (++n < times) setTimeout(tick, 160) }
    tick()
}
function onVideoPause() {
    if (!wantsPlay.value || document.hidden) return
    setTimeout(resumeVideo, 80)
}
function onVideoPlaying() { playFails = 0; needTap.value = false }
function bindVideoGuards() {
    const v = videoRef.value
    if (!v || v.dataset.guard === '1') return
    v.dataset.guard = '1'
    v.addEventListener('pause', onVideoPause)
    v.addEventListener('playing', onVideoPlaying)
}
function onVisibility() { if (!document.hidden) resumeVideoSoon() }
function onFullscreenChange() {
    nativeFs.value = !!fsElement()
    if (!nativeFs.value) unlockOrientation()
    resumeVideoSoon()   // ← 关键：进出全屏都立刻续播
    nextTick(layoutLive)
}
function onKeydown(e) {
    if (e.key !== 'Escape') return
    if (immersive.value) setImmersive(false)
}

// ── 学员音频播放（学生连线的声音）──
const studentAudios = {}   // studentId → HTMLAudioElement
const studentStreams = {}  // studentId → MediaStream
function playStudentAudio(id) {
    const s = studentStreams[id]
    if (!s) return
    let a = studentAudios[id]
    if (!a) { a = new Audio(); a.autoplay = true; studentAudios[id] = a }
    if (a.srcObject !== s) a.srcObject = s
    a.play().catch(() => {})
}
function pauseStudentAudio(id) {
    const a = studentAudios[id]
    if (a) a.pause()
}
function stopStudentAudio(id) {
    const a = studentAudios[id]
    if (a) { a.pause(); a.srcObject = null; delete studentAudios[id] }
    delete studentStreams[id]
}

// ── 音频设备 ──
function micConstraints() {
    const base = selectedMic.value ? { deviceId: selectedMic.value } : {}
    if (isMusicMode.value) {
        return { audio: { ...base, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
    }
    return { audio: { ...base, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
}
function toggleAudioMode() {
    isMusicMode.value = !isMusicMode.value
    localStorage.setItem('mc_audio_mode', isMusicMode.value ? 'music' : 'voice')
    ElMessage.success(isMusicMode.value ? '🎵 已切换钢琴音质（保真）' : '🗣️ 已切换说话音质（降噪）')
    if (teacherMicStream) { teacherMicStream.getTracks().forEach(t => t.stop()); teacherMicStream = null }
    startTeacherMicDetection()
}
function setMusicMode(v) { if (isMusicMode.value !== v) toggleAudioMode() }

async function getAudioDevices() {
    try {
        const temp = await navigator.mediaDevices.getUserMedia({ audio: true })
        temp.getTracks().forEach(t => t.stop())
        const devices = await navigator.mediaDevices.enumerateDevices()
        audioDevices.mics = devices.filter(d => d.kind === 'audioinput')
        audioDevices.speakers = devices.filter(d => d.kind === 'audiooutput')
        if (audioDevices.mics.length > 0 && !selectedMic.value) selectedMic.value = audioDevices.mics[0].deviceId
        await startTeacherMicDetection()
    } catch (e) { console.error('获取设备失败', e) }
}

async function startTeacherMicDetection() {
    try {
        teacherMicStream = await navigator.mediaDevices.getUserMedia(micConstraints())
        startVolumeDetection(teacherMicStream)
    } catch (e) { console.error('[老师麦克风] 获取失败:', e) }
}

function startVolumeDetection(mediaStream) {
    stopVolumeDetection()
    if (!mediaStream?.getAudioTracks().length) return
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.3
    micSource = audioContext.createMediaStreamSource(mediaStream)
    micSource.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    volumeInterval = setInterval(() => {
        if (audioContext.state === 'suspended') audioContext.resume()
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x }
        micVolume.value = Math.min(100, Math.round(Math.sqrt(sum / buf.length) * 600))
    }, 30)
}
function stopVolumeDetection() {
    if (volumeInterval) { clearInterval(volumeInterval); volumeInterval = null }
    if (micSource) { micSource.disconnect(); micSource = null }
    if (audioContext) { audioContext.close().catch(() => { }); audioContext = null }
    micVolume.value = 0
}

async function testMic() {
    testingMic.value = true
    try {
        const ts = await navigator.mediaDevices.getUserMedia(micConstraints())
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const src = ctx.createMediaStreamSource(ts)
        const ana = ctx.createAnalyser(); ana.fftSize = 2048
        src.connect(ana)
        const buf = new Uint8Array(ana.fftSize)
        let hasSound = false
        const iv = setInterval(() => {
            ana.getByteTimeDomainData(buf)
            let sum = 0
            for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x }
            if (Math.sqrt(sum / buf.length) * 400 > 0.05) hasSound = true
        }, 100)
        setTimeout(() => {
            clearInterval(iv); ctx.close()
            ts.getTracks().forEach(t => t.stop())
            testingMic.value = false
            ElMessage.success(hasSound ? '✅ 麦克风正常' : '⚠️ 未检测到声音，请检查麦克风')
        }, 2000)
    } catch (e) {
        ElMessage.error('测试失败: ' + e.message)
        testingMic.value = false
    }
}

function onMicChange() {
    if (teacherMicStream) { teacherMicStream.getTracks().forEach(t => t.stop()); teacherMicStream = null }
    startTeacherMicDetection()
    if (stream) {
        const old = stream.getAudioTracks()[0]
        if (old) old.stop()
        navigator.mediaDevices.getUserMedia(micConstraints())
            .then(newStream => { stream.addTrack(newStream.getAudioTracks()[0]); ElMessage.success('麦克风已切换') })
            .catch(() => ElMessage.error('切换失败'))
    }
}
function onSpeakerChange() {
    if (videoRef.value && typeof videoRef.value.setSinkId === 'function') {
        videoRef.value.setSinkId(selectedSpeaker.value)
            .then(() => ElMessage.success('扬声器已切换'))
            .catch(() => ElMessage.warning('切换失败'))
    }
}

// ── 录制 ──
function startRecording() {
    if (!peerStream) { ElMessage.warning('请先开始上课'); return }
    if (!window.MediaRecorder) { ElMessage.error('当前浏览器不支持录制'); return }
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || ''
    recorder = new MediaRecorder(peerStream, { mimeType: mimeType || undefined, videoBitsPerSecond: 2500000 })
    recordingChunks = []
    recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunks.push(e.data) }
    recorder.onstop = () => {
        const blob = new Blob(recordingChunks, { type: mimeType || 'video/webm' })
        recordingChunks = []
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `沙龙录制_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.webm`
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(url)
        ElMessage.success('录制已保存')
    }
    recorder.start(1000)
    isRecording.value = true
    recordSeconds.value = 0
    recordTimer = setInterval(() => recordSeconds.value++, 1000)
    ElMessage.success('开始录制（含当前麦克风声音）')
}
function stopRecording() {
    if (recorder && recorder.state !== 'inactive') { recorder.stop(); recorder = null }
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
    isRecording.value = false
}

// ── 聊天 ──
function sendChat() {
    const content = chatInput.value.trim()
    if (!content || !currentRoomId.value || !socket) return
    socket.emit('chat-message', { roomId: currentRoomId.value, content })
    chatInput.value = ''
    showEmojiPicker.value = false
}
watch(() => chatMessages.value.length, () => {
    nextTick(() => { const el = chatScroll.value; if (el) el.scrollTop = el.scrollHeight })
})

// ── 连线管理 ──
function inviteSpeak(studentId) {
    if (!socket || !currentRoomId.value) return
    socket.emit('invite-speak', { studentId, roomId: currentRoomId.value })
}
function endSpeak() {
    if (!socket || !currentRoomId.value) return
    socket.emit('teacher-end-speak', currentRoomId.value)
}
function kickStudent(studentId) {
    ElMessageBox.confirm('确定将该学员请出沙龙？', '请出学员', { type: 'warning' })
        .then(() => {
            if (currentRoomId.value) socket.emit('kick-student', { studentId, roomId: currentRoomId.value })
            ElMessage.success('已请出')
        }).catch(() => { })
}

// ── 老师端摄像头源（移动端替代屏幕共享）──
function isMobileEnv() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 900)
}
// 移动端没有屏幕共享，用摄像头作为视频源；桌面端保留屏幕共享
const mobileTeacher = computed(() => isMobileEnv())
async function startCamSource() {
    if (!navigator.mediaDevices?.getUserMedia) { ElMessage.error('此设备无法使用摄像头'); return }
    try {
        camSourceStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
        })
        camSourceOn.value = true
        await nextTick()
        if (camSourcePreview.value) { camSourcePreview.value.srcObject = camSourceStream; camSourcePreview.value.play().catch(() => { }) }
        // 上课中切换视频源 → 重建 peerStream（保留原有音频轨）
        if (stage.value === 'live' && peerStream) {
            const audio = peerStream.getAudioTracks()
            const rebuilt = new MediaStream([camSourceStream.getVideoTracks()[0], ...audio])
            peerStream = rebuilt
            Object.values(peers).forEach(p => {
                if (!p || p.destroyed) return
                try { p.removeStream(rebuilt) } catch (e) { }
                try { p.addStream(rebuilt) } catch (e) { }
            })
        }
        ElMessage.success('📷 摄像头源已开启，学员可看到你的画面')
    } catch (e) {
        console.error('开启摄像头源失败', e)
        ElMessage.error('无法开启摄像头：' + (e.message || e))
    }
}
function stopCamSource() {
    if (camSourceStream) camSourceStream.getTracks().forEach(t => t.stop())
    camSourceStream = null; camSourceOn.value = false
    if (camSourcePreview.value) camSourcePreview.value.srcObject = null
}

// 学员摄像头画面（显示在公屏上方的小窗口，随 stream 到达自动挂载）
function setStudentCamRef(id, el) {
    if (el) {
        studentCamRefs[id] = el
        const s = studentStreams[id]
        if (s) {
            const vt = s.getVideoTracks()[0]
            if (vt) {
                el.srcObject = new MediaStream([vt])
                el.play().catch(() => { })
            }
        }
    } else {
        delete studentCamRefs[id]
    }
}
function showStudentCam(id, stream) {
    const vt = stream.getVideoTracks()[0]
    if (!vt) return
    const el = studentCamRefs[id]
    if (el) {
        el.srcObject = new MediaStream([vt])
        el.play().catch(() => { })
    }
}
function hideStudentCam(id) {
    const el = studentCamRefs[id]
    if (el) { el.srcObject = null }
}

// ── 流程 ──
function enterPrep() {
    const name = teacherNameInput.value.trim()
    if (!name) { ElMessage.warning('请先输入您的姓名'); return }
    teacherName.value = name
    stage.value = 'prep'
}

async function startClass() {
    // 移动端没有屏幕共享：用摄像头 + 麦克风作为视频/音频源
    if (mobileTeacher.value) {
        try {
            camSourceStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
            })
            camSourceOn.value = true
        } catch (e) {
            ElMessage.error('无法开启摄像头，移动端需要摄像头才能开课')
            return
        }
        try { micStream = await navigator.mediaDevices.getUserMedia(micConstraints()) }
        catch (e) { console.warn('麦克风获取失败', e); micStream = null }

        peerStream = new MediaStream([
            ...(camSourceStream ? camSourceStream.getVideoTracks() : []),
            ...(micStream ? micStream.getAudioTracks() : [])
        ])
        stream = camSourceStream   // 复用 stream 变量：本地预览 + 后续操作都按 stream 处理
        streamReady.value = true
    } else {
        try {
            // 桌面端：屏幕共享 + 麦克风
            const screenAudio = selectedMic.value ? false : { systemAudio: 'include' }
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'hidden', frameRate: 15 },
                audio: screenAudio
            })
            streamReady.value = true
            try { micStream = await navigator.mediaDevices.getUserMedia(micConstraints()) }
            catch (e) { console.warn('麦克风获取失败，学生可能听不到声音', e); micStream = null }

            peerStream = new MediaStream([
                ...stream.getVideoTracks(),
                ...(micStream ? micStream.getAudioTracks() : [])
            ])
        } catch (e) {
            console.error('屏幕共享失败', e)
            let msg = '获取屏幕共享失败'
            if (e && e.name === 'NotAllowedError') {
                msg = '屏幕共享被拒绝。macOS 请在「系统设置 → 隐私与安全性 → 屏幕录制」中勾选当前浏览器，并重启浏览器'
            } else if (e && e.name === 'NotFoundError') {
                msg = '没有找到可共享的屏幕或窗口'
            } else if (e && e.name === 'NotReadableError') {
                msg = '无法读取屏幕画面，请检查屏幕录制权限'
            } else if (e && e.message) {
                msg = '获取屏幕共享失败：' + e.message
            }
            ElMessage.error(msg)
            return
        }
    }

    stage.value = 'live'
    isClassStarted.value = true
    classSeconds.value = 0
    if (classTimer) clearInterval(classTimer)
    classTimer = setInterval(() => classSeconds.value++, 1000)

    nextTick(() => {
        if (videoRef.value) {
            videoRef.value.srcObject = stream
            wantsPlay.value = true
            bindVideoGuards()
            resumeVideoSoon()
            if (selectedSpeaker.value && typeof videoRef.value.setSinkId === 'function')
                videoRef.value.setSinkId(selectedSpeaker.value).catch(() => { })
        }
        watchLiveLayout()
    })

    // 屏幕共享被手动停止时（桌面端）自动停录制 + 更新 UI；移动端摄像头源没有 ended 事件，忽略
    if (stream && !mobileTeacher.value) {
        stream.getVideoTracks().forEach(t => t.addEventListener('ended', () => {
            if (isRecording.value) stopRecording()
            streamReady.value = false
            stage.value = 'prep'
            isClassStarted.value = false
            if (classTimer) { clearInterval(classTimer); classTimer = null }
            ElMessage.warning('屏幕共享已停止')
        }))
    }

    // ── 建立信令连接（带老师姓名）──
    socket = io(SERVER_URL, {
        reconnection: true, reconnectionAttempts: Infinity,
        reconnectionDelay: 1000, reconnectionDelayMax: 10000, timeout: 5000
    })
    setupListeners()

    socket.emit('create-room', { teacherName: teacherName.value }, roomId => {
        currentRoomId.value = roomId
        classUrl.value = `${location.origin}/student/${roomId}`
        ElMessage.success('课程已开始，把学生链接发给学员吧')
    })

    socket.on('disconnect', reason => {
        if (socketClosed || reason === 'io client disconnect') return
        ElMessage.warning('⚠️ 连接断开，正在自动重连...')
    })
    socket.on('reconnect', () => {
        if (socketClosed) return
        ElMessage.success('✅ 连接已恢复')
        if (isClassStarted.value && peerStream) {
            Object.values(peers).forEach(p => { try { p.destroy() } catch (e) { } })
            peers = {}
            socket.emit('rebuild-peers', { roomId: currentRoomId.value })
        }
    })
}

function setupListeners() {
    socket.on('room-users', users => { onlineUsers.value = users })
    socket.on('speak-state', ({ studentId, status }) => {
        speakingId.value = studentId
        speakingStatus.value = status
    })
    socket.on('user-mic-update', ({ id, micOn }) => {
        const u = onlineUsers.value.find(u => u.id === id)
        if (u) u.micOn = micOn
        if (micOn) playStudentAudio(id); else pauseStudentAudio(id)
    })
    socket.on('chat-history', history => { chatMessages.value = history || [] })
    socket.on('chat-message', msg => { chatMessages.value.push(msg) })

    socket.on('signal', ({ from, signal }) => {
        if (peers[from]) try { peers[from].signal(signal) } catch (e) { }
    })

    // 学生加入 → 提示 + 发起连接（推流）
    socket.on('user-joined', ({ id, name }) => {
        if (name) ElMessage.info(`${name} 加入了沙龙`)
        if (!peerStream || peers[id]) return
        const peer = new SimplePeer({
            initiator: true, trickle: false, stream: peerStream, objectMode: true, sdpTransform: s => s
        })
        peer.on('signal', sig => socket.emit('signal', { to: id, from: socket.id, signal: sig }))
        peer.on('stream', s => {
            studentStreams[id] = s
            // 上行音频
            if (s.getAudioTracks().length) {
                const u = onlineUsers.value.find(u => u.id === id)
                if (u?.micOn) playStudentAudio(id)
            }
            // 上行视频（摄像头）→ 显示在公屏上方
            if (s.getVideoTracks().length) {
                studentCamNames[id] = name
                showStudentCam(id, s)
            }
        })
        peer.on('error', err => console.error('Peer error', err))
        peer.on('close', () => { stopStudentAudio(id); hideStudentCam(id); delete peers[id] })
        peers[id] = peer
    })

    // 学生重连后单独重建 peer
    socket.on('student-rejoined', ({ studentId }) => {
        if (!peerStream) return
        if (peers[studentId]) { try { peers[studentId].destroy() } catch (e) { } }
        stopStudentAudio(studentId)
        hideStudentCam(studentId)
        const peer = new SimplePeer({
            initiator: true, trickle: false, stream: peerStream, objectMode: true, sdpTransform: s => s
        })
        peer.on('signal', sig => socket.emit('signal', { to: studentId, from: socket.id, signal: sig }))
        peer.on('stream', s => {
            studentStreams[studentId] = s
            if (s.getAudioTracks().length) {
                const u = onlineUsers.value.find(u => u.id === studentId)
                if (u?.micOn) playStudentAudio(studentId)
            }
            if (s.getVideoTracks().length) showStudentCam(studentId, s)
        })
        peer.on('error', err => console.error('Peer error', err))
        peer.on('close', () => { stopStudentAudio(studentId); hideStudentCam(studentId); delete peers[studentId] })
        peers[studentId] = peer
    })

    // 老师重连 → 重建所有 peer
    socket.on('rebuild-peers', () => {
        if (!peerStream) return
        onlineUsers.value.forEach(u => {
            if (u.role === 'student' && !peers[u.id]) {
                const peer = new SimplePeer({
                    initiator: true, trickle: false, stream: peerStream, objectMode: true, sdpTransform: s => s
                })
                peer.on('signal', sig => socket.emit('signal', { to: u.id, from: socket.id, signal: sig }))
                peer.on('stream', s => {
                    studentStreams[u.id] = s
                    if (s.getAudioTracks().length) {
                        if (u.micOn) playStudentAudio(u.id)
                    }
                    if (s.getVideoTracks().length) showStudentCam(u.id, s)
                })
                peer.on('error', err => console.error('Peer error', err))
                peer.on('close', () => { stopStudentAudio(u.id); hideStudentCam(u.id); delete peers[u.id] })
                peers[u.id] = peer
            }
        })
    })

    // 学员摄像头开关（来自 user-cam-update 事件）
    socket.on('user-cam-update', ({ id, camOn }) => {
        const u = onlineUsers.value.find(x => x.id === id)
        if (u) u.camOn = camOn
        if (!camOn) hideStudentCam(id)
    })
}

function endClass() {
    ElMessageBox.confirm('确定结束课程？所有学员将被断开。', '结束课程', { type: 'warning' })
        .then(() => {
            if (isRecording.value) stopRecording()
            if (classTimer) { clearInterval(classTimer); classTimer = null }
            if (currentRoomId.value && socket) socket.emit('end-class', currentRoomId.value)
            Object.values(peers).forEach(p => { try { p.destroy() } catch (e) { } })
            Object.keys(studentAudios).forEach(stopStudentAudio)
            // 清理学员摄像头预览
            Object.keys(studentCamRefs).forEach(k => { delete studentCamRefs[k] })
            peers = {}
            if (stream) stream.getTracks().forEach(t => t.stop())
            if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null }
            stopCamSource()   // 关摄像头源
            peerStream = null
            stopVolumeDetection()
            if (socket) { socketClosed = true; socket.disconnect(); socket = null }
            if (videoRef.value) videoRef.value.srcObject = null
            isClassStarted.value = false
            streamReady.value = false
            speakingId.value = null
            speakingStatus.value = null
            onlineUsers.value = []
            chatMessages.value = []
            stage.value = 'entry'
            teacherNameInput.value = ''
            ElMessage.success('课程已结束')
        }).catch(() => { })
}

function onDocClick(e) {
    if (showEmojiPicker.value && emojiWrap.value && !emojiWrap.value.contains(e.target)) {
        showEmojiPicker.value = false
    }
}
onMounted(async () => {
    document.addEventListener('click', onDocClick)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('keydown', onKeydown)
    await getAudioDevices()
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
    document.removeEventListener('visibilitychange', onVisibility)
    document.removeEventListener('keydown', onKeydown)
    if (fsElement()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document) } catch (e) { } }
    setImmersive(false)
    unlockOrientation()
    unwatchLiveLayout()
    if (isRecording.value) stopRecording()
    socketClosed = true
    stopVolumeDetection()
    if (teacherMicStream) { teacherMicStream.getTracks().forEach(t => t.stop()); teacherMicStream = null }
    Object.values(peers).forEach(p => { try { p.destroy() } catch (e) { } })
    Object.keys(studentAudios).forEach(stopStudentAudio)
    if (stream) stream.getTracks().forEach(t => t.stop())
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null }
    stopCamSource()
    peerStream = null
    if (socket) socket.disconnect()
})
</script>

<style scoped>
.salon { width: 100%; min-height: 100%; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; }

/* ═══ 顶栏 ═══ */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .8rem 1.4rem;
  background: rgba(13,17,23,.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  position: sticky; top: 0; z-index: 50;
  flex-shrink: 0;
}
.brand { display: flex; align-items: center; gap: .65rem; flex-shrink: 0; }
.topbar-title { font-size: 1.2rem; font-weight: 600; letter-spacing: .02em; }
.topbar-right { display: flex; align-items: center; gap: .6rem; flex-shrink: 0; }

/* 顶栏里的学生链接：原来那条占地方的邀请卡挪到这里，画面因此多出 58px 高度 */
.topbar-link {
  display: flex; align-items: center; gap: .5rem; min-width: 0;
  flex: 1 1 auto; max-width: 40rem; margin: 0 1.2rem;
  padding: .26rem .3rem .26rem .8rem;
  background: var(--gold-soft); border: 1px solid var(--gold-line); border-radius: 999px;
}
.tl-label { font-size: .76rem; color: var(--gold); white-space: nowrap; flex-shrink: 0; font-weight: 600; }
.tl-url {
  flex: 1; min-width: 0; font-size: .78rem; color: var(--text-2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}
.tl-btn {
  flex-shrink: 0; padding: .2rem .62rem; border-radius: 999px;
  border: 1px solid transparent; background: var(--gold); color: #1A1408;
  font-size: .74rem; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: filter .15s, background .15s;
}
.tl-btn:hover { filter: brightness(1.1); }
.tl-btn.ghost { background: transparent; border-color: var(--gold-line); color: var(--gold); font-weight: 500; }
.tl-btn.ghost:hover { background: rgba(224,177,94,.15); filter: none; }

/* ═══ ① 进入页 ═══ */
.entry { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem 1.2rem; }
.entry-card {
  width: 100%; max-width: 27rem; padding: 2.8rem 2.2rem; text-align: center;
  background: linear-gradient(180deg, var(--panel) 0%, #101620 100%);
  box-shadow: 0 24px 80px rgba(0,0,0,.5), 0 0 0 1px var(--line);
}
.logo-lg { margin-bottom: 1rem; filter: drop-shadow(0 6px 24px rgba(224,177,94,.35)); }
.entry-title { font-size: 1.9rem; font-weight: 600; margin: 0 0 .6rem; letter-spacing: .04em; }
.entry-sub { color: var(--text-2); font-size: .95rem; line-height: 1.7; margin: 0 0 2.2rem; }
.entry-field { text-align: left; margin-bottom: 1.4rem; }
.field-label { display: block; font-size: .92rem; color: var(--text-2); margin-bottom: .5rem; font-weight: 500; }
.field-tip { color: var(--text-3); font-size: .8rem; font-weight: 400; margin-left: .3rem; }
.entry-btn { width: 100%; height: 3.2rem; font-size: 1.1rem; }
.entry-steps {
  display: flex; justify-content: center; gap: 1.6rem; margin-top: 2rem;
  padding-top: 1.6rem; border-top: 1px dashed var(--line-2);
}
.step { display: flex; align-items: center; gap: .45rem; color: var(--text-3); font-size: .85rem; }
.step i {
  width: 1.4rem; height: 1.4rem; border-radius: 50%; font-style: normal;
  background: var(--gold-soft); color: var(--gold); border: 1px solid var(--gold-line);
  display: inline-flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 600;
}

/* ═══ ② 课前准备 ═══ */
.prep { flex: 1; display: flex; align-items: flex-start; justify-content: center; padding: 2.4rem 1.2rem; overflow-y: auto; }
.prep-card { width: 100%; max-width: 36rem; padding: 2.2rem; }
.prep-title { font-size: 1.45rem; font-weight: 600; margin: 0 0 .3rem; }
.prep-sub { color: var(--text-2); font-size: .9rem; margin: 0 0 2rem; }
.field { margin-bottom: 1.6rem; }
.field-row { display: flex; align-items: center; gap: .8rem; }
.grow { flex: 1; min-width: 0; }
.mode-cards { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.mode-card {
  border: 1px solid var(--line-2); border-radius: var(--r-md); padding: 1rem 1.1rem;
  cursor: pointer; transition: border-color .15s, background .15s; display: flex; flex-direction: column; gap: .3rem;
}
.mode-card:hover { border-color: var(--gold-line); }
.mode-card.active { border: 1.5px solid var(--gold); background: var(--gold-soft); }
.mode-card b { font-size: 1.02rem; }
.mode-card span { font-size: .8rem; color: var(--text-2); line-height: 1.5; }
.mode-card.active span { color: #D9C39A; }
.start-btn { width: 100%; height: 3.4rem; font-size: 1.15rem; margin-top: .6rem; }
.prep-tip {
  text-align: center; color: var(--text-3); font-size: .82rem; line-height: 1.7;
  margin: 1.2rem 0 0; padding: .8rem 1rem; background: rgba(255,255,255,.03); border-radius: var(--r-md);
}

/* ═══ ③ 上课中 ═══
   主列宽度由 JS 锁成「画面宽度」，右栏 flex 吃掉所有剩余宽度 —— 任何窗口尺寸都不会
   在画面和右栏之间留下空白（画面是 16:9，扁窗口下会被高度卡住而比整列窄）。 */
.live {
  flex: 1; display: flex; gap: 1rem; padding: 1rem 1.4rem 1.4rem;
  min-height: 0;
}
.live-main {
  flex: 0 0 auto; width: 100%;
  display: flex; flex-direction: column; gap: 1rem;
  min-width: 0; min-height: 0;
}
/* min-width 保证极窄屏时右栏不会被画面挤没 */
.live-rail { flex: 1 1 auto; min-width: 22rem; display: flex; flex-direction: column; gap: 1rem; min-height: 0; }

/* ═══ 画面舞台：固定 16:9 ═══
   采集端（教学排版台）输出的是 16:9，这里按同样的比例开框，画面刚好铺满。
   用容器查询单位算「能放下的最大 16:9 矩形」，纯 CSS 完成，窗口怎么拉都是 16:9。 */
.stage-area {
  flex: 1; min-height: 0;
  container-type: size;
  display: flex; align-items: center; justify-content: flex-start;
}
/* 沉浸式时一定要关掉 container-type：它会带上 contain:layout，
   那样 position:fixed 就只相对这个盒子定位，铺不满整个视口。 */
.stage-area.is-immersive { container-type: normal; }
.video-stage {
  position: relative;
  width: min(100cqw, calc(100cqh * 16 / 9));
  aspect-ratio: 16 / 9;
  margin: 0;
  background: #05070A; border-color: #222D3D;
  overflow: hidden; display: block;
}
/* cover：源画面正好 16:9 时与 contain 等效；源画面带着黑边时把黑边裁掉，绝不出现双重黑边 */
.video-stage video {
  display: block; width: 100%; height: 100%;
  object-fit: cover; background: #05070A;
}
.video-hint {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: var(--text-3); font-size: .95rem; pointer-events: none;
}
.live-badge {
  position: absolute; top: .8rem; left: .8rem; display: flex; align-items: center; gap: .45rem;
  background: rgba(10,14,20,.78); border: 1px solid var(--line-2); color: #FF7A7F;
  font-size: .78rem; padding: .28rem .8rem; border-radius: 999px; backdrop-filter: blur(8px);
  font-variant-numeric: tabular-nums; pointer-events: none;
}
.rec-dot { width: .5rem; height: .5rem; border-radius: 50%; background: #FF5A5F; animation: recblink 1.2s infinite; }
@keyframes recblink { 0%, 100% { opacity: 1 } 50% { opacity: .25 } }

/* 全屏按钮：画面右下角，图标 + 文字，手机上也点得到 */
.fs-btn {
  position: absolute; right: .7rem; bottom: .7rem; z-index: 5;
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .42rem .8rem .42rem .65rem;
  border-radius: 999px; border: 1px solid var(--line-2);
  background: rgba(10,14,20,.72); color: var(--text-2);
  font-size: .78rem; font-family: inherit; cursor: pointer;
  backdrop-filter: blur(8px); transition: all .15s;
}
.fs-btn:hover { color: var(--gold); border-color: var(--gold-line); background: rgba(10,14,20,.92); }
.fs-btn.on { color: var(--gold); border-color: var(--gold-line); }

/* 全屏：两种模式共用「铺满视口」的样式
   ① 浏览器全屏 → :fullscreen  ② CSS 沉浸式 → .immersive（iPhone / 应用内浏览器） */
.video-stage:fullscreen,
.video-stage:-webkit-full-screen,
.video-stage.immersive {
  position: fixed;
  left: 50%; top: 50%;
  width: 100vw; height: 100vh;
  max-width: none; max-height: none;
  aspect-ratio: auto;
  margin: 0; border: 0; border-radius: 0;
  background: #000;
  z-index: 9998;
  transform: translate(-50%, -50%);
}
/* 全屏时画面用 contain —— 宁可两侧留黑边，也不裁掉讲课内容 */
.video-stage:fullscreen video,
.video-stage:-webkit-full-screen video,
.video-stage.immersive video { object-fit: contain; }
.video-stage::backdrop { background: #000; }

/* 全屏就是「干净看画面」：徽标、提示一律收起，只留视频本身和退出按钮 */
.video-stage:fullscreen .live-badge,
.video-stage:-webkit-full-screen .live-badge,
.video-stage.immersive .live-badge,
.video-stage:fullscreen .video-hint,
.video-stage:-webkit-full-screen .video-hint,
.video-stage.immersive .video-hint { display: none; }

/* 竖着拿手机又没进真全屏（拿不到方向锁定）：把画面转 90°，
   用户把手机横过来就是满屏，不用等系统转屏。只对触屏生效，桌面不动。 */
@media (orientation: portrait) {
  html.is-touch .video-stage.immersive {
    width: 100vh; height: 100vw;
    width: 100dvh; height: 100dvw;
    transform: translate(-50%, -50%) rotate(90deg);
  }
}

/* 沉浸式下的浮层：右下角圆形小按钮，不挡画面主体 */
.immersive-exit {
  position: fixed; z-index: 10000;
  bottom: calc(env(safe-area-inset-bottom, 0px) + .9rem);
  right: calc(env(safe-area-inset-right, 0px) + .9rem);
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.9rem; height: 2.9rem;
  border-radius: 50%; border: 1.5px solid var(--gold-line);
  background: rgba(10,14,20,.82); color: var(--gold);
  font-family: inherit; cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 3px 12px rgba(0,0,0,.5);
  opacity: .95; transition: filter .15s, transform .1s;
}
.immersive-exit svg { width: 1.15rem; height: 1.15rem; }
.immersive-exit:hover,
.immersive-exit:active { filter: brightness(1.2); transform: scale(.96); }

/* 浏览器把播放拦下来时的兜底：给一个明确可点的按钮 */
.resume-btn {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  z-index: 6; padding: .7rem 1.3rem; border-radius: 999px;
  border: 1px solid var(--gold-line); background: rgba(10,14,20,.86);
  color: var(--gold); font-size: .95rem; font-weight: 600;
  font-family: inherit; cursor: pointer; backdrop-filter: blur(8px);
}
.resume-btn:hover { background: rgba(224,177,94,.18); }

.audio-strip {
  display: flex; align-items: center; flex-wrap: wrap; gap: .6rem 1.1rem;
  padding: .7rem 1.1rem; flex-shrink: 0;
  width: 100%;   /* 主列宽度已等于画面宽度，这里自然同宽 */
}
.strip-group { display: flex; align-items: center; gap: .55rem; min-width: 0; }
.strip-label { font-size: .82rem; color: var(--text-2); white-space: nowrap; }
.strip-select { width: 9.5rem; }
.vol-bar.sm { width: 5rem; flex: none; }
.strip-rec { margin-left: auto; }

/* ═══ 右栏卡片 ═══ */
.rail-card { padding: 1.1rem 1.25rem; display: flex; flex-direction: column; min-height: 0; flex-shrink: 1; }
.rail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .85rem; flex-shrink: 0; }
.rail-title { font-size: 1.05rem; font-weight: 600; }
.rail-empty { color: var(--text-3); font-size: .85rem; text-align: center; padding: 1.2rem .5rem; line-height: 1.8; }
.student-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: .2rem; }
.rail-hint {
  margin: .9rem 0 0; padding-top: .8rem; border-top: 1px dashed var(--line);
  color: var(--text-3); font-size: .76rem; line-height: 1.6; flex-shrink: 0;
}

.student-row {
  display: flex; align-items: center; gap: .7rem; padding: .62rem .7rem;
  border-radius: var(--r-md); border: 1px solid transparent; transition: background .15s;
}
.student-row + .student-row { margin-top: .3rem; }
.student-row:hover { background: rgba(255,255,255,.03); }
.student-row.speaking { background: var(--green-soft); border-color: rgba(62,207,142,.3); }
.avatar {
  width: 2.4rem; height: 2.4rem; border-radius: 50%; flex-shrink: 0;
  background: var(--panel-3); color: var(--text-2);
  display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem;
}
.avatar.on { background: var(--green-soft); color: var(--green); box-shadow: 0 0 0 1.5px rgba(62,207,142,.5); }
.student-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .1rem; }
.student-name { font-size: 1rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.student-state { font-size: .78rem; color: var(--text-3); }
.student-state.on { color: var(--green); }
.student-actions { display: flex; gap: .4rem; flex-shrink: 0; }

/* ═══ 公屏 ═══ */
.chat-card { flex: 1; min-height: 15rem; }

/* 摄像头源本地预览（老师移动端） */
.cam-source-preview { margin-top: .8rem; border-radius: var(--r-md); overflow: hidden; border: 1px solid rgba(168,120,255,.4); }
.cam-source-preview video { display: block; width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #05070A; }

/* 学员摄像头画面窗（公屏上方） */
.cam-rail-item { padding: .85rem 1.1rem; }
.cam-rail-item .rail-head { margin-bottom: .55rem; }
.cam-rail-body {
  width: 100%; aspect-ratio: 16/9; background: #05070A;
  border-radius: var(--r-md); overflow: hidden; border: 1px solid rgba(168,120,255,.4);
}
.cam-rail-video { display: block; width: 100%; height: 100%; object-fit: cover; background: #05070A; }

/* 学员头像带摄像头状态 */
.avatar.cam { background: rgba(168,120,255,.18); color: #B88AF6; box-shadow: 0 0 0 1.5px rgba(168,120,255,.5); }
.chat-scroll { flex: 1; overflow-y: auto; min-height: 0; padding: .2rem; -webkit-overflow-scrolling: touch; }
.chat-empty { color: var(--text-3); font-size: .85rem; text-align: center; padding: 2rem .5rem; }
.chat-input-row { display: flex; gap: .5rem; margin-top: .8rem; flex-shrink: 0; align-items: center; }
.chat-input-row .el-input { flex: 1; }
.emoji-wrap { position: relative; flex-shrink: 0; }
.emoji-trigger { font-size: 1.15rem; padding: .5rem .7rem; }
.emoji-panel {
  position: absolute; bottom: calc(100% + .55rem); left: 0;
  background: var(--panel-2); border: 1px solid var(--line-2); border-radius: var(--r-md);
  padding: .5rem; display: grid; grid-template-columns: repeat(7, 1fr); gap: .3rem;
  box-shadow: 0 10px 34px rgba(0,0,0,.55); z-index: 40;
}

/* ═══ 桌面端：页面锁定视口高度，只有内部区域滚动 ═══ */
@media (min-width: 900px) {
  .salon { height: 100dvh; overflow: hidden; }
  .entry { overflow-y: auto; }
  /* 学员卡按人数长高，最多占右栏 55%，再多才在卡内滚动（原来 42% 放 3 个人就切半行） */
  .rail-card:not(.chat-card) { max-height: 55%; }
}

/* ═══ 响应式 ═══ */
@media (max-width: 899px) {
  .salon { height: 100%; height: 100vh; height: 100dvh; overflow: hidden; }
  .live {
    flex: 1; min-height: 0; flex-direction: column;
    overflow-y: auto; -webkit-overflow-scrolling: touch;
  }
  .live-main { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .stage-area { flex: none; display: block; container-type: normal; }
  .video-stage { width: 100%; }
  .live-rail { min-width: 0; max-height: none; flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .rail-card:not(.chat-card) { max-height: 36vh; }
  .audio-strip { width: 100%; }
  .topbar-link { margin: 0 .6rem; }
  .chat-card { flex: 1; min-height: 12rem; }
}
@media (max-width: 640px) {
  .topbar { padding: .6rem .9rem; }
  .live { padding: .8rem; gap: .75rem; }
  .video-stage { border-radius: var(--r-md); }
  .live-badge { top: .5rem; left: .5rem; font-size: .72rem; padding: .22rem .62rem; }
  .fs-btn { right: .5rem; bottom: .5rem; padding: .34rem .68rem .34rem .55rem; font-size: .74rem; }
  .audio-strip { gap: .5rem .8rem; }
  .strip-select { width: 7.5rem; }
  .student-actions .el-button { padding: .4rem .6rem; font-size: .78rem; }
  .chat-card { min-height: 12rem; }
  .mode-cards { grid-template-columns: 1fr; }
  /* 手机上顶栏太挤：只留「学生链接」标签和复制按钮，URL 由标题浮层看 */
  .topbar-link { margin: 0 .5rem; padding: .22rem .26rem .22rem .6rem; }
  .tl-url { display: none; }
  .entry { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
}
</style>
