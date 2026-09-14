<script setup lang="ts">
/*
  手机版外壳（WPEProxyCap.Android）—— 顶栏 + 一整条可滚动的竖屏页 + 页脚。

  与 Windows 版 App.vue 的分工一模一样（同一套桥事件、同一套弹窗、同一份 i18n / 主题），差在：
    · 没有窗口：没有自绘标题栏上的拖动 / 最小化 / 最大化 / 置顶 / 退出，顶栏只留「系统日志」与「软件设置」；
      退出就是系统的返回键 —— 有弹窗时先关弹窗，没有弹窗时原生侧把应用退到后台（VPN 在前台服务里继续跑）；
    · 骨架是竖着的 MobileHome / MobileControl，零件与 Windows 共用；
    · 多一张 DEVICE 卡：分应用代理、后台运行（电池优化）。
  状态栏、刘海、手势条的留白由原生侧按 WindowInsets 给 WebView 加内边距，这里不用 env(safe-area-inset-*)。
*/
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { inHost, on } from './bridge'
import { api, type AppState, type ServerInfo, type NoticeInfo, type LiveStats, type LogItem, type AppProxy, type PlatformInfo } from './api'
import { defOf, lang, t, isEn, initLang, type Key } from './i18n'
import { initTheme } from './stores/theme'
import { pushToast } from './stores/toast'
import { anyModalOpen, closeTopModal } from './useModal'
import MobileHome from './components/mobile/MobileHome.vue'
import MobileControl from './components/mobile/MobileControl.vue'
import AppPicker from './components/mobile/AppPicker.vue'
import SubscriberModal from './components/SubscriberModal.vue'
import LogModal from './components/LogModal.vue'
import VerifyModal from './components/VerifyModal.vue'
import AgreementModal from './components/AgreementModal.vue'
import AppSetting from './components/AppSetting.vue'
import ToastStack from './components/ToastStack.vue'

const state = ref<AppState | null>(null)
const servers = ref<ServerInfo[]>([])
const notices = ref<NoticeInfo[]>([])
const wpeStatus = ref('')
const subDelay = ref(-1)
const connected = ref(false)
const stats = ref<LiveStats | null>(null)
const logs = ref<LogItem[]>([])
const platform = ref<PlatformInfo | null>(null)
const appProxy = ref<AppProxy | null>(null)

const subscriberOpen = ref(false)
const agreementOpen = ref(false)
const agreementTitle = ref('')
const agreementText = ref('')
const logOpen = ref(false)
const verifyOpen = ref(false)
const appSetOpen = ref(false)
const appsOpen = ref(false)

/* 最近一次连接失败的具体原因（原生侧在返回 false 之前推 connectError），login 取走一次就清空 */
const lastFail = ref<Key | null>(null)

function takeFail(): Key | null {
  const k = lastFail.value
  lastFail.value = null
  return k
}

const offs: Array<() => void> = []

const selectedServer = computed(() =>
  servers.value.find((s) => s.serverId === state.value?.selectedServerId) ?? servers.value[0] ?? null)
const selectedServerName = computed(() => selectedServer.value?.serverName ?? '')

/* ⚠️ 映射表必须覆盖每一个取值（与 App.vue 同一张），第五种「还没测出来」走 checking */
const NET: Record<string, { k: Key; c: string }> = {
  online: { k: 'win.net.online', c: 'g' },
  slow: { k: 'win.net.slow', c: 'a' },
  lag: { k: 'win.net.lag', c: 'o' },
  offline: { k: 'win.net.offline', c: 'm' },
}

const net = computed(() => NET[wpeStatus.value] ?? { k: 'win.net.checking' as Key, c: 'm' })

async function refreshNetwork(): Promise<void> {
  try {
    wpeStatus.value = await api.checkWpeServer()
    subDelay.value = await api.checkSubscriberServer()
    servers.value = await api.getServers()
    notices.value = await api.getNotices()
  } catch (e) {
    console.error('[mobile] 取订阅数据失败', e)
  }
}

async function refreshDevice(): Promise<void> {
  try {
    platform.value = await api.getPlatformInfo()
    appProxy.value = await api.getAppProxy()
  } catch (e) {
    console.error('[mobile] 取设备信息失败', e)
  }
}

async function refreshAll(): Promise<void> {
  try {
    state.value = await api.getState()
    connected.value = state.value.isConnected
  } catch (e) {
    console.error('[mobile] 刷新状态失败', e)
  }
  await refreshNetwork()
}

/*
  系统返回键。原生侧（MainActivity 的 OnBackPressedCallback）调 window.__wpcBack()：
  返回 true = 前端消费掉了（关了一个弹窗）；false = 没有弹窗开着，原生把应用退到后台。
*/
function onBack(): boolean {
  return closeTopModal()
}

