<script setup lang="ts">
/*
  手机版外壳（WPEProxyCap.Android）—— 2026-09-15 按「方案 A」整体重做。

  结构：没有订阅号时走引导（只填订阅号；账号密码 2026-09-15 起在「加速」页上直接填），之后是四个标签：
    加速（节点卡 + 反应堆核心 / 已连接时的计时与读数）· 节点 · 消息 · 我的（方案 C 的分组设置）
  手机宽度（< 600px）标签栏在底部；平板与横屏（≥ 600px）变成左侧导航栏，各页在 ≥ 840px 时分两栏。

  与 Windows 版 App.vue 共用：桥事件、登录逻辑 useLoginForm（这里只建一份，provide 给各页）、
  控制中心逻辑 useControlPanel、系统日志 / 安全验证 / 协议 / 分应用代理几个弹窗、i18n、主题。
  不再共用：MainView / ControlCenter 的骨架与 home.css / control.css（电脑版的三舱布局）。

  系统返回键（原生侧调 window.__wpcBack）：弹窗 / 弹层 → 页内层级（消息详情）
  → 回到「加速」页 → 都没有才交还系统（退到后台，VPN 在前台服务里继续跑）。
  状态栏、刘海、手势条的留白由原生侧按 WindowInsets 给 WebView 加内边距，这里不用 env(safe-area-inset-*)。
*/
import { computed, onMounted, onUnmounted, provide, ref, watchEffect } from 'vue'
import { inHost, on } from './bridge'
import { api, type AppState, type ServerInfo, type NoticeInfo, type LiveStats, type LogItem, type AppProxy, type PlatformInfo } from './api'
import { defOf, lang, t, isEn, initLang, type Key } from './i18n'
import { initTheme } from './stores/theme'
import { pushToast } from './stores/toast'
import { unreadCount, readKeys } from './stores/inbox'
import { anyModalOpen, closeTopModal } from './useModal'
import { popBack } from './useBackStack'
import { useLoginForm } from './components/useLoginForm'
import { LOGIN } from './components/mobile/inject'
import './components/mobile/mobile.css'
import Onboard from './components/mobile/Onboard.vue'
import BoostTab from './components/mobile/BoostTab.vue'
import NodesTab from './components/mobile/NodesTab.vue'
import InboxTab from './components/mobile/InboxTab.vue'
import MeTab from './components/mobile/MeTab.vue'
import NodeList from './components/mobile/NodeList.vue'
import BottomSheet from './components/mobile/BottomSheet.vue'
import AccountSheet from './components/mobile/AccountSheet.vue'
import SubscribeSheet from './components/mobile/SubscribeSheet.vue'
import AppPicker from './components/mobile/AppPicker.vue'
import LogSheet from './components/mobile/LogSheet.vue'
import VerifyModal from './components/VerifyModal.vue'
import AgreementModal from './components/AgreementModal.vue'
import ToastStack from './components/ToastStack.vue'

type Tab = 'boost' | 'nodes' | 'inbox' | 'me'

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
const delays = ref<Record<string, number>>({})
const testing = ref(false)
const loaded = ref(false)
const onboardDone = ref(false)

const tab = ref<Tab>('boost')
// 探针页截图用：?tab=nodes|inbox|me（只在开发构建里认）
if (import.meta.env.DEV) {
  const want = new URLSearchParams(location.search).get('tab')
  if (want === 'nodes' || want === 'inbox' || want === 'me') tab.value = want
}

const nodeSheet = ref(false)
const accountSheet = ref(false)
const subscribeSheet = ref(false)
const agreementOpen = ref(false)
const agreementTitle = ref('')
const agreementText = ref('')
const logOpen = ref(false)
const verifyOpen = ref(false)
const appsOpen = ref(false)

/* 最近一次连接失败的具体原因（原生侧在返回 false 之前推 connectError），login 取走一次就清空 */
const lastFail = ref<Key | null>(null)

function takeFail(): Key | null {
  const k = lastFail.value
  lastFail.value = null
  return k
}

const form = useLoginForm(() => state.value, () => servers.value, takeFail)
provide(LOGIN, form)

const offs: Array<() => void> = []

/* ⚠️ 映射表必须覆盖每一个取值（与 App.vue 同一张），第五种「还没测出来」走 checking */
const NET: Record<string, { k: Key; c: string }> = {
  online: { k: 'win.net.online', c: 'g' },
  slow: { k: 'win.net.slow', c: 'a' },
  lag: { k: 'win.net.lag', c: 'o' },
  offline: { k: 'win.net.offline', c: 'm' },
}

