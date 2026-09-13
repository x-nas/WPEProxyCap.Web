<script setup lang="ts">
/*
  外壳的最外层：氛围层 + 自绘标题栏 + 视图切换 + 状态栏。

  与 WPE x64 的 WebUI/src/App.vue <b>同一形制</b> —— 同一套氛围层（.pcb / .scan / .cn）、
  同一条标题栏（品牌 + 版本 + 齿轮 + 图钉 + 分隔线 + 三个窗口按钮）、
  同一条状态栏（左边几条链接、右边一盏灯 + 当前服务器）。两个程序并排摆着应该
  一眼看出是同一家出的。

  窗口是无边框的（ShellForm 里 FormBorderStyle.None），所以标题栏、拖动、
  最小化、关闭都由这里负责。

  【两个视图】主页（公告 + 登录卡）· 控制中心（连上之后）。
  与 WPE 不同的是这里<b>能来回</b>：断开连接就回主页，因为「断开」本来就是
  控制中心上的一个动作，回到主页时后台确实什么都没跑。
*/
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { call, inHost, on } from './bridge'
import { api, type AppState, type ServerInfo, type NoticeInfo, type LiveStats, type LogItem } from './api'
import { defOf, lang, t, isEn, type Key } from './i18n'
import { initLang } from './i18n'
import { initTheme } from './stores/theme'
import { pushToast } from './stores/toast'
import { anyModalOpen } from './useModal'
import MainView from './components/MainView.vue'
import ControlCenter from './components/ControlCenter.vue'
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

const subscriberOpen = ref(false)
const agreementOpen = ref(false)
const agreementTitle = ref('')
const agreementText = ref('')
const logOpen = ref(false)
const verifyOpen = ref(false)
const appSetOpen = ref(false)
const topMost = ref(false)

// 最大化状态以 C# 为准：Win+↑ / 拖到屏幕顶端这类不经按钮的切换由 window:state 事件带回来
const maximized = ref(false)

const offs: Array<() => void> = []

const selectedServer = computed(() =>
  servers.value.find((s) => s.serverId === state.value?.selectedServerId) ?? servers.value[0] ?? null)
const selectedServerName = computed(() => selectedServer.value?.serverName ?? '')

/*
  订阅服务器的连通性。四种返回各对应一个文案键与一种颜色 ——
  ⚠️ <b>映射表必须覆盖每一个取值</b>，漏掉的那个查出来是 undefined，
  界面上那一格是<b>空白</b>而且不报错（WPE 的 PACKET_TYPE 栽过这个坑）。
  第五种「还没测出来」（空串）是刻意留的一支，走 `checking`。
*/
const NET: Record<string, { k: Key; c: string }> = {
  online: { k: 'win.net.online', c: 'g' },
  slow: { k: 'win.net.slow', c: 'a' },
  lag: { k: 'win.net.lag', c: 'o' },
  offline: { k: 'win.net.offline', c: 'm' },
}

const net = computed(() => NET[wpeStatus.value] ?? { k: 'win.net.checking' as Key, c: 'm' })

async function refreshAll(): Promise<void> {
  state.value = await api.getState()
  connected.value = state.value.isConnected
  wpeStatus.value = await api.checkWpeServer()
  subDelay.value = await api.checkSubscriberServer()
  servers.value = await api.getServers()
  notices.value = await api.getNotices()
}

