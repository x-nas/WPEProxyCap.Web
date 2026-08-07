<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { theme } from 'ant-design-vue'
import { on } from './bridge'
import { api, type AppState, type ServerInfo, type NoticeInfo, type LiveStats, type LogItem } from './api'
import wpeLogo from './assets/wpe.png'
import MainView from './components/MainView.vue'
import ControlCenter from './components/ControlCenter.vue'
import SubscriberModal from './components/SubscriberModal.vue'
import LogModal from './components/LogModal.vue'
import VerifyModal from './components/VerifyModal.vue'
import { CLIENT_DOWNLOAD_URL, isClientOutdated } from './version'

// 与主界面 slate 配色对齐：让所有弹窗(Modal/Input/Button/Table/Result 等)统一继承主界面色调，
// 避免 darkAlgorithm 默认中性深灰与主界面蓝灰调不搭
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#38bdf8',
    borderRadius: 10,
    colorBgElevated: '#1e293b',            // 弹窗/下拉/气泡 主表面（主界面卡片色）
    colorBgContainer: 'rgba(2,6,23,.5)',   // 输入框/表格单元格 背景（同主界面输入框）
    colorBgSpotlight: '#334155',           // tooltip 背景
    colorText: '#e2e8f0',                  // 主文字
    colorTextHeading: '#e2e8f0',           // 标题文字
    colorTextSecondary: '#94a3b8',         // 次级文字
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#64748b',        // 最弱文字（占位/计数）
    colorTextPlaceholder: '#475569',       // 输入框占位符（同主界面）
    colorBorder: 'rgba(255,255,255,.12)',
    colorBorderSecondary: 'rgba(255,255,255,.06)',
    colorIcon: '#94a3b8',
    colorIconHover: '#e2e8f0',
    colorFillContent: 'rgba(255,255,255,.04)',
  },
}

const state = ref<AppState | null>(null)
const servers = ref<ServerInfo[]>([])
const notices = ref<NoticeInfo[]>([])
const wpeStatus = ref('offline')
const subDelay = ref(-1)
const connected = ref(false)
const stats = ref<LiveStats | null>(null)
const logs = ref<LogItem[]>([])

const subscriberOpen = ref(false)
const agreementOpen = ref(false)
const agreementTitle = ref('')
const agreementText = ref('')
const logOpen = ref(false)
const verifyOpen = ref(false)
const hideOpen = ref(false)

// 隐藏窗口：关闭界面但保留代理（对应原程序 bHide_Click，StopMihomo=false）
function confirmHide() { hideOpen.value = false; api.hideWindow() }

// 版本门槛：当前 C# 客户端版本(getState().version)低于本前端要求的最低版本时，
// 弹阻断式遮罩要求更新（state 未加载时不拦截）
const clientOutdated = computed(() => isClientOutdated(state.value?.version))
function downloadNewClient() { api.openExternal(CLIENT_DOWNLOAD_URL) }

const clock = ref('')
let clockTimer: number | undefined
const offs: Array<() => void> = []

const selectedServer = computed(() =>
  servers.value.find(s => s.serverId === state.value?.selectedServerId) ?? servers.value[0] ?? null)
const selectedServerName = computed(() => selectedServer.value?.serverName ?? '')

const wpeLabel = computed(() => ({ online: '流畅', slow: '一般', lag: '卡顿', offline: '不在线' }[wpeStatus.value] ?? '检测中'))
const wpeColor = computed(() => ({ online: '#34d399', slow: '#fbbf24', lag: '#f97316', offline: '#64748b' }[wpeStatus.value] ?? '#64748b'))

function tick() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  clock.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function refreshAll() {
  state.value = await api.getState()
  wpeStatus.value = await api.checkWpeServer()
  subDelay.value = await api.checkSubscriberServer()
  servers.value = await api.getServers()
  notices.value = await api.getNotices()
}