onMounted(async () => {
  ;(window as any).__wpcBack = onBack

  if (!inHost) return

  offs.push(on('connected', (s: AppState) => { state.value = s; connected.value = true }))
  offs.push(on('disconnected', () => { connected.value = false; stats.value = null }))
  offs.push(on('stats', (d: LiveStats) => (stats.value = d)))
  offs.push(on('log', (d: LogItem) => { logs.value.push(d); if (logs.value.length > 200) logs.value.shift() }))
  offs.push(on('connectError', (d: { reason: string }) => { lastFail.value = d?.reason === 'vpn' ? 'mob.vpnDenied' : null }))
  // 应用回到前台（从系统设置、电池优化页回来）：权限状态可能变了
  offs.push(on('resume', () => { refreshDevice() }))

  try {
    const s = await api.getState()
    state.value = s
    connected.value = s.isConnected
    // 语言与主题要在任何文字画出来之前定好（与 App.vue 同一条口径）
    initLang(s.language)
    initTheme(s.themeMode, s.isDark, s.scanLine)
  } catch (e) {
    console.error('[mobile] 取初始状态失败', e)
  }

  await refreshDevice()
  await refreshNetwork()
})

onUnmounted(() => {
  offs.forEach((f) => f())
  delete (window as any).__wpcBack
})

async function openAgreement(type: 'UserAgreement' | 'PrivacyPolicy'): Promise<void> {
  agreementTitle.value = t(type === 'PrivacyPolicy' ? 'ag.privacy' : 'ag.terms')
  agreementText.value = await api.readAgreement(type)
  agreementOpen.value = true
}

function addLog(content: string, type: number, name: string): void {
  logs.value.push({ type, logName: name, logContent: content, logTime: new Date().toISOString() })
  if (logs.value.length > 200) logs.value.shift()
}

async function checkApi(): Promise<void> {
  const v = await api.getMihomoVersion()
  addLog(v ? t('log.kernelOk').replace('{0}', v) : t('log.kernelBad'), v ? 3 : 2, 'Mihomo')
}

async function checkSystem(): Promise<void> { addLog(await api.getOsVersion(), 3, 'System') }

async function fixBattery(): Promise<void> {
  try { await api.requestIgnoreBattery() } catch { /* 原生侧会记日志 */ }
}

function open(url: string): void { api.openExternal(url).catch(() => {}) }

/** 官网页面地址，按当前语言分流（中文页在根目录，英文页在 en/） */
function site(page: string): string {
  return 'https://www.wpe64.com/' + (isEn.value ? 'en/' : '') + page
}

/* 跟语言走的尺寸令牌写在 :root 上（弹窗 Teleport 到 body，挂在外壳上它们拿不到） */
watchEffect(() => {
  document.documentElement.style.setProperty('--setf-kx', defOf(lang.value).wide ? '1.3' : '1')
})

function onDisconnected(): void {
  connected.value = false
  stats.value = null
  pushToast('info', t('cc.disconnected'))
}

function onAppsSaved(): void {
  refreshDevice()
  pushToast('success', t(connected.value ? 'mob.appsNext' : 'mob.appsSaved'))
}
</script>

