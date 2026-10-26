<template>
  <div class="student">
    <!-- ═══ 顶栏 ═══ -->
    <header class="topbar">
      <div class="brand">
        <svg class="logo" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
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
        <span class="chip hide-m">{{ teacherName || '老师' }} 的沙龙</span>
        <span class="chip" :class="connected ? 'green' : ''">
          <span class="dot" :class="connected ? 'green' : 'gray'"></span>{{ connected ? '已连接' : '连接中' }}
        </span>
      </div>
    </header>

    <!-- ═══ ① 进入：姓名 ═══ -->
    <main v-if="!hasJoined" class="entry">
      <div class="entry-card card">
        <svg class="logo-lg" viewBox="0 0 28 28" width="68" height="68" aria-hidden="true">
          <rect x="1.5" y="1.5" width="25" height="25" rx="8" fill="#E0B15E"/>
          <rect x="6.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="11.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="16.5" y="7" width="3" height="14" rx="1" fill="#1A1408"/>
          <rect x="9.2" y="7" width="2.2" height="8.5" fill="#E0B15E"/>
          <rect x="14.2" y="7" width="2.2" height="8.5" fill="#E0B15E"/>
        </svg>
        <h1 class="entry-title">欢迎加入沙龙</h1>
        <p class="entry-sub">输入姓名即可进入<br/>看老师的画面 · 公屏聊天 · 被邀请后连线发言</p>
        <div class="entry-field">
          <label class="field-label">您的姓名 <span class="field-tip">老师和同学将看到</span></label>
          <el-input v-model="studentName" placeholder="例如：王小明" maxlength="12" size="large"
            @keyup.enter="joinClass" />
          <p v-if="nameError" class="name-error">{{ nameError }}</p>
        </div>
        <el-button class="btn-primary entry-btn" size="large" @click="joinClass" :disabled="!studentName.trim()">
          进入沙龙
        </el-button>
        <div class="entry-steps">
          <div class="step"><i>1</i><span>输入姓名</span></div>
          <div class="step"><i>2</i><span>看老师-screen</span></div>
          <div class="step"><i>3</i><span>公屏互动</span></div>
        </div>
      </div>
    </main>

    <!-- ═══ ② 上课中 ═══ -->
    <main v-else-if="!showErrorPage" class="live">
      <div class="live-main">
        <div class="video-stage card">
          <video ref="videoRef" autoplay playsinline></video>
          <div v-if="!connected" class="video-hint"><span class="spinner"></span>正在连接老师的画面…</div>
        </div>

        <!-- 音频设置 -->
        <div class="audio-bar card">
          <div class="audio-group">
            <span class="audio-label">🎤 麦克风</span>
            <el-select v-model="selectedMic" size="small" class="audio-select" @change="onMicChange">
              <el-option v-for="d in audioDevices.mics" :key="d.deviceId"
                :label="d.label || '麦克风 ' + (audioDevices.mics.indexOf(d)+1)" :value="d.deviceId" />
            </el-select>
            <div class="vol-bar sm"><div class="vol-fill" :style="{ width: micVolume + '%' }"></div></div>
          </div>
          <div class="audio-group hide-m">
            <span class="audio-label">🔊 扬声器</span>
            <el-select v-model="selectedSpeaker" size="small" class="audio-select" @change="onSpeakerChange">
              <el-option v-for="d in audioDevices.speakers" :key="d.deviceId"
                :label="d.label || '扬声器 ' + (audioDevices.speakers.indexOf(d)+1)" :value="d.deviceId" />
            </el-select>
          </div>
        </div>

        <!-- 连线控制 -->
        <div class="connect-zone">
          <button class="connect-btn" :class="speakState" @click="onConnectClick">
            <span class="connect-dot"></span>
            <span class="connect-text">{{ connectText }}</span>
            <span class="connect-sub">{{ connectSub }}</span>
          </button>
          <button v-if="speakState === 'live'" class="mute-btn" :class="{ off: !micOn }" @click="toggleMic">
            {{ micOn ? '🎙 声音开启中' : '🔇 已静音' }}
          </button>
        </div>
      </div>

      <!-- 公屏聊天 -->
      <aside class="chat-card card">
        <header class="chat-head">
          <span class="chat-title">💬 沙龙公屏</span>
          <span class="chip">{{ chatMessages.length }} 条</span>
        </header>
        <div class="chat-scroll" ref="chatScroll">
          <div v-if="!chatMessages.length" class="chat-empty">说点什么吧，老师和同学都能看到</div>
          <div v-else class="chat-list">
            <template v-for="msg in chatMessages" :key="msg.id">
              <div v-if="msg.senderRole === 'system'" class="msg-sys"><span>{{ msg.content }}</span></div>
              <div v-else class="msg-row" :class="'role-' + msg.senderRole + (msg.senderId === myId ? ' mine' : '')">
                <span class="msg-name">{{ msg.senderName }}</span>
                <div class="msg-bubble" v-html="escapeHtml(msg.content)"></div>
              </div>
            </template>
          </div>
        </div>
        <div class="chat-input-row">
          <el-input v-model="chatInput" placeholder="说点什么，回车发送" @keyup.enter="sendChat" />
          <el-button type="primary" @click="sendChat">发送</el-button>
        </div>
        <div class="emoji-row">
          <button v-for="e in emojis" :key="e" class="emoji-btn" @click="insertEmoji(e)" :title="'插入 ' + e">{{ e }}</button>
        </div>
      </aside>
    </main>

    <!-- ═══ ③ 错误 / 结束页 ═══ -->
    <main v-else class="error-page">
      <div class="error-card card">
        <div class="error-icon" :class="errorInfo.icon">{{ errorInfo.icon === 'error' ? '!' : 'i' }}</div>
        <h2 class="error-title">{{ errorInfo.title }}</h2>
        <p class="error-msg">{{ errorInfo.message }}</p>
        <div class="error-actions">
          <el-button type="primary" size="large" @click="retryConnection">重新连接</el-button>
          <el-button class="btn-ghost" size="large" @click="goHome">返回首页</el-button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import SimplePeer from 'simple-peer'