onMounted(async () => {
  offs.push(on('connected', (s: AppState) => { state.value = s; connected.value = true }))
  offs.push(on('disconnected', () => { connected.value = false; stats.value = null }))
  offs.push(on('stats', (d: LiveStats) => (stats.value = d)))
  offs.push(on('log', (d: LogItem) => { logs.value.push(d); if (logs.value.length > 200) logs.value.shift() }))
  tick(); clockTimer = window.setInterval(tick, 30000)
  await refreshAll()
})

onUnmounted(() => { offs.forEach(f => f()); if (clockTimer) clearInterval(clockTimer) })

async function openAgreement(t: 'UserAgreement' | 'PrivacyPolicy') {
  agreementTitle.value = t === 'PrivacyPolicy' ? 'WPE Proxy Cap 隐私政策' : 'WPE Proxy Cap 用户协议'
  agreementText.value = await api.readAgreement(t)
  agreementOpen.value = true
}

function addLog(content: string, type: number, name: string) {
  logs.value.push({ type, logName: name, logContent: content, logTime: new Date().toISOString() })
  if (logs.value.length > 200) logs.value.shift()
}
async function checkApi() {
  const v = await api.getMihomoVersion()
  addLog(v ? `API 内核 ${v}` : 'API 内核检测失败', v ? 3 : 2, 'Mihomo')
}
async function checkSystem() { addLog(await api.getOsVersion(), 3, 'System') }

// 无边框窗口拖动：在标题栏非交互区域按下左键 → 请求宿主发起原生拖动
function onTitlebarMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('button, a, input, select')) return
  api.startDragWindow()
}

const currentServerText = computed(() =>
  subDelay.value < 0 ? '当前服务器：未连通'
    : `当前服务器：${state.value?.subscriberName ?? ''} (${subDelay.value}ms)`)

// 协议/隐私文本按行拆分，标题行（"一、""二、"…中文序号+、）标记出来单独着色
const agreementLines = computed(() =>
  agreementText.value.split('\n').map(t => ({
    text: t,
    heading: /^\s*[一二三四五六七八九十百零]+、/.test(t),
    copyright: /^\s*©/.test(t),
  })))
</script>

