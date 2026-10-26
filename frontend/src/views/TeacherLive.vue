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

        <el-button class="btn-primary start-btn" size="large" @click="startClass">开始上课</el-button>
        <p class="prep-tip">💡 想让学生听到电脑里钢琴软件的声音？安装 BlackHole 虚拟声卡后，在「麦克风」里选它即可。</p>
      </div>
    </main>

    <!-- ═══ ③ 上课中 ═══ -->
    <main v-else class="live">
      <div class="live-main">
        <!-- 舞台：教学排版采集进来是 16:9，这里就固定 16:9，画面刚好铺满不留黑边 -->
        <div class="stage-area">
          <div class="video-stage card" ref="stageRef">
            <video ref="videoRef" autoplay muted playsinline @click="toggleFullscreen"></video>
            <div class="live-badge"><span class="rec-dot"></span>直播中 · {{ formatTime(classSeconds) }}</div>
            <button class="fs-btn" :class="{ on: isFullscreen }" @click="toggleFullscreen"
              :title="isFullscreen ? '退出全屏（Esc）' : '全屏观看'">
              <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="16" height="16" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 9h5V4M20 9h-5V4M20 15h-5v5M4 15h5v5" />
              </svg>
              <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
            </button>
            <div v-if="!streamReady" class="video-hint">正在获取屏幕共享画面…</div>
          </div>
        </div>

        <div class="invite-card card">
          <div class="invite-info">
            <span class="invite-title">学生上课链接</span>
            <span class="invite-url" :title="classUrl">{{ classUrl }}</span>
          </div>
          <div class="invite-actions">
            <el-button type="primary" size="small" @click="copyLink">复制链接</el-button>
            <el-button class="btn-ghost" size="small" @click="openLink">打开</el-button>
          </div>
        </div>

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
            还没有学员加入<br/>把上方的学生链接发给学员即可
          </div>
          <div class="student-scroll">
            <div v-for="u in students" :key="u.id" class="student-row" :class="{ speaking: u.micOn }">
              <span class="avatar" :class="{ on: u.micOn }">{{ (u.name || '?').slice(0, 1) }}</span>
              <div class="student-meta">
                <span class="student-name">{{ u.name }}</span>
                <span class="student-state" :class="{ on: u.micOn }">
                  <template v-if="speakingId === u.id && speakingStatus === 'live'">● 连线中</template>
                  <template v-else-if="speakingId === u.id && speakingStatus === 'invited'">邀请中…</template>
                  <template v-else>在线</template>
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

const videoRef = ref(null)
const stageRef = ref(null)
const isFullscreen = ref(false)
const chatScroll = ref(null)

const currentRoomId = ref('')
const classUrl = ref('')
const isClassStarted = ref(false)
const streamReady = ref(false)
const onlineUsers = ref([])
const speakingId = ref(null)
const speakingStatus = ref(null)

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