onMounted(async () => {
  if (!inHost) return

  offs.push(on('connected', (s: AppState) => { state.value = s; connected.value = true }))
  offs.push(on('disconnected', () => { connected.value = false; stats.value = null }))
  offs.push(on('stats', (d: LiveStats) => (stats.value = d)))
  offs.push(on('log', (d: LogItem) => { logs.value.push(d); if (logs.value.length > 200) logs.value.shift() }))
  offs.push(on('window:state', (d: { maximized: boolean }) => { maximized.value = !!d.maximized }))

  try {
    const s = await api.getState()
    state.value = s
    connected.value = s.isConnected

    /*
      语言与主题要在<b>任何界面文字画出来之前</b>定好，否则英文用户会先看见一帧中文、
      浅色用户会先闪一下深色。getState 已经是首屏的第一次往返，顺便把它们捎回来，
      不为此单开一次 getPrefs（与 WPE 的 getSystemCheck 同一条口径）。
    */
    initLang(s.language)
    initTheme(s.themeMode, s.isDark, s.scanLine)
  } catch (e) {
    console.error('[app] 取初始状态失败', e)
  }

  // 剩下几项是网络往返，慢一点无所谓，放在语言 / 主题定好之后再取
  try {
    wpeStatus.value = await api.checkWpeServer()
    subDelay.value = await api.checkSubscriberServer()
    servers.value = await api.getServers()
    notices.value = await api.getNotices()
  } catch (e) {
    console.error('[app] 取订阅数据失败', e)
  }
})

onUnmounted(() => { offs.forEach((f) => f()) })

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

/*
  拖动。

  ⚠️ WPC 的 ShellForm <b>没有开</b> WebView2 的 IsNonClientRegionSupportEnabled，
  所以 CSS 的 `app-region: drag` 在这里不生效，只能走 C# 的
  SendMessage(WM_NCLBUTTONDOWN) 那条路。

  那条路有个已知副作用：系统会抢走鼠标捕获，Chromium 收不到 mouseup，
  拖完会在光标处<b>补派发一次 click</b> —— 落在「退出」上就直接把程序关了。
  所以下面的窗口按钮有一道独立防线（armBtn / fireBtn），与 WPE 的做法一致。
*/
function onTitlebarMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('button, a, input, select')) return
  api.startDragWindow().catch(() => {})
}

/*
  窗口按钮的点击防线：只认「在这个按钮上按下、又在这个按钮上松开」的点击。
  凭空出现的 click（拖动结束后补派发的那次）没有配对的 mousedown，会被丢掉。
*/
const armed = ref<HTMLElement | null>(null)

function armBtn(e: MouseEvent): void {
  armed.value = e.button === 0 ? (e.currentTarget as HTMLElement) : null
}

function fireBtn(e: MouseEvent, run: () => void): void {
  const el = e.currentTarget as HTMLElement
  const ok = armed.value === el
  armed.value = null

  if (!ok) {
    console.warn('[app] 丢弃一次没有配对 mousedown 的窗口按钮点击')
    return
  }

  run()
}

async function toggleMax(): Promise<void> {
  try {
    const r = await api.toggleMaximize()
    maximized.value = !!r.maximized
  } catch {
    /* 忽略 */
  }
}

async function toggleTopMost(): Promise<void> {
  try {
    const r = await api.setTopMost(!topMost.value)
    topMost.value = !!r.topMost
  } catch {
    /* 忽略 */
  }
}

function open(url: string): void { api.openExternal(url).catch(() => {}) }

/**
 * 官网页面地址，按当前语言分流。
 * 官网 15 个中文页在根目录、同名英文页在 en/ 下，所以只是加个前缀。
 */
function site(page: string): string {
  return 'https://www.wpe64.com/' + (isEn.value ? 'en/' : '') + page
}

/*
  跟语言走的尺寸令牌，写在 <b>:root</b> 上而不是 .win 上 —— 弹窗一律 Teleport 到
  body，挂在 .win 上的话它们就在继承链之外，--setf-kx 会退回默认的 1，
  表现是俄语 / 越南语下设置弹窗的标签列突然变窄。
*/
watchEffect(() => {
  const r = document.documentElement.style
  r.setProperty('--setf-kx', defOf(lang.value).wide ? '1.3' : '1')
})

/* 断开连接是 ControlCenter 发起的，这里只负责回主页并给一句提示 */
function onDisconnected(): void {
  connected.value = false
  stats.value = null
  pushToast('info', t('cc.disconnected'))
}
</script>

