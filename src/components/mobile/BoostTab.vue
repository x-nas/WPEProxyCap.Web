<script setup lang="ts">
/*
  「加速」页（手机版 2.0，方案 A）。

  未连接：反应堆核心（它就是连接按钮，未连接时缩小一档）→ 节点卡（点开节点弹层）→ 账号卡（账号 / 密码 / 记住我 /
  找回密码 · 立即注册，2026-09-15 起从引导第二步挪到这里 —— 还没有账号的用户要能直接在主界面上注册；
  没有节点时不显示，只留「设置订阅」空卡片）→ 分应用代理。
  已连接：计时 + 核心（点按暂停计时）→ 四格读数（上行 / 下行带曲线、延迟、内存）→ 安全验证 / 断开。
  两种状态下核心的位置不变。平板宽屏（≥ 840px）左边核心、右边卡片。

  顶部两条提示：后台运行受系统限制（一点直达系统设置）；选中的节点在手机上没有走代理的规则
  （phoneRules.proxy === 0，常见于只按进程名写规则的节点 —— 连上也没有流量经过 WPE）。
*/
import { computed, inject, ref } from 'vue'
import type { AppProxy, AppState, LiveStats, PlatformInfo, ServerInfo } from '../../api'
import { t, tf } from '../../i18n'
import { pushToast } from '../../stores/toast'
import ReactorCore from '../ReactorCore.vue'
import Sparkline from '../Sparkline.vue'
import { useControlPanel } from '../useControlPanel'
import BottomSheet from './BottomSheet.vue'
import LatencyBars from './LatencyBars.vue'
import PullHint from './PullHint.vue'
import { LOGIN } from './inject'
import { latencyTone } from './latency'
import { usePullRefresh } from './usePullRefresh'

const props = defineProps<{
  state: AppState | null
  servers: ServerInfo[]
  delays: Record<string, number>
  stats: LiveStats | null
  connected: boolean
  platform: PlatformInfo | null
  appProxy: AppProxy | null
  refresh: () => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'nodes'): void
  (e: 'apps'): void
  (e: 'subscribe'): void
  (e: 'verify'): void
  (e: 'battery'): void
  (e: 'rulesHelp'): void
  (e: 'disconnected'): void
}>()

const {
  username, password, remember, selectedServer, coreTone, busy,
  login, persistAccount, toggleRemember, openServerUrl,
} = inject(LOGIN)!

const showPwd = ref(false)
const accErr = ref(false)
const userInput = ref<HTMLInputElement | null>(null)
const accMissing = computed(() => accErr.value && (!username.value.trim() || !password.value))

/* 点核心连接：账号密码没填齐就提示并把焦点放进账号框，填齐了先落盘再连 */
async function engage(): Promise<void> {
  if (!username.value.trim() || !password.value) {
    accErr.value = true
    pushToast('warning', t('mob.accRequired'))
    userInput.value?.focus()
    return
  }
  accErr.value = false
  persistAccount()
  await login()
}

const {
  paused, pauseBusy, disconnectOpen, busy: cutBusy, upHist, downHist,
  delayText, delayTone, upText, downText, memText, todayText, health, healthPct,
  togglePause, confirmDisconnect,
} = useControlPanel(() => props.stats, () => emit('disconnected'))

const page = ref<HTMLElement | null>(null)
const { pull, refreshing } = usePullRefresh(page, () => props.refresh())

const rulesOpen = ref(false)

const selDelay = computed(() => (selectedServer.value ? props.delays[selectedServer.value.serverId] : undefined))
const noProxy = computed(() => selectedServer.value?.phoneRules?.proxy === 0)

const appsText = computed(() => {
  const p = props.appProxy
  if (!p || p.mode === 'all') return t('mob.appsAll')
  return tf('mob.appsSel', p.packages.length)
})

function latText(d: number | undefined): string {
  if (d === undefined) return '—'
  return d < 0 ? t('mob.timeout') : `${d} ms`
}