<template>
  <a-config-provider :theme="darkTheme">
    <div class="win">
      <div class="glow" />

      <!-- 标题栏 -->
      <header class="titlebar" @mousedown="onTitlebarMouseDown">
        <div class="brand">
          <img class="logo" :src="wpeLogo" alt="WPE" />
          <span class="bname">WPE PROXY CAP</span>
          <span class="bver" v-if="state">V {{ state.version }}</span>
        </div>
        <div class="tbright">
          <div class="tbstatus">
            <span class="s-item">
              <svg class="s-ic" viewBox="0 0 24 24" width="14" height="14" :style="{ color: wpeColor }"><path fill="currentColor" d="M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H7V3H5M5,11V13H7V11H5M5,19V21H7V19H5Z"/></svg>
              订阅服务器：{{ wpeLabel }}
            </span>
            <span class="s-item time">
              <svg class="s-ic" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12.5,7H11V13L15.75,15.85L16.5,14.62L12.5,12.25V7Z"/></svg>
              {{ clock }}
            </span>
          </div>
          <div class="winbtns">
            <button v-if="!connected" class="wb wb-sub" title="订阅设置" @click="subscriberOpen = true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M20 2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h4v5l4-2 4 2v-5h4c1.11 0 2-.89 2-2V4c0-1.11-.89-2-2-2m0 13H4v-2h16v2m0-5H4V4h16v6z"/></svg>
            </button>
            <button v-else class="wb" title="隐藏界面" @click="hideOpen = true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/></svg>
            </button>
            <button class="wb" title="系统日志" @click="logOpen = true">
              <svg viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H5M5,5H19V19H5V5M7,7V9H17V7H7M7,11V13H17V11H7M7,15V17H14V15H7Z"/></svg>
            </button>
            <button class="wb" title="最小化" @click="api.minimizeWindow()">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 11h14v2H5z"/></svg>
            </button>
            <button class="wb close" title="退出" @click="api.closeWindow()">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- 主内容 -->
      <MainView
        v-if="!connected"
        :state="state" :servers="servers" :notices="notices" />

      <ControlCenter v-else :stats="stats" :server-name="selectedServerName" @verify="verifyOpen = true" />

      <!-- 底部状态栏 -->
      <footer class="statusbar">
        <div class="sb-left">
          <a class="copyright" title="访问 WPE 官方网站" @click="api.openExternal('https://www.wpe64.com')">© 2026 Winsock Packet Editor Copyright.</a>
          <a @click="openAgreement('UserAgreement')">用户协议</a>
          <a @click="openAgreement('PrivacyPolicy')">隐私政策</a>
        </div>
        <div class="sb-right">
          <span class="online-dot" :class="{ off: subDelay < 0 }" />
          {{ currentServerText }}
        </div>
      </footer>

      <SubscriberModal
        v-model:open="subscriberOpen"
        :subscriber-name="state?.subscriberName ?? null"
        :subscriber-time="state?.subscriberTime ?? null"
        @updated="refreshAll" />
      <a-modal v-model:open="agreementOpen" :title="agreementTitle" :footer="null" centered width="640px">
        <div class="agreement">
          <div v-for="(line, i) in agreementLines" :key="i" class="ag-line" :class="{ 'ag-heading': line.heading, 'ag-copyright': line.copyright }">{{ line.text || ' ' }}</div>
        </div>
      </a-modal>
      <LogModal v-model:open="logOpen" :logs="logs" @check-api="checkApi" @check-system="checkSystem" @clear="logs = []" />
      <VerifyModal v-model:open="verifyOpen" :verify-url="selectedServer?.verifyURL" />

      <!-- 隐藏窗口确认弹窗（对应原程序 HideForm） -->
      <div v-if="hideOpen" class="hide-overlay" @click.self="hideOpen = false">
        <div class="hide-box">
          <svg class="hide-ic" viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/></svg>
          <h2 class="hide-title">确定要隐藏界面吗？</h2>
          <p class="hide-desc">隐藏后代理功能仍会工作，如需更换服务器请重新启动程序</p>
          <div class="hide-actions">
            <button class="hbtn hbtn-ghost" @click="hideOpen = false">取消</button>
            <button class="hbtn hbtn-primary" @click="confirmHide">确定</button>
          </div>
        </div>
      </div>

      <!-- 版本门槛：客户端版本过低时的阻断遮罩（盖住整个界面，必须更新后才能用） -->
      <div v-if="clientOutdated" class="update-overlay">
        <div class="update-box">
          <svg class="update-ic" viewBox="0 0 24 24" width="52" height="52"><path fill="currentColor" d="M13,14H11V9H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/></svg>
          <h2 class="update-title">需要更新客户端</h2>
          <p class="update-desc">当前客户端 <b>V{{ state?.version }}</b> 版本过低，请更新到最新版本使用。</p>
          <div class="update-actions">
            <button class="ubtn ubtn-ghost" @click="api.closeWindow()">退出</button>
            <button class="ubtn ubtn-primary" @click="downloadNewClient">下载最新版本</button>
          </div>
        </div>
      </div>
    </div>
  </a-config-provider>
</template>

<style scoped>
.win {
  height: 100vh; display: flex; flex-direction: column; position: relative;
  background: #1e293b; color: #e2e8f0; overflow: hidden;
}
.glow {
  position: absolute; width: 600px; height: 600px; top: -220px; right: -120px; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, rgba(56,189,248,.16) 0%, rgba(56,189,248,0) 70%);
}