import { ElMessage } from 'element-plus'

const SERVER_URL = import.meta.env && import.meta.env.DEV ? 'http://localhost:3000' : undefined

const route = useRoute()
const router = useRouter()
const videoRef = ref(null)
const chatScroll = ref(null)

// ── 基础状态 ──
const hasJoined = ref(false)
const showErrorPage = ref(false)
const studentName = ref('')
const nameError = ref('')
const connected = ref(false)
const teacherName = ref('')
const myId = ref('')
const roomId = ref('')

// ── 连线状态：idle(灰) → invited(绿·待接受) → live(绿·连线中) ──
const speakState = ref('idle')
const micOn = ref(false)

// ── 聊天 ──
const chatMessages = ref([])
const chatInput = ref('')
const emojis = ['😊', '💗', '😅', '😂', '🙋', '👏', '🤝']

// ── 音频设备 ──
const audioDevices = reactive({ mics: [], speakers: [] })
const selectedMic = ref('')
const selectedSpeaker = ref('')
const micVolume = ref(0)

// ── 网络 & 媒体 ──
let socket = null
let socketClosed = false
let peer = null
let micStream = null       // 自己的麦克风流（连线时推给老师）
let pendingAddStream = false // peer 未就绪时接受连线，就绪后补推
let audioContext = null, analyser = null, volumeInterval = null

const errorInfo = reactive({ icon: 'warning', title: '连接错误', message: '连接已断开，请重新尝试' })

const connectText = computed(() => {
    if (speakState.value === 'invited') return '接受连线'
    if (speakState.value === 'live') return micOn.value ? '连线中' : '静音中'
    return '连线'
})
const connectSub = computed(() => {
    if (speakState.value === 'invited') return '老师邀请了你，点击接入声音'
    if (speakState.value === 'live') return '大家都能听到你，点击断开'
    return '等待老师邀请你连线'
})