// ── 全屏观看 ──
// 优先用元素全屏（能保留「直播中」角标和退出按钮），iPhone Safari 不支持元素全屏，
// 退回 <video> 自带的原生全屏播放器。
function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null }

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
    if (el.requestFullscreen || el.webkitRequestFullscreen) {
        try {
            if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
            else await el.webkitRequestFullscreen()
            lockLandscape()
        } catch (e) {
            ElMessage.warning('浏览器不允许全屏，可按 F11')
        }
        return
    }
    const v = videoRef.value
    if (v && v.webkitEnterFullscreen) {
        try { v.webkitEnterFullscreen() } catch (e) { ElMessage.warning('当前浏览器不支持全屏') }
    } else {
        ElMessage.warning('当前浏览器不支持全屏，可按 F11')
    }
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
function onFullscreenChange() {
    const on = !!fsElement()
    isFullscreen.value = on
    if (!on) unlockOrientation()
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

// ── 流程 ──
function enterPrep() {
    const name = teacherNameInput.value.trim()
    if (!name) { ElMessage.warning('请先输入您的姓名'); return }
    teacherName.value = name
    stage.value = 'prep'
}

async function startClass() {
    try {
        // 屏幕共享：没选麦克风时共享系统声音（钢琴软件声），选了麦克风就不传屏幕流音频
        const screenAudio = selectedMic.value ? false : {
            systemAudio: 'include'
        }
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'hidden',
                frameRate: 15
            },
            audio: screenAudio
        })
        streamReady.value = true
        try { micStream = await navigator.mediaDevices.getUserMedia(micConstraints()) }
        catch (e) { console.warn('麦克风获取失败，学生可能听不到声音', e); micStream = null }

        peerStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...(micStream ? micStream.getAudioTracks() : [])
        ])

        stage.value = 'live'
        isClassStarted.value = true
        classSeconds.value = 0
        if (classTimer) clearInterval(classTimer)
        classTimer = setInterval(() => classSeconds.value++, 1000)

        nextTick(() => {
            if (videoRef.value) {
                videoRef.value.srcObject = stream
                if (selectedSpeaker.value && typeof videoRef.value.setSinkId === 'function')
                    videoRef.value.setSinkId(selectedSpeaker.value).catch(() => { })
            }
        })

        // 屏幕共享被手动停止时，自动停录制 + 更新 UI
        stream.getVideoTracks().forEach(t => t.addEventListener('ended', () => {
            if (isRecording.value) stopRecording()
            streamReady.value = false
            stage.value = 'prep'
            isClassStarted.value = false
            if (classTimer) { clearInterval(classTimer); classTimer = null }
            ElMessage.warning('屏幕共享已停止')
        }))

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
    }
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
            // 学生连线的声音（含音频轨才收）
            if (s.getAudioTracks().length) {
                studentStreams[id] = s
                const u = onlineUsers.value.find(u => u.id === id)
                if (u?.micOn) playStudentAudio(id)
            }
        })
        peer.on('error', err => console.error('Peer error', err))
        peer.on('close', () => { stopStudentAudio(id); delete peers[id] })
        peers[id] = peer
    })

    // 学生重连后单独重建 peer
    socket.on('student-rejoined', ({ studentId }) => {
        if (!peerStream) return
        if (peers[studentId]) { try { peers[studentId].destroy() } catch (e) { } }
        stopStudentAudio(studentId)
        const peer = new SimplePeer({
            initiator: true, trickle: false, stream: peerStream, objectMode: true, sdpTransform: s => s
        })
        peer.on('signal', sig => socket.emit('signal', { to: studentId, from: socket.id, signal: sig }))
        peer.on('stream', s => {
            if (s.getAudioTracks().length) {
                studentStreams[studentId] = s
                const u = onlineUsers.value.find(u => u.id === studentId)
                if (u?.micOn) playStudentAudio(studentId)
            }
        })
        peer.on('error', err => console.error('Peer error', err))
        peer.on('close', () => { stopStudentAudio(studentId); delete peers[studentId] })
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
                    if (s.getAudioTracks().length) {
                        studentStreams[u.id] = s
                        if (u.micOn) playStudentAudio(u.id)
                    }
                })
                peer.on('error', err => console.error('Peer error', err))
                peer.on('close', () => { stopStudentAudio(u.id); delete peers[u.id] })
                peers[u.id] = peer
            }
        })
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
            peers = {}
            if (stream) stream.getTracks().forEach(t => t.stop())
            if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null }
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
    await getAudioDevices()
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
    if (fsElement()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document) } catch (e) { } }
    unlockOrientation()
    if (isRecording.value) stopRecording()
    socketClosed = true
    stopVolumeDetection()
    if (teacherMicStream) { teacherMicStream.getTracks().forEach(t => t.stop()); teacherMicStream = null }
    Object.values(peers).forEach(p => { try { p.destroy() } catch (e) { } })
    Object.keys(studentAudios).forEach(stopStudentAudio)
    if (stream) stream.getTracks().forEach(t => t.stop())
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null }
    peerStream = null
    if (socket) socket.disconnect()
})
</script>

<style scoped>
.salon { width: 100%; min-height: 100dvh; display: flex; flex-direction: column; }

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
.brand { display: flex; align-items: center; gap: .65rem; }
.topbar-title { font-size: 1.2rem; font-weight: 600; letter-spacing: .02em; }
.topbar-right { display: flex; align-items: center; gap: .6rem; }

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

/* ═══ ③ 上课中 ═══ */
.live {
  flex: 1; display: grid; gap: 1rem; padding: 1rem 1.4rem 1.4rem;
  grid-template-columns: minmax(0, 1fr) 22rem;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
}
.live-main { display: flex; flex-direction: column; gap: 1rem; min-width: 0; min-height: 0; }
.live-rail { display: flex; flex-direction: column; gap: 1rem; min-height: 0; }

/* ═══ 画面舞台：固定 16:9 ═══
   采集端（教学排版台）输出的是 16:9，这里按同样的比例开框，画面刚好铺满。
   用容器查询单位算「能放下的最大 16:9 矩形」，纯 CSS 完成，窗口怎么拉都是 16:9。 */