async function cut(): Promise<void> {
  await confirmDisconnect()
  disconnectOpen.value = false
}
</script>

<template>
  <div ref="page" class="m-page boost">
    <PullHint :pull="pull" :refreshing="refreshing" />

    <div class="m-wrap wide">
      <header class="m-hd">
        <span class="m-wm">WPE <small>PROXY CAP</small></span>
        <span v-if="!connected" class="m-pill">{{ busy ? t('home.connecting') : t('mob.idle') }}</span>
        <span v-else class="m-pill" :class="paused ? 'amber' : 'on'">{{ paused ? t('cc.paused') : t('mob.boosting') }}</span>
      </header>

      <!-- 两条提示放在最上面（平板上横跨两栏）：放在核心下面时第一屏只露出半截，容易被忽略 -->
      <div v-if="platform?.batteryOptimized || noProxy" class="notes">
        <button v-if="platform?.batteryOptimized" class="m-strip warn" type="button" @click="emit('battery')">
          <svg class="ico" viewBox="0 0 24 24"><rect x="3" y="7" width="16" height="10" rx="2" /><path d="M21 10v4" /></svg>
          <span class="tx">{{ t('mob.batteryWarn') }}</span>
          <span class="go">{{ t('mob.allow') }}</span>
        </button>

        <button v-if="noProxy" class="m-strip warn" type="button" data-probe="rules" @click="rulesOpen = true">
          <svg class="ico" viewBox="0 0 24 24"><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
          <span class="tx">{{ t('mob.noProxyTitle') }}</span>
          <span class="go">{{ t('mob.details') }}</span>
        </button>
      </div>

      <div class="cols">
        <!-- ── 左栏：核心 ─────────────────────────── -->
        <section class="col core-col">
          <div v-if="connected" class="timer-blk">
            <span class="timer">{{ stats?.onlineTime ?? '00:00:00' }}</span>
            <span class="where">{{ selectedServer?.serverName || '—' }} · <b :class="'m-' + delayTone">{{ delayText }}</b></span>
          </div>

          <div class="stage" :class="{ idle: !connected }">
            <button v-if="!connected" class="engage" type="button" data-probe="connect" :disabled="busy || !servers.length"
                    :aria-label="t('home.login')" @click="engage">
              <ReactorCore :tone="coreTone">
                <template v-if="busy">
                  <span class="loader"><i /><i /><i /></span>
                  <span class="cap">{{ t('home.connecting') }}</span>
                </template>
                <template v-else>
                  <svg class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
                  <span class="cta">{{ servers.length ? 'START' : 'OFFLINE' }}</span>
                  <span class="cap">{{ servers.length ? t('mob.start') : t('home.noServer') }}</span>
                </template>
              </ReactorCore>
            </button>

            <button v-else class="engage" type="button" :class="{ paused }" :aria-pressed="paused" :disabled="pauseBusy"
                    :aria-label="t(paused ? 'cc.resume' : 'cc.pause')" @click="togglePause">
              <ReactorCore :tone="paused ? 'paused' : 'on'" :progress="health">
                <svg v-if="!paused" class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
                <svg v-else class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
                <span class="cap">{{ t(paused ? 'cc.tapResume' : 'cc.tapPause') }}</span>
              </ReactorCore>
            </button>
          </div>

          <!-- 标签 / 时长 / 分隔点 / 百分比四段用 flex gap 等距排，不靠文字里的空格（等宽字体的空格与中文字距不一样宽） -->
          <p v-if="connected" class="today">
            <span>{{ t('cc.today') }}</span>
            <b>{{ todayText }}</b>
            <i aria-hidden="true">·</i>
            <b>{{ healthPct }}%</b>
          </p>
        </section>

        <!-- ── 右栏：节点、读数、操作 ─────────── -->
        <section class="col">
          <template v-if="!connected">
            <!-- 延迟挪到右侧与箭头同一行：原来独占一行，一屏放不下时这一行最不值 -->
            <button v-if="servers.length" class="m-card node" type="button" data-probe="nodes" @click="emit('nodes')">
              <span class="nm">
                <span class="m-eb">{{ t('mob.curNode') }}</span>
                <b>{{ selectedServer?.serverName || '—' }}</b>
              </span>
              <span class="lat">
                <LatencyBars :ms="selDelay" />
                <span :class="'m-' + latencyTone(selDelay)">{{ latText(selDelay) }}</span>
              </span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>

            <!-- 没有节点：图标 + 说明 + 一颗整宽的大按钮（原来是一条细边框的扁按钮，2026-09-15 用户要求重做） -->
            <div v-else class="m-card empty">
              <span class="em-ic" aria-hidden="true">
                <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18" /></svg>
              </span>
              <p>{{ t('mob.noNode') }}</p>
              <button class="m-btn sub-go" type="button" data-probe="gosub" @click="emit('subscribe')">
                <svg class="ico" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
                {{ t('mob.goSub') }}
              </button>
            </div>

            <!--
              账号卡：改动在失焦 / 切换开关时就落盘（与 Windows 主页同一种手感），连接前再确认一次。
              ⚠️ 没有节点就不显示（2026-09-15 用户要求）：先有节点才谈得上登录，找回密码 / 注册的地址也取自选中的节点。
            -->
            <div v-if="servers.length" class="m-card acc" data-probe="acc">
              <!-- 不再单列标签（一屏放不下）：占位文字已经说明是账号 / 密码，读屏走 aria-label -->
              <div class="m-inp">
                <input id="bt-user" ref="userInput" v-model="username" autocomplete="username" autocapitalize="off" spellcheck="false"
                       enterkeyhint="next" :aria-label="t('home.account')" :placeholder="t('home.accountPh')" :disabled="busy" @change="persistAccount" />
              </div>

              <div class="m-inp">
                <input id="bt-pass" v-model="password" :type="showPwd ? 'text' : 'password'" autocomplete="current-password" :aria-label="t('home.password')"
                       enterkeyhint="go" :placeholder="t('home.passwordPh')" :disabled="busy" @change="persistAccount" @keyup.enter="engage" />
                <button class="eye" type="button" :aria-label="t(showPwd ? 'mob.hidePwd' : 'mob.showPwd')" :aria-pressed="showPwd" @click="showPwd = !showPwd">
                  <!-- 密码藏着时画睁眼（点了显示），显示着时画划掉的眼（点了隐藏） -->
                  <svg v-if="!showPwd" class="ico" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                  <svg v-else class="ico" viewBox="0 0 24 24"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                </button>
              </div>

              <p v-if="accMissing" class="m-err" role="alert">{{ t('mob.accRequired') }}</p>

              <div class="rem">
                <span id="bt-rem">{{ t('home.remember') }}</span>
                <button class="m-switch" :class="{ on: remember }" type="button" role="switch" :aria-checked="remember" aria-labelledby="bt-rem"
                        :disabled="busy" @click="toggleRemember" />
              </div>

              <div class="links">
                <button class="m-link" type="button" data-probe="forgot" @click="openServerUrl(selectedServer?.forgotURL)">{{ t('home.forgot') }}</button>
                <button class="m-link" type="button" data-probe="register" @click="openServerUrl(selectedServer?.registerURL)">{{ t('home.register') }}</button>
              </div>
            </div>

            <div class="m-card">
              <button class="m-row" type="button" data-probe="apps" @click="emit('apps')">
                <svg class="ico" viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></svg>
                <span class="k">{{ t('mob.apps') }}</span>
                <span class="v">{{ appsText }}</span>
                <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </template>

          <template v-else>
            <div class="stats">
              <div class="st">
                <span class="sk">{{ t('cc.up') }}</span>
                <span class="sv">{{ upText }}<small>KB/s</small></span>
                <Sparkline :values="upHist" tone="green" />
              </div>
              <div class="st">
                <span class="sk">{{ t('cc.down') }}</span>
                <span class="sv">{{ downText }}<small>KB/s</small></span>
                <Sparkline :values="downHist" tone="cyan" />
              </div>
              <div class="st">
                <span class="sk">{{ t('cc.delay') }}</span>
                <span class="sv" :class="'m-' + delayTone">{{ delayText }}</span>
              </div>
              <div class="st">
                <span class="sk">{{ t('cc.memory') }}</span>
                <span class="sv">{{ memText }}<small>MB</small></span>
              </div>
            </div>

            <!-- 已连接时不再放「分应用代理」一行（一屏放不下）：改了要重连才生效，入口在「我的」页 -->
            <div class="acts">
              <button class="m-btn cy" type="button" data-probe="verify" @click="emit('verify')">
                <svg class="ico" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.4-3.3 8.2-8 9-4.7-.8-8-4.6-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
                {{ t('mob.verify') }}
              </button>
              <button class="m-btn dg" type="button" data-probe="cut" :disabled="cutBusy" @click="disconnectOpen = true">
                <svg class="ico" viewBox="0 0 24 24"><path d="M12 3v9" /><path d="M7.3 6.3a8 8 0 1 0 9.4 0" /></svg>
                {{ t('mob.disconnect') }}
              </button>
            </div>
          </template>
        </section>
      </div>
    </div>

    <BottomSheet v-model:open="disconnectOpen" :title="t('cc.cutAsk')" :busy="cutBusy">
      <p class="sheet-tx">{{ t('cc.cutDesc') }}</p>
      <template #footer>
        <button class="m-btn" type="button" :disabled="cutBusy" @click="disconnectOpen = false">{{ t('dlg.cancel') }}</button>
        <button class="m-btn dg fill" type="button" :disabled="cutBusy" @click="cut">{{ t('cc.cutOk') }}</button>
      </template>
    </BottomSheet>

    <BottomSheet v-model:open="rulesOpen" :title="t('mob.noProxyTitle')">
      <p class="sheet-tx">{{ t('mob.noProxyDesc') }}</p>
      <template #footer>
        <button class="m-btn" type="button" @click="rulesOpen = false">{{ t('dlg.ok') }}</button>
        <button class="m-btn cy" type="button" @click="rulesOpen = false; emit('rulesHelp')">{{ t('foot.tutorial') }}</button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