// ── 工具 ──
function formatClock(ts) { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
function escapeHtml(str) {
    const div = document.createElement('div'); div.textContent = str; return div.innerHTML
}
function sendChat() {
    const content = chatInput.value.trim()
    if (!content || !roomId.value || !socket) return
    socket.emit('chat-message', { roomId: roomId.value, content })
    chatInput.value = ''
}
function insertEmoji(e) {
    chatInput.value += e
}

// ── 连线交互 ──
function onConnectClick() {
    if (speakState.value === 'idle') {
        ElMessage.info('等待老师邀请你连线；老师邀请后，这个按钮会变绿')
        return
    }
    if (speakState.value === 'invited') {
        // 接受连线：把自己的麦克风推进 peer
        speakState.value = 'live'
        micOn.value = true
        addMicToPeer()
        socket.emit('accept-speak', { roomId: roomId.value })
        ElMessage.success('已连线，大家能听到你了')
        return
    }
    // live → 主动断开
    speakState.value = 'idle'
    micOn.value = false
    removeMicFromPeer()
    socket.emit('end-speak', { roomId: roomId.value })
}
function toggleMic() {
    if (speakState.value !== 'live') return
    micOn.value = !micOn.value
    if (micStream) micStream.getAudioTracks().forEach(t => { t.enabled = micOn.value })
    socket.emit('toggle-mic', roomId.value)
}
function addMicToPeer() {
    if (!micStream) return
    if (peer && !peer.destroyed) {
        try { peer.addStream(micStream) } catch (e) { console.error('addStream 失败', e) }
        pendingAddStream = false
    } else {
        pendingAddStream = true // peer 就绪后补推
    }
}
function removeMicFromPeer() {
    if (peer && !peer.destroyed && micStream) {
        try { peer.removeStream(micStream) } catch (e) { }
    }
    pendingAddStream = false
    if (micStream) micStream.getAudioTracks().forEach(t => { t.enabled = true })
}

// ── 音频设备 ──
async function getAudioDevices() {
    try {
        const temp = await navigator.mediaDevices.getUserMedia({ audio: true })
        temp.getTracks().forEach(t => t.stop())
        const devices = await navigator.mediaDevices.enumerateDevices()
        audioDevices.mics = devices.filter(d => d.kind === 'audioinput')
        audioDevices.speakers = devices.filter(d => d.kind === 'audiooutput')
        if (audioDevices.mics.length > 0 && !selectedMic.value) selectedMic.value = audioDevices.mics[0].deviceId
        await startMicDetection()
    } catch (e) { console.error('获取设备失败', e) }
}
async function startMicDetection() {
    try {
        const constraints = selectedMic.value ? { audio: { deviceId: selectedMic.value } } : { audio: true }
        micStream = await navigator.mediaDevices.getUserMedia(constraints)
        startVolumeDetection(micStream)
    } catch (e) { console.error('[麦克风检测] 失败:', e) }
}
function startVolumeDetection(mediaStream) {
    stopVolumeDetection()
    if (!mediaStream?.getAudioTracks().length) return
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.3
    const src = audioContext.createMediaStreamSource(mediaStream)
    src.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    volumeInterval = setInterval(() => {
        if (audioContext.state === 'suspended') audioContext.resume()
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x }
        micVolume.value = Math.min(100, Math.round(Math.sqrt(sum / buf.length) * 400))
    }, 30)
}
function stopVolumeDetection() {
    if (volumeInterval) { clearInterval(volumeInterval); volumeInterval = null }
    if (audioContext) { audioContext.close().catch(() => { }); audioContext = null }
    micVolume.value = 0
}
function onMicChange() {
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null }
    startMicDetection()
    ElMessage.info('麦克风已切换')
}
function onSpeakerChange() {
    if (videoRef.value && typeof videoRef.value.setSinkId === 'function') {
        videoRef.value.setSinkId(selectedSpeaker.value)
            .then(() => ElMessage.success('扬声器已切换'))
            .catch(() => ElMessage.warning('切换失败'))
    }
}

// ── 加入 & 连接 ──
function joinClass() {
    if (!studentName.value.trim()) { nameError.value = '请输入姓名'; return }
    nameError.value = ''
    hasJoined.value = true
    initializeConnection()
}