const net = computed(() => NET[wpeStatus.value] ?? { k: 'win.net.checking' as Key, c: 'm' })

const unread = computed(() => {
  void readKeys.value
  return unreadCount(notices.value)
})

/*
  没有订阅号就先走引导；已经连着（「始终开启的 VPN」在后台连上的）不打断。
  ⚠️ 不再看账号：账号表单在「加速」页上，还没有账号的用户要能在主界面上找回密码 / 注册（2026-09-15 用户要求）。
*/
const onboarding = computed(() =>
  inHost && loaded.value && !onboardDone.value && !connected.value && !state.value?.subscriberName)

async function testDelays(): Promise<void> {
  if (!servers.value.length) { delays.value = {}; return }
  testing.value = true
  try {
    const list = await api.testServerDelays()
    const next: Record<string, number> = {}
    list.forEach((x) => { next[x.serverId] = x.delay })
    delays.value = next
  } catch (e) {
    console.error('[mobile] 节点测速失败', e)
  } finally {
    testing.value = false
  }
}

async function refreshNetwork(): Promise<void> {
  try {
    wpeStatus.value = await api.checkWpeServer()
    subDelay.value = await api.checkSubscriberServer()
    servers.value = await api.getServers()
    notices.value = await api.getNotices()
  } catch (e) {
    console.error('[mobile] 取订阅数据失败', e)
  }
  void testDelays()
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

function onBack(): boolean {
  if (closeTopModal()) return true
  if (popBack()) return true
  if (!onboarding.value && tab.value !== 'boost') { tab.value = 'boost'; return true }
  return false
}

onMounted(async () => {
  ;(window as any).__wpcBack = onBack

  if (!inHost) return

  offs.push(on('connected', (s: AppState) => { state.value = s; connected.value = true }))
  offs.push(on('disconnected', () => { connected.value = false; stats.value = null }))
  offs.push(on('stats', (d: LiveStats) => (stats.value = d)))
  offs.push(on('log', (d: LogItem) => { logs.value.push(d); if (logs.value.length > 200) logs.value.shift() }))
  offs.push(on('connectError', (d: { reason: string }) => { lastFail.value = d?.reason === 'vpn' ? 'mob.vpnDenied' : null }))
  // 连接时发现节点在手机上一条走代理的规则都没有（原生侧在生成配置时判）
  offs.push(on('rulesNoProxy', () => pushToast('warning', t('mob.noProxyToast'))))
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
  } finally {
    loaded.value = true
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

async function onOnboardDone(): Promise<void> {
  onboardDone.value = true
  tab.value = 'boost'
  await refreshAll()
}

function chooseNode(id: string): void {
  if (connected.value) { pushToast('info', t('mob.nodeLocked')); return }
  form.chooseServer(id)
  nodeSheet.value = false
}

const TABS: Array<{ id: Tab; k: Key; d: string }> = [
  { id: 'boost', k: 'mob.tabBoost', d: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  { id: 'nodes', k: 'mob.tabNodes', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18' },
  { id: 'inbox', k: 'mob.tabInbox', d: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0' },
  { id: 'me', k: 'mob.tabMe', d: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6' },
]
</script>

<template>
  <div class="mwin">
    <div class="pcb" />
    <div class="scan" />

    <div class="mshell" :class="{ solo: !inHost || onboarding }" :inert="anyModalOpen">
      <div v-if="!inHost" class="nohost">{{ t('win.nohost') }}</div>

      <Onboard v-else-if="onboarding" :state="state" :refresh="refreshAll" @agreement="openAgreement" @done="onOnboardDone" />

      <template v-else>
        <main class="stage">
          <BoostTab
            v-show="tab === 'boost'"
            :state="state" :servers="servers" :delays="delays" :stats="stats" :connected="connected"
            :platform="platform" :app-proxy="appProxy" :refresh="refreshAll"
            @nodes="nodeSheet = true" @apps="appsOpen = true"
            @subscribe="subscribeSheet = true" @verify="verifyOpen = true" @battery="fixBattery"
            @rules-help="open(site('tutorial.html#m-rules'))" @disconnected="onDisconnected" />

          <NodesTab
            v-show="tab === 'nodes'"
            :state="state" :servers="servers" :delays="delays" :testing="testing" :connected="connected" :refresh="refreshAll"
            @retest="testDelays" @subscribe="subscribeSheet = true" @choose="chooseNode" />

          <InboxTab v-show="tab === 'inbox'" :notices="notices" :visible="tab === 'inbox'" :refresh="refreshNetwork" @open="open" />

          <MeTab
            v-show="tab === 'me'"
            :state="state" :servers="servers" :platform="platform" :app-proxy="appProxy"
            :net-text="t(net.k)" :net-tone="net.c" :sub-delay="subDelay"
            @account="accountSheet = true" @subscribe="subscribeSheet = true" @apps="appsOpen = true"
            @battery="fixBattery" @log="logOpen = true" @agreement="openAgreement"
            @tutorial="open(site('tutorial.html#wpc-android'))" @open="open" />
        </main>

        <nav class="nav" :aria-label="t('mob.tabBoost')">
          <button
            v-for="x in TABS" :key="x.id"
            class="nb" :class="{ on: tab === x.id }" type="button" :data-tab="x.id"
            :aria-current="tab === x.id ? 'page' : undefined"
            @click="tab = x.id"
          >
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path :d="x.d" /></svg>
            <span>{{ t(x.k) }}</span>
            <b v-if="x.id === 'inbox' && unread" class="badge">{{ unread > 99 ? '99+' : unread }}</b>
          </button>
        </nav>
      </template>
    </div>

    <BottomSheet v-model:open="nodeSheet" :title="t('mob.tabNodes')">
      <template #action>
        <button class="m-chipbtn" type="button" :disabled="testing" @click="testDelays">{{ testing ? t('mob.testing') : t('mob.retest') }}</button>
      </template>
      <NodeList :servers="servers" :selected-id="form.selectedId.value" :delays="delays" @choose="chooseNode" />
    </BottomSheet>

    <AccountSheet v-model:open="accountSheet" />

    <SubscribeSheet
      v-model:open="subscribeSheet"
      :subscriber-name="state?.subscriberName ?? null"
      :subscriber-time="state?.subscriberTime ?? null"
      @updated="refreshAll" />

    <LogSheet v-model:open="logOpen" :logs="logs"
              @check-api="checkApi" @check-system="checkSystem" @clear="logs = []" />

    <VerifyModal v-model:open="verifyOpen" />

    <AgreementModal v-model:open="agreementOpen" :title="agreementTitle" :text="agreementText" />

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
  display: grid;
  /* ⚠️ 列宽必须写 minmax(0, 1fr)：默认的 auto 列会被横向滚动的内容（消息页的筛选胶囊）撑宽，整屏跟着溢出、底部标签被挤出屏幕 */
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
}

.mshell.solo { display: block; }

.stage { position: relative; min-height: 0; }
.stage > * { height: 100%; }

/* ── 底部标签栏 ─────────────────────────────── */
.nav {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  height: 62px;
  border-top: 1px solid var(--border);
  background: rgb(var(--chrome-rgb) / 94%);
  user-select: none;
}

.nb {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-family: var(--m-sans);
  font-size: var(--fs-caption);
  cursor: pointer;
}

.nb .ico { width: 24px; height: 24px; }
.nb.on { color: var(--green); }
.nb.on::before { content: ""; position: absolute; top: 0; left: 30%; right: 30%; height: 2px; background: var(--green); box-shadow: 0 0 8px var(--green); }
.nb:focus-visible { outline-offset: -4px; }

.badge {
  position: absolute;
  top: 6px;
  left: calc(50% + 6px);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-family: var(--mono);
  font-size: var(--fs-caption);
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}

/* ── 平板 / 横屏：左侧导航栏 ─────────────────────────────── */
@media (min-width: 600px) {
  .mshell:not(.solo) { grid-template-rows: minmax(0, 1fr); grid-template-columns: 92px minmax(0, 1fr); }
  .nav {
    grid-row: 1;
    grid-column: 1;
    grid-auto-flow: row;
    grid-auto-rows: 76px;
    grid-auto-columns: auto;
    align-content: start;
    height: auto;
    padding-top: 20px;
    border-top: 0;
    border-right: 1px solid var(--border);
  }
  .stage { grid-row: 1; grid-column: 2; }
  .nb.on::before { top: 20%; bottom: 20%; left: 0; right: auto; width: 3px; height: auto; }
  .badge { top: 10px; }
}

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