<template>
  <div class="mwin">
    <div class="pcb" />
    <div class="scan" />

    <div class="mshell" :inert="anyModalOpen">
      <header class="mbar">
        <div class="brand">
          <span class="bname">WPE <small>PROXY CAP</small></span>
          <span class="bver">V {{ state?.version || '—' }}</span>
        </div>

        <div class="acts">
          <button class="wb" :aria-label="t('win.log')" @click="logOpen = true">
            <svg class="ico" viewBox="0 0 24 24">
              <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
          </button>
          <!-- 齿轮画布 32 + 描边 2.667，与 Windows 标题栏那颗同一对参数（见 App.vue） -->
          <button class="wb gear" :class="{ on: appSetOpen }" :aria-label="t('win.set')" @click="appSetOpen = true">
            <svg class="ico" viewBox="-4 -4 32 32">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main class="mscroll">
        <div v-if="!inHost" class="nohost">{{ t('win.nohost') }}</div>

        <template v-else>
          <MobileControl
            v-if="connected"
            :stats="stats"
            :server-name="selectedServerName"
            :notices="notices"
            @verify="verifyOpen = true"
            @disconnected="onDisconnected" />

          <MobileHome
            v-else
            :state="state"
            :servers="servers"
            :notices="notices"
            :net-text="t(net.k)"
            :net-tone="net.c"
            :sub-delay="subDelay"
            :app-proxy="appProxy"
            :platform="platform"
            :fail-key="takeFail"
            @subscribe="subscriberOpen = true"
            @apps="appsOpen = true"
            @battery="fixBattery" />
        </template>

        <footer class="mfoot">
          <div class="srv">
            <span class="dot" :class="{ off: subDelay < 0 }" />
            <span class="lb">{{ t('foot.server') }}</span>
            <span class="addr">{{ state?.subscriberName || '—' }}</span>
            <span class="sep">//</span>
            <span :class="subDelay < 0 ? 'off-t' : 'on'">{{ subDelay < 0 ? t('foot.unreachable') : subDelay + ' ms' }}</span>
          </div>
          <nav class="links">
            <a @click="openAgreement('UserAgreement')">{{ t('foot.agreement') }}</a>
            <a @click="openAgreement('PrivacyPolicy')">{{ t('foot.privacy') }}</a>
            <a @click="open(site('tutorial.html#wpc-android'))">{{ t('foot.tutorial') }}</a>
            <a @click="open('https://github.com/x-nas/WPEProxyCap.Android')">{{ t('mob.source') }}</a>
          </nav>
          <a class="copy" @click="open('https://www.wpe64.com')">© 2026 Winsock Packet Editor</a>
        </footer>
      </main>
    </div>

    <SubscriberModal
      v-model:open="subscriberOpen"
      :subscriber-name="state?.subscriberName ?? null"
      :subscriber-time="state?.subscriberTime ?? null"
      @updated="refreshAll" />

    <LogModal v-model:open="logOpen" :logs="logs"
              @check-api="checkApi" @check-system="checkSystem" @clear="logs = []" />

    <VerifyModal v-model:open="verifyOpen" />

    <AgreementModal v-model:open="agreementOpen" :title="agreementTitle" :text="agreementText" />

    <AppSetting v-model:open="appSetOpen" />

    <AppPicker v-model:open="appsOpen" @saved="onAppsSaved" />

    <ToastStack />
  </div>
</template>

<style scoped>
.mwin {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--black);
  overflow: hidden;
}

.mshell {
  position: relative;
  z-index: 10;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ── 顶栏 ─────────────────────────────── */
.mbar {
  position: relative;
  z-index: 20;
  height: 52px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 16px;
  background: rgb(var(--chrome-rgb) / 88%);
  border-bottom: 1px solid var(--border);
  user-select: none;
}

.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }

.bname {
  font-family: var(--orbit);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -.02em;
  color: var(--green);
  white-space: nowrap;
}

.bname small { font-size: inherit; font-weight: 500; color: var(--muted); }

.bver {
  font-family: var(--share);
  font-size: var(--label-size);
  line-height: 1;
  letter-spacing: .16em;
  color: var(--muted);
  border-left: 1px solid var(--border);
  padding-left: 10px;
  white-space: nowrap;
}

.acts { display: flex; align-items: center; }

/* 触屏：图标按钮 48×48，比 Windows 标题栏的 44×46 再大一点 */
.wb {
  width: 48px;
  height: 48px;
  flex: none;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wb:active { color: var(--green); background: rgb(var(--green-rgb) / 8%); }
.wb:focus-visible { outline-offset: -4px; }
.wb.gear .ico { stroke: var(--cyan); stroke-width: 2.667; }
.wb.gear.on, .wb.gear:active { color: var(--cyan); background: rgb(var(--cyan-rgb) / 8%); }

/* ── 滚动区 ─────────────────────────────── */
.mscroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  /*
    手机上的滚动条本来就是覆盖式的（不占宽度）；桌面 Chromium 调试时是经典滚动条，会吃掉 10px，
    整页内容因此偏左 5px、与真机对不上。这里统一藏掉，探针页与真机同一个宽度。
  */
  scrollbar-width: none;
}

.mscroll::-webkit-scrollbar { display: none; }

/* ── 页脚 ─────────────────────────────── */
.mfoot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 20px;
  font-family: var(--share);
  font-size: var(--label-size);
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--muted);
}

.srv { display: flex; align-items: center; justify-content: center; gap: 8px; max-width: 100%; }
.srv .lb { white-space: nowrap; }
.srv .addr { min-width: 0; color: var(--cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.srv .sep { color: var(--border); }
.srv .on { color: var(--green); white-space: nowrap; }
.srv .off-t { color: var(--muted); white-space: nowrap; }
.srv .dot { width: 7px; height: 7px; flex: none; background: var(--green); box-shadow: 0 0 6px var(--green); }
.srv .dot.off { background: var(--muted); box-shadow: none; }

.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 0; }
.links a { padding: 8px 10px; color: var(--muted); text-decoration: none; cursor: pointer; white-space: nowrap; }
.links a:active { color: var(--green); }

.copy { color: var(--dim2); text-decoration: none; cursor: pointer; }

.nohost {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--muted);
}
</style>