<template>
  <div class="win">
    <!-- 氛围层：网格底纹 + 游走亮带（四角标记在最上层，见文件末尾） -->
    <div class="pcb" />
    <div class="scan" />

    <!--
      模态弹窗打开时，除弹窗以外的整块置 inert：Tab 走不进去、鼠标也点不动。
      不这么做的话焦点能从弹窗跳到标题栏的退出按钮上，回车就把程序关了。
    -->
    <div class="shell" :inert="anyModalOpen">
      <header class="titlebar" @mousedown="onTitlebarMouseDown">
        <div class="brand">
          <!-- 与 WPE 的标题栏逐项对齐：Orbitron 800、紧字距、型号那截更小更细且灰 -->
          <span class="bname">WPE <small>PROXY CAP</small></span>
          <span class="bver">V {{ state?.version || '—' }}</span>
        </div>

        <div class="tbright">
          <!--
            标题栏上原来的「订阅服务器状态 + 时钟」2026-09-13 去掉：
            主页右舱的订阅面板已经显示订阅服务器的连通性，这里是重复信息。
          -->

          <!--
            订阅设置<b>不在标题栏上</b>（2026-09-13 删掉）：主页右舱的「订阅设置」按钮与
            没有节点时的空节点磁贴都能打开它，出现时机也一样（只在未连接时）——
            标题栏再放一颗是重复入口，还挤在窗口级按钮中间。
          -->

          <button class="wb" :title="t('win.log')"
                  @mousedown="armBtn" @click="fireBtn($event, () => { logOpen = true })">
            <svg class="ico" viewBox="0 0 24 24">
              <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
          </button>

          <!--
            软件设置（语言 + 主题 + 氛围）。青色把它与右边那三个窗口控制分开 ——
            那三个的 hover 是绿的，再配上中间那条分隔线，一眼能读出「这颗不是窗口控制」。

            ⚠️ 画布是 32 不是 24：齿轮的墨迹顶满了 24 的画布（实测比「最大化」那个方框宽
            33%），摆在一排里就是它一个显得胖。放大画布让同一条路径画小，
            描边跟着缩，所以 stroke-width 要补成 2 × 32/24 = 2.667 —— <b>两者是一对</b>。
          -->
          <button class="wb gear" :class="{ on: appSetOpen }" :title="t('win.set')"
                  aria-haspopup="dialog" :aria-expanded="appSetOpen"
                  @mousedown="armBtn" @click="fireBtn($event, () => { appSetOpen = true })">
            <svg class="ico" viewBox="-4 -4 32 32">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
            </svg>
          </button>

          <!--
            窗口保持最前。图钉<b>斜着</b>是未固定、<b>立起来</b>是已固定。
            用琥珀而不是绿：绿已经是整排按钮的 hover 色，用绿的话开着和只是划过分不出来。
          -->
          <button class="wb pin" :class="{ on: topMost }" :title="t(topMost ? 'win.unpin' : 'win.pin')"
                  :aria-pressed="topMost"
                  @mousedown="armBtn" @click="fireBtn($event, toggleTopMost)">
            <svg class="ico" viewBox="0 0 24 24">
              <path d="M9 4h6M10 4v6l-3 3v2h10v-2l-3-3V4M12 15v5" />
            </svg>
          </button>

          <span class="tbsep" />

          <!--
            ⚠️ 最小化 / 最大化 / 退出<b>不给悬停提示</b>：右上角这三个图标是所有人都不用学的东西，
            弹一句「最小化」纯属打扰。旁边的齿轮 / 图钉 / 日志<b>保留 title</b> ——
            它们并不是一眼就懂的。
            ⚠️ 但不能直接把 title 删掉，要换成 aria-label：它们是纯图标按钮，
            title 原本是唯一的可访问名，删了读屏就只会念「按钮」。
          -->
          <button class="wb" :aria-label="t('win.min')"
                  @mousedown="armBtn" @click="fireBtn($event, () => api.minimizeWindow())">
            <svg class="ico" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>
          </button>

          <!-- 最大化 / 还原：两枚图标与 WPE 标题栏逐字相同 -->
          <button class="wb" :aria-label="maximized ? t('win.restore') : t('win.max')"
                  @mousedown="armBtn" @click="fireBtn($event, toggleMax)">
            <svg v-if="!maximized" class="ico" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1" /></svg>
            <svg v-else class="ico" viewBox="0 0 24 24"><rect x="4" y="7" width="13" height="13" rx="1" /><path d="M8 7V4h12v12h-3" /></svg>
          </button>

          <button class="wb close" :aria-label="t('win.close')"
                  @mousedown="armBtn" @click="fireBtn($event, () => api.closeWindow())">
            <svg class="ico" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </header>

      <div v-if="!inHost" class="nohost">{{ t('win.nohost') }}</div>

      <ControlCenter
        v-else-if="connected"
        :stats="stats"
        :server-name="selectedServerName"
        :notices="notices"
        @verify="verifyOpen = true"
        @disconnected="onDisconnected" />

      <MainView
        v-else
        :state="state"
        :servers="servers"
        :notices="notices"
        :net-text="t(net.k)"
        :net-tone="net.c"
        :sub-delay="subDelay"
        @subscribe="subscriberOpen = true" />

      <footer class="statusbar">
        <div class="sb-left">
          <a :title="t('foot.site')" @click="open('https://www.wpe64.com')">© 2026 Winsock Packet Editor</a>
          <a @click="openAgreement('UserAgreement')">{{ t('foot.agreement') }}</a>
          <a @click="openAgreement('PrivacyPolicy')">{{ t('foot.privacy') }}</a>
          <a @click="open(site('wpc.html'))">{{ t('foot.tutorial') }}</a>
        </div>

        <!--
          右侧放订阅服务器的连通状态 —— 那是这个程序唯一需要随时能看到、
          又不在控制中心指标板里的东西。
        -->
        <div class="sb-right">
          <span class="dot" :class="{ off: subDelay < 0 }" />
          {{ t('foot.server') }}
          <span class="addr">{{ state?.subscriberName || '—' }}</span>
          <span class="sep">//</span>
          <span :class="subDelay < 0 ? 'off-t' : 'on'">
            {{ subDelay < 0 ? t('foot.unreachable') : subDelay + ' ms' }}
          </span>
        </div>
      </footer>
    </div>

    <!-- 下面这些都在 .shell 之外：它们自己就是那个把外面置 inert 的弹窗 -->
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

    <!-- 放在 .shell 之外：弹窗把 .shell 整块置 inert 时，提示仍要看得见、点得掉 -->
    <ToastStack />

    <!-- 四角标记压在最上层（含弹窗之上，见 tokens.css 的 --z-ambience） -->
    <span class="cn tl" /><span class="cn tr" /><span class="cn bl" /><span class="cn br" />
  </div>