function initializeConnection() {
    roomId.value = route.params.roomId
    socket = io(SERVER_URL, {
        reconnection: true, reconnectionAttempts: Infinity,
        reconnectionDelay: 1000, reconnectionDelayMax: 10000, timeout: 5000
    })
    myId.value = socket.id

    socket.on('room-info', ({ teacherName: tn, speaking }) => {
        teacherName.value = tn || '老师'
        // 刷新/重连后恢复连线状态
        if (speaking && speaking.studentId === socket.id) {
            speakState.value = speaking.status === 'live' ? 'live' : 'invited'
            micOn.value = speaking.status === 'live'
            if (speakState.value === 'live') addMicToPeer()
        }
    })
    socket.on('connect', () => { myId.value = socket.id })

    socket.on('chat-history', history => { chatMessages.value = history || [] })
    socket.on('chat-message', msg => { chatMessages.value.push(msg) })

    // 老师邀请连线
    socket.on('speak-invited', () => {
        speakState.value = 'invited'
        ElMessage.info('📨 老师邀请你连线，点绿色按钮接受')
    })
    // 连线结束（老师断开 / 取消邀请）
    socket.on('speak-ended', () => {
        speakState.value = 'idle'
        micOn.value = false
        removeMicFromPeer()
    })
    // 自己的麦克风状态（全员静音等场景）
    socket.on('user-mic-update', ({ id, micOn: m }) => {
        if (id === socket.id) micOn.value = m
    })

    socket.on('kicked', ({ teacherName: tn }) => {
        ElMessage.error(`您已被老师 ${tn || '老师'} 请出沙龙`)
        showErrorPage.value = true
        errorInfo.icon = 'error'
        errorInfo.title = '已被请出沙龙'
        errorInfo.message = `老师 ${tn || '老师'} 已将你请出沙龙`
        disconnectAll()
    })
    socket.on('class-ended', () => {
        ElMessage.info('课程已结束')
        showErrorPage.value = true
        errorInfo.icon = 'info'
        errorInfo.title = '课程已结束'
        errorInfo.message = '老师已结束课程，感谢您的参与'
        disconnectAll()
    })

    socket.emit('join-room', { roomId: roomId.value, userName: studentName.value })

    socket.on('signal', ({ from, signal }) => {
        try {
            if (!peer || peer.destroyed) {
                peer = new SimplePeer({ initiator: false, trickle: false, objectMode: true, sdpTransform: s => s })
                peer.on('signal', data => socket.emit('signal', { to: from, from: socket.id, signal: data }))
                peer.on('stream', s => {
                    if (videoRef.value) {
                        videoRef.value.srcObject = s
                        connected.value = true
                        if (selectedSpeaker.value && typeof videoRef.value.setSinkId === 'function')
                            videoRef.value.setSinkId(selectedSpeaker.value).catch(() => { })
                    }
                })
                peer.on('error', err => console.error('Peer error', err))
                peer.on('close', () => { connected.value = false; peer = null })
                // 连接时已在连线中 → 补推麦克风
                if (speakState.value === 'live' && micStream) {
                    try { peer.addStream(micStream) } catch (e) { }
                }
            }
            peer.signal(signal)
            if (pendingAddStream && micStream) {
                try { peer.addStream(micStream); pendingAddStream = false } catch (e) { }
            }
        } catch (err) { console.error('信号处理错误', err) }
    })

    // 断线自动重连：重连后重新加入并请求老师重发信令
    socket.on('disconnect', reason => {
        if (socketClosed || reason === 'io client disconnect') return
        connected.value = false
        if (peer) { try { peer.destroy() } catch (e) { }; peer = null }
    })
    socket.on('reconnect', () => {
        connected.value = false
        socket.emit('join-room', { roomId: roomId.value, userName: studentName.value })
        socket.emit('request-video', { roomId: roomId.value })
    })
}

function retryConnection() { showErrorPage.value = false; initializeConnection() }
function goHome() { router.push('/') }
function disconnectAll() {
    if (socket) socket.disconnect()
    if (videoRef.value?.srcObject) {
        videoRef.value.srcObject.getTracks().forEach(t => t.stop())
        videoRef.value.srcObject = null
    }
    if (peer) { try { peer.destroy() } catch (e) { }; peer = null }
    connected.value = false
    stopVolumeDetection()
}

watch(() => chatMessages.value.length, () => {
    nextTick(() => { const el = chatScroll.value; if (el) el.scrollTop = el.scrollHeight })
})

onMounted(async () => {
    await getAudioDevices()
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices)
})
onBeforeUnmount(() => { socketClosed = true; disconnectAll() })
</script>

<style scoped>
.student { width: 100%; min-height: 100dvh; display: flex; flex-direction: column; }

/* ═══ 顶栏 ═══ */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1.4rem;
  background: rgba(13,17,23,.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  position: sticky; top: 0; z-index: 50;
  flex-shrink: 0;
}
.brand { display: flex; align-items: center; gap: .6rem; }
.topbar-title { font-size: 1.12rem; font-weight: 600; letter-spacing: .02em; }
.topbar-right { display: flex; align-items: center; gap: .5rem; }