.stage-area {
  flex: 1; min-height: 0;
  container-type: size;
  display: flex; align-items: center; justify-content: center;
}
.video-stage {
  position: relative;
  width: min(100cqw, calc(100cqh * 16 / 9));
  aspect-ratio: 16 / 9;
  margin: auto;
  background: #05070A; border-color: #222D3D;
  overflow: hidden; display: block;
}
/* cover：源画面正好 16:9 时与 contain 等效；源画面带着黑边时把黑边裁掉，绝不出现双重黑边 */
.video-stage video {
  display: block; width: 100%; height: 100%;
  object-fit: cover; background: #05070A; cursor: zoom-in;
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

/* 全屏时铺满屏幕，画面用 contain（宁可留边也不裁掉讲课内容） */
.video-stage:fullscreen,
.video-stage:-webkit-full-screen {
  width: 100vw; height: 100vh; aspect-ratio: auto;
  margin: 0; border: 0; border-radius: 0; background: #000;
}
.video-stage:fullscreen video,
.video-stage:-webkit-full-screen video { object-fit: contain; cursor: default; }
.video-stage::backdrop { background: #000; }
/* 全屏了但手机没转成横屏（部分浏览器不支持方向锁定）→ 提示横过来看 */
@media (orientation: portrait) {
  .video-stage:fullscreen::after,
  .video-stage:-webkit-full-screen::after {
    content: '↻ 把手机横过来看更清楚';
    position: absolute; top: 1rem; left: 50%; transform: translateX(-50%);
    padding: .4rem .9rem; border-radius: 999px;
    background: rgba(10,14,20,.8); border: 1px solid var(--line-2);
    color: var(--text-2); font-size: .8rem; white-space: nowrap;
    pointer-events: none;
  }
}

.invite-card {
  display: flex; align-items: center; justify-content: space-between; gap: .8rem;
  padding: .55rem .9rem .55rem 1.1rem;
  background: linear-gradient(90deg, var(--gold-soft), rgba(224,177,94,.05));
  border-color: var(--gold-line); flex-shrink: 0; flex-wrap: wrap;
}
.invite-info { display: flex; align-items: center; gap: .7rem; min-width: 0; flex: 1; }
.invite-title { font-weight: 600; color: var(--gold); font-size: .88rem; white-space: nowrap; flex-shrink: 0; }
.invite-url {
  color: var(--text-2); font-size: .8rem; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.invite-actions { display: flex; gap: .4rem; flex-shrink: 0; }

.audio-strip { display: flex; align-items: center; flex-wrap: wrap; gap: .6rem 1.1rem; padding: .7rem 1.1rem; flex-shrink: 0; }
.strip-group { display: flex; align-items: center; gap: .55rem; min-width: 0; }
.strip-label { font-size: .82rem; color: var(--text-2); white-space: nowrap; }
.strip-select { width: 9.5rem; }
.vol-bar.sm { width: 5rem; flex: none; }
.strip-rec { margin-left: auto; }

/* ═══ 右栏卡片 ═══ */
.rail-card { padding: 1rem 1.1rem; display: flex; flex-direction: column; min-height: 0; flex-shrink: 1; }
.rail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8rem; flex-shrink: 0; }
.rail-title { font-size: 1rem; font-weight: 600; }
.rail-empty { color: var(--text-3); font-size: .85rem; text-align: center; padding: 1.2rem .5rem; line-height: 1.8; }
.student-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: .2rem; }
.rail-hint {
  margin: .9rem 0 0; padding-top: .8rem; border-top: 1px dashed var(--line);
  color: var(--text-3); font-size: .76rem; line-height: 1.6; flex-shrink: 0;
}

.student-row {
  display: flex; align-items: center; gap: .7rem; padding: .55rem .6rem;
  border-radius: var(--r-md); border: 1px solid transparent; transition: background .15s;
}
.student-row + .student-row { margin-top: .3rem; }
.student-row:hover { background: rgba(255,255,255,.03); }
.student-row.speaking { background: var(--green-soft); border-color: rgba(62,207,142,.3); }
.avatar {
  width: 2.2rem; height: 2.2rem; border-radius: 50%; flex-shrink: 0;
  background: var(--panel-3); color: var(--text-2);
  display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: .95rem;
}
.avatar.on { background: var(--green-soft); color: var(--green); box-shadow: 0 0 0 1.5px rgba(62,207,142,.5); }
.student-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .1rem; }
.student-name { font-size: .95rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.student-state { font-size: .74rem; color: var(--text-3); }
.student-state.on { color: var(--green); }
.student-actions { display: flex; gap: .4rem; flex-shrink: 0; }

/* ═══ 公屏 ═══ */
.chat-card { flex: 1; min-height: 14rem; }
.chat-scroll { flex: 1; overflow-y: auto; min-height: 0; padding: .2rem; }
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
  .rail-card:not(.chat-card) { max-height: 38%; }
}

/* ═══ 响应式 ═══ */
@media (max-width: 899px) {
  .live { grid-template-columns: 1fr; grid-template-rows: auto; align-content: start; }
  .live-rail { max-height: none; }
  .rail-card:not(.chat-card) { max-height: 36vh; }
  /* 单列时让「宽度」决定画面尺寸：舞台不再抢剩余高度，避免在竖屏平板上撑成一大块 */
  .stage-area { flex: none; display: block; container-type: normal; }
  .video-stage { width: 100%; }
}
@media (max-width: 640px) {
  .topbar { padding: .6rem .9rem; }
  .live { padding: .8rem; gap: .75rem; }
  .stage-area { flex: none; display: block; }
  .video-stage { width: 100%; border-radius: var(--r-md); }
  .live-badge { top: .5rem; left: .5rem; font-size: .72rem; padding: .22rem .62rem; }
  .fs-btn { right: .5rem; bottom: .5rem; padding: .34rem .68rem .34rem .55rem; font-size: .74rem; }
  .invite-card { flex-direction: column; align-items: stretch; gap: .5rem; padding: .6rem .8rem; }
  .invite-actions { justify-content: flex-end; }
  .audio-strip { gap: .5rem .8rem; }
  .strip-select { width: 7.5rem; }
  .student-actions .el-button { padding: .4rem .6rem; font-size: .78rem; }
  .chat-card { min-height: 18rem; }
  .mode-cards { grid-template-columns: 1fr; }
}
</style>