</template>

<style scoped>
.win {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--black);
  overflow: hidden;
}

/* 纵向布局从 .win 移到这里 —— 它要能被整体 inert，所以必须是一个能包住三段的容器 */
.shell {
  position: relative;
  z-index: 10;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ── 标题栏 ─────────────────────────────────────────────── */
.titlebar {
  position: relative;
  z-index: 20;
  height: 46px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 左 28px 给左上角标的横臂让位；右 8px 让右上角标不贴着关闭按钮 */
  padding: 0 8px 0 28px;
  background: rgb(var(--chrome-rgb) / 80%);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  user-select: none;
}

.brand { display: flex; align-items: center; gap: 10px; }

.bname {
  font-family: var(--orbit);
  font-weight: 800;
  font-size: 16px;
  /* 顶部补偿已去掉（2026-09-13）：原来的 1px 是给「WPE 大、后缀小」那种混排的，
     两截同为 16px 之后实测墨迹偏低 0.44px，去掉后回到中线。 */
  letter-spacing: -.02em;
  color: var(--green);
  white-space: nowrap;
}

/*
  型号那截与「WPE」<b>同样大</b>（2026-09-13 按要求改），只靠字重更细 + 灰色分层。
  ⚠️ font-size: inherit 必须写：<small> 的 UA 默认是 font-size: smaller（约 0.83×），
  不写就又变回小一号。
*/
.bname small { font-size: inherit; font-weight: 500; color: var(--muted); }

.bver {
  font-family: var(--share);
  font-size: var(--label-size);
  /* 行高收到 1 即可居中；原来的顶部 3px 实测让墨迹偏低 1.47px（2026-09-13 去掉） */
  line-height: 1;
  letter-spacing: .16em;
  color: var(--muted);
  border-left: 1px solid var(--border);
  padding-left: 10px;
  white-space: nowrap;
}

.tbright { display: flex; align-items: center; height: 46px; min-width: 0; }

.wb {
  width: 44px;
  height: 46px;
  flex: none;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: .15s;
}

.wb:hover { color: var(--green); background: rgb(var(--green-rgb) / 8%); }
.wb.close:hover { color: var(--danger); background: rgb(var(--danger-rgb) / 12%); }


.wb.pin .ico { transform: rotate(-35deg); transition: transform .15s; }
.wb.pin.on .ico { transform: none; }
.wb.pin.on { color: var(--amber); background: rgb(var(--amber-rgb) / 12%); }
.wb.pin.on:hover { color: var(--amber); background: rgb(var(--amber-rgb) / 20%); }
.wb.pin:focus-visible { outline-color: var(--amber); }

/* 齿轮：见模板里那段关于画布 32 与 stroke-width 2.667 的说明 */
.wb.gear .ico { stroke: var(--cyan); stroke-width: 2.667; }
.wb.gear:hover { color: var(--cyan); background: rgb(var(--cyan-rgb) / 8%); }
.wb.gear:focus-visible { outline-color: var(--cyan); }
/* 弹窗开着时按钮保持高亮，否则鼠标一移开就看不出是谁弹的 */
.wb.gear.on { color: var(--cyan); background: rgb(var(--cyan-rgb) / 8%); }

/*
  分隔线。左边几个（订阅 / 日志 / 设置 / 置顶）点了不会让窗口消失，
  右边几个（隐藏 / 最小化 / 退出）会 —— 别读成一组。
*/
.tbsep { width: 1px; height: 16px; margin: 0 6px; background: var(--border); }

/*
  焦点环改成<b>内侧</b>偏移：这排按钮和标题栏等高，上边就是窗口的上边；
  最右那个还贴着窗口右沿。正偏移那条上边线会跑到窗口外被 overflow:hidden 裁掉。
*/
.wb:focus-visible { outline-offset: -2px; }
.wb.close:focus-visible { outline-color: var(--danger); }

/* ── 状态栏 ─────────────────────────────────────────────── */
.statusbar {
  position: relative;
  z-index: 20;
  height: 30px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  /* 与标题栏同理，给左下/右下角标的横臂让位；顶部 1px 把整行字形压回中线 */
  padding: 1px 28px 0;
  background: rgb(var(--chrome-rgb) / 90%);
  border-top: 1px solid var(--border);
  font-family: var(--share);
  font-size: var(--label-size);
  /* 行高收到 1：状态栏只有 30px 高，继承 body 的 1.7 会让行盒撑到 17px */
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--muted);
}

.sb-left { display: flex; align-items: center; gap: 20px; min-width: 0; }
.sb-left a { color: var(--muted); text-decoration: none; cursor: pointer; white-space: nowrap; }
.sb-left a:hover { color: var(--green); }

.sb-right { display: flex; align-items: center; gap: 8px; min-width: 0; }
.sb-right .addr { color: var(--cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-right .sep { color: var(--border); }
.sb-right .on { color: var(--green); white-space: nowrap; }
.sb-right .off-t { color: var(--muted); white-space: nowrap; }

/* 状态栏顶部补了 1px 内边距，圆点不受字形偏移影响、要退回去 */
.sb-right .dot { width: 7px; height: 7px; flex: none; margin-top: -1px; background: var(--green); box-shadow: 0 0 6px var(--green); }
.sb-right .dot.off { background: var(--muted); box-shadow: none; }

.nohost {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--muted);
}
</style>