/*
  一屏放下（2026-09-15 用户要求：加速页尽量不要下拉滚动）。
  外层定高 = 页面高度；核心那一栏吃掉剩下的高度、核心按它缩放，其余卡片按内容高 ——
  屏幕矮时是核心变小，而不是整页出滚动条。核心最小 110px，再矮（横屏手机）才让外层撑出去整页滚动。
  ⚠️ 核心栏不能写 min-height: 0：它的最小高度要由核心的 110px 撑住，否则会被压到卡片底下。
*/
.boost .m-wrap { height: 100%; gap: 8px; padding-bottom: 10px; }
.notes { flex: none; display: flex; flex-direction: column; gap: 6px; margin-top: -4px; }
.notes .m-strip { padding: 7px 12px; }
.cols { flex: 1 1 auto; display: flex; flex-direction: column; gap: 8px; }
.col { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
/* 分应用代理那一行 52 → 44：矮屏上这 8px 换给核心 */
.col .m-row { min-height: 44px; padding-top: 6px; padding-bottom: 6px; }

.core-col { flex: 1 1 auto; align-items: center; gap: 4px; }

.stage { flex: 1 1 auto; width: 100%; min-height: 110px; max-height: 300px; display: grid; place-items: center; }
/* 未连接时核心上限小一档：下面还有节点卡和账号卡 */
.stage.idle { max-height: 236px; }

.engage { height: 100%; aspect-ratio: 1; max-width: 100%; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
.engage:disabled { cursor: default; }
.engage:focus-visible { outline: 2px solid var(--cyan); outline-offset: 6px; }

.play { width: 28px; height: 28px; fill: var(--green); stroke: none; }
.engage.paused .play { fill: var(--amber); }
.engage:disabled .play { fill: var(--muted); }

.cta { font-family: var(--orbit); font-weight: 700; font-size: var(--fs-lead); letter-spacing: .16em; color: var(--gray); }
.cap { font-size: var(--fs-small); color: var(--dim2); }

.timer-blk { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.timer { font-family: var(--orbit); font-weight: 700; font-size: var(--fs-num-lg); line-height: 1.15; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.where { font-size: var(--fs-small); color: var(--soft); }
.where b { font-family: var(--mono); font-weight: 400; }

.today { margin: -4px 0 0; display: flex; flex-wrap: wrap; justify-content: center; align-items: baseline; gap: 4px 8px; font-size: var(--fs-small); color: var(--dim2); }
.today b { font-weight: 500; color: var(--soft); font-variant-numeric: tabular-nums; }
.today i { font-style: normal; color: var(--dim); }

.node { width: 100%; display: flex; align-items: center; gap: 10px; padding: 7px 14px; color: var(--gray); font: inherit; text-align: left; cursor: pointer; }
.node .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.node b { font-weight: 500; font-size: var(--fs-lead); line-height: 1.35; overflow-wrap: anywhere; }
.node .lat { flex: none; display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: var(--fs-small); color: var(--dim2); }
.node .chev { width: 18px; height: 18px; flex: none; color: var(--dim); }

.empty { padding: 14px 14px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.empty p { margin: 0 0 2px; line-height: 1.5; color: var(--soft); }
.em-ic { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: rgb(var(--cyan-rgb) / 10%); color: var(--cyan); }
.em-ic .ico { width: 22px; height: 22px; }
.acc { padding: 8px 14px 0; display: flex; flex-direction: column; gap: 6px; }
.acc .m-inp { height: 42px; }
.acc .rem { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 32px; }
.acc .links { display: flex; justify-content: space-between; margin-top: -2px; border-top: 1px solid var(--border); }
.acc .links .m-link { padding: 6px 2px; }

.sub-go { flex: none; align-self: stretch; height: 48px; min-height: 48px; background: rgb(var(--cyan-rgb) / 12%); border-color: rgb(var(--cyan-rgb) / 55%); color: var(--cyan); font-size: var(--fs-lead); }

.stats { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--m-radius); overflow: hidden; }
.st { min-width: 0; display: flex; flex-direction: column; gap: 0; padding: 6px 12px; background: var(--card); }
.sk { font-size: var(--fs-small); color: var(--muted); }
.sv { font-family: var(--orbit); font-weight: 700; font-size: var(--fs-num); font-variant-numeric: tabular-nums; }
.sv small { margin-left: 4px; font-family: var(--share); font-weight: 400; font-size: var(--fs-caption); letter-spacing: .08em; color: var(--muted); }
.st :deep(.spark) { height: 18px; margin-top: 2px; }

.acts { display: flex; gap: 10px; }

.sheet-tx { margin: 0; line-height: 1.7; color: var(--soft); }

@media (min-width: 840px) {
  /* 平板两栏：高度够，回到按内容排、整页可滚的老样子 */
  .boost .m-wrap { height: auto; }
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 28px; }
  .stage, .stage.idle { flex: none; height: min(380px, 52vh); max-height: none; }
  .core-col { position: sticky; top: 0; }
}

/* 横屏手机：高度很矮，一屏放不下，回到整页滚动，核心按高度收 */
@media (max-height: 480px) {
  .boost .m-wrap { height: auto; }
  .stage, .stage.idle { flex: none; height: 62vh; min-height: 160px; max-height: none; }
}
</style>