/* 标题栏 */
.titlebar {
  height: 48px; flex-shrink: 0; z-index: 20; -webkit-app-region: drag; user-select: none;
  display: flex; align-items: center; justify-content: space-between; padding-left: 14px;
  background: rgba(15,23,42,.8); border-bottom: 1px solid rgba(255,255,255,.05);
}
.brand { display: flex; align-items: center; gap: 8px; }
.logo { width: 24px; height: 24px; border-radius: 6px; object-fit: contain; display: block; }
.bname { font-weight: 700; letter-spacing: .5px; color: #38bdf8; }
.bver { font-size: 12px; color: #64748b; border-left: 1px solid #334155; padding-left: 8px; margin-left: 4px; }
.tbright { display: flex; align-items: center; height: 48px; }
.tbstatus { display: flex; align-items: center; gap: 16px; margin-right: 8px; font-size: 12px; color: #94a3b8; -webkit-app-region: no-drag; }
.s-item { display: flex; align-items: center; gap: 6px; }
.s-ic { display: block; }
.winbtns { display: flex; height: 48px; -webkit-app-region: no-drag; }
.wb { width: 46px; height: 48px; border: none; background: transparent; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.wb:hover { background: rgba(255,255,255,.06); color: #e2e8f0; }
.wb.close:hover { background: #dc2626; color: #fff; }
/* 订阅设置：与左侧软件名同色（天蓝 #38bdf8），hover 更亮，不被通用 hover 的灰色覆盖 */
.wb-sub { color: #38bdf8; }
.wb-sub:hover { background: rgba(255,255,255,.06); color: #7dd3fc; }

/* 底部状态栏 */
.statusbar {
  height: 32px; flex-shrink: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
  background: rgba(2,6,23,.8); border-top: 1px solid rgba(255,255,255,.05);
  font-size: 10px; color: #64748b;
}
.sb-left { display: flex; align-items: center; gap: 16px; }
.copyright { color: #64748b; }
.sb-left a { color: #64748b; cursor: pointer; transition: color .15s; }
.sb-left a:hover { color: #cbd5e1; }
.sb-right { display: flex; align-items: center; gap: 6px; }
.online-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; }
.online-dot.off { background: #ef4444; }

.agreement { font-family: inherit; color: #cbd5e1; line-height: 1.7; max-height: 60vh; overflow-y: auto; margin: 0; }
.ag-line { white-space: pre-wrap; min-height: 1.7em; }
/* 标题行（一、二…）与主界面左上角软件名同色（天蓝 #38bdf8） */
.ag-heading { color: #38bdf8; font-weight: 700; }
/* 版权行（© 开头）：小一号字 + 与底部"用户协议"按钮同色（#64748b） */
.ag-copyright { font-size: .85em; color: #64748b; }

/* 隐藏窗口确认弹窗（与控制中心弹窗同款样式） */
.hide-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(15, 23, 42, 0.8); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.hide-box {
  width: 430px; background: #1e293b; border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  padding: 32px; text-align: center;
}
.hide-ic { display: block; margin: 0 auto 16px; color: #10b981; }
.hide-title { margin: 0 0 8px; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; color: #fff; }
.hide-desc { margin: 0 0 24px; font-size: 0.875rem; line-height: 1.5; color: #94a3b8; white-space: nowrap; }
.hide-actions { display: flex; gap: 12px; }
.hbtn { flex: 1; padding: 12px 0; border: none; border-radius: 12px; cursor: pointer; font-size: 1rem; font-weight: 500; color: #fff; transition: background .2s; }
.hbtn-ghost { background: #334155; }
.hbtn-ghost:hover { background: #475569; }
.hbtn-primary { background: #0ea5e9; }
.hbtn-primary:hover { background: #38bdf8; }

/* 版本门槛阻断遮罩（z-index 高于标题栏，盖住整个窗口） */
.update-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(15, 23, 42, 0.92); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
}
.update-box {
  width: 460px; background: #1e293b; border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  padding: 32px; text-align: center;
}
.update-ic { display: block; margin: 0 auto 16px; color: #fbbf24; }
.update-title { margin: 0 0 8px; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; color: #fff; }
.update-desc { margin: 0 0 24px; font-size: 0.875rem; line-height: 1.7; color: #94a3b8; }
.update-desc b { color: #e2e8f0; font-weight: 600; }
.update-actions { display: flex; gap: 12px; }
.ubtn { flex: 1; padding: 12px 0; border: none; border-radius: 12px; cursor: pointer; font-size: 1rem; font-weight: 500; color: #fff; transition: background .2s; }
.ubtn-ghost { background: #334155; }
.ubtn-ghost:hover { background: #475569; }
.ubtn-primary { background: #0ea5e9; }
.ubtn-primary:hover { background: #38bdf8; }
</style>