/* ═══ ① 进入页 ═══ */
.entry { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem 1.2rem; }
.entry-card {
  width: 100%; max-width: 26rem; padding: 2.6rem 2.2rem; text-align: center;
  background: linear-gradient(180deg, var(--panel) 0%, #101620 100%);
  box-shadow: 0 24px 80px rgba(0,0,0,.5), 0 0 0 1px var(--line);
}
.logo-lg { margin-bottom: 1rem; filter: drop-shadow(0 6px 24px rgba(224,177,94,.35)); }
.entry-title { font-size: 1.7rem; font-weight: 600; margin: 0 0 .6rem; letter-spacing: .03em; }
.entry-sub { color: var(--text-2); font-size: .92rem; line-height: 1.8; margin: 0 0 2rem; }
.entry-field { text-align: left; margin-bottom: 1.4rem; }
.field-label { display: block; font-size: .92rem; color: var(--text-2); margin-bottom: .5rem; font-weight: 500; }
.field-tip { color: var(--text-3); font-size: .8rem; font-weight: 400; margin-left: .3rem; }
.name-error { color: var(--red); font-size: .82rem; margin: .5rem 0 0; }
.entry-btn { width: 100%; height: 3.2rem; font-size: 1.08rem; }
.entry-steps {
  display: flex; justify-content: center; gap: 1.2rem; margin-top: 1.8rem;
  padding-top: 1.4rem; border-top: 1px dashed var(--line-2);
}
.step { display: flex; align-items: center; gap: .4rem; color: var(--text-3); font-size: .8rem; }
.step i {
  width: 1.35rem; height: 1.35rem; border-radius: 50%; font-style: normal;
  background: var(--gold-soft); color: var(--gold); border: 1px solid var(--gold-line);
  display: inline-flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 600;
}

/* ═══ ② 上课中 ═══ */
.live {
  flex: 1; display: grid; gap: 1rem; padding: 1rem 1.4rem 1.4rem;
  grid-template-columns: minmax(0, 1fr) 21rem;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
}
.live-main { display: flex; flex-direction: column; gap: 1rem; min-width: 0; min-height: 0; }

.video-stage {
  flex: 1; position: relative; background: #05070A; border-color: #222D3D;
  overflow: hidden; min-height: 300px; display: flex;
}
.video-stage video { width: 100%; height: 100%; object-fit: contain; }
.video-hint {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  gap: .7rem; color: var(--text-2); font-size: .95rem;
}
.spinner {
  width: 1.3rem; height: 1.3rem; border: 2.5px solid #2A3444; border-top-color: var(--gold);
  border-radius: 50%; animation: spin .9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 音频设置条 */
.audio-bar { display: flex; align-items: center; gap: 1.2rem; padding: .65rem 1rem; flex-shrink: 0; flex-wrap: wrap; }
.audio-group { display: flex; align-items: center; gap: .55rem; min-width: 0; }
.audio-label { font-size: .82rem; color: var(--text-2); white-space: nowrap; }
.audio-select { width: 10rem; }
.vol-bar.sm { width: 4.5rem; flex: none; }

/* ═══ 连线按钮（三态）═══ */
.connect-zone { display: flex; gap: .8rem; flex-shrink: 0; }
.connect-btn {
  flex: 1; position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .15rem;
  min-height: 4.4rem; padding: .7rem 1rem;
  border-radius: var(--r-lg); border: 1.5px solid var(--line-2);
  background: var(--panel-2); color: var(--text-3);
  cursor: pointer; transition: all .18s ease;
  font-family: inherit;
}
.connect-btn .connect-dot {
  width: .6rem; height: .6rem; border-radius: 50%;
  background: var(--text-3); transition: all .18s;
}
.connect-btn .connect-text { font-size: 1.08rem; font-weight: 600; color: var(--text-2); }
.connect-btn .connect-sub { font-size: .76rem; color: var(--text-3); }

/* 待接受：绿色 + 呼吸光 */
.connect-btn.invited {
  border-color: var(--green);
  background: linear-gradient(135deg, rgba(62,207,142,.22), rgba(62,207,142,.08));
  animation: breathe 1.6s ease-in-out infinite;
}
.connect-btn.invited .connect-dot { background: var(--green); box-shadow: 0 0 12px var(--green); }
.connect-btn.invited .connect-text { color: var(--green); }
.connect-btn.invited .connect-sub { color: rgba(62,207,142,.75); }
@keyframes breathe {
  0%, 100% { box-shadow: 0 0 0 0 rgba(62,207,142,.35); }
  50% { box-shadow: 0 0 0 8px rgba(62,207,142,0); }
}

/* 连线中：绿色实底 */
.connect-btn.live {
  border-color: var(--green);
  background: linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%);
}
.connect-btn.live .connect-dot { background: #06281A; }
.connect-btn.live .connect-text { color: #06281A; }
.connect-btn.live .connect-sub { color: rgba(6,40,26,.7); }

.connect-btn.idle:hover { border-color: var(--gold-line); }
.connect-btn.idle:hover .connect-text { color: var(--gold); }

/* 静音小按钮 */
.mute-btn {
  min-height: 4.4rem; padding: .7rem 1.1rem; border-radius: var(--r-lg);
  border: 1.5px solid rgba(62,207,142,.4); background: var(--green-soft); color: var(--green);
  font-size: .92rem; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all .15s; white-space: nowrap;
}
.mute-btn:hover { filter: brightness(1.15); }
.mute-btn.off { border-color: var(--line-2); background: var(--panel-2); color: var(--text-3); }

/* ═══ 公屏 ═══ */
.chat-card { display: flex; flex-direction: column; min-height: 0; padding: 1rem 1.1rem; }
.chat-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8rem; flex-shrink: 0; }
.chat-title { font-size: 1rem; font-weight: 600; }
.chat-scroll { flex: 1; overflow-y: auto; min-height: 0; padding: .2rem; }
.chat-empty { color: var(--text-3); font-size: .85rem; text-align: center; padding: 2rem .5rem; }
.chat-input-row { display: flex; gap: .5rem; margin-top: .7rem; flex-shrink: 0; }
.chat-input-row .el-input { flex: 1; }
.emoji-row { margin-top: .55rem; }
.msg-row.mine .msg-name { color: var(--gold); }
.msg-row.mine .msg-bubble {
  background: var(--gold-soft); border-color: var(--gold-line); color: #F4E3C2;
}

/* ═══ ③ 错误页 ═══ */
.error-page { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem 1.2rem; }
.error-card { width: 100%; max-width: 26rem; padding: 2.6rem 2rem; text-align: center; }
.error-icon {
  width: 3.4rem; height: 3.4rem; border-radius: 50%; margin: 0 auto 1rem;
  display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 600;
}
.error-icon.error { background: var(--red-soft); color: var(--red); border: 1px solid rgba(229,86,94,.4); }
.error-icon.info { background: var(--green-soft); color: var(--green); border: 1px solid rgba(62,207,142,.4); }
.error-icon.warning { background: var(--gold-soft); color: var(--gold); border: 1px solid var(--gold-line); }
.error-title { font-size: 1.3rem; font-weight: 600; margin: 0 0 .5rem; }
.error-msg { color: var(--text-2); font-size: .92rem; line-height: 1.7; margin: 0 0 1.8rem; }
.error-actions { display: flex; gap: .8rem; justify-content: center; }
.error-actions .el-button { flex: 1; }

/* ═══ 桌面端：页面锁定视口高度，只有聊天栏内部滚动 ═══ */
@media (min-width: 1025px) {
  .student { height: 100dvh; overflow: hidden; }
  .entry { overflow-y: auto; }
}

/* ═══ 响应式：平板 ═══ */
@media (max-width: 1024px) {
  .live { grid-template-columns: 1fr; }
  .video-stage { min-height: 240px; }
  .chat-card { min-height: 20rem; }
}

/* ═══ 响应式：手机 ═══ */
@media (max-width: 640px) {
  .topbar { padding: .6rem .9rem; }
  .live { padding: .8rem; gap: .8rem; }
  .video-stage { min-height: 0; aspect-ratio: 16 / 10; flex: none; }
  .audio-bar { gap: .6rem 1rem; padding: .55rem .8rem; }
  .audio-select { width: 8rem; }
  .connect-btn { min-height: 4rem; }
  .connect-btn .connect-text { font-size: 1.05rem; }
  .mute-btn { min-height: 4rem; }
  .chat-card { min-height: 0; height: 50vh; }
  .entry-card { padding: 2rem 1.4rem; }
  .entry-steps { gap: .8rem; }
  .emoji-btn { width: 2.7rem; height: 2.7rem; }
}
</style>
