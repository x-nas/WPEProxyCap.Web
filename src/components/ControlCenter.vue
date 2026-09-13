<script setup lang="ts">
/*
  控制中心（方案 A · REACTOR，2026-09-13 整屏重做）—— 与主页<b>同一副骨架</b>：
    左 TELEMETRY  上 / 下行速率 + 迷你曲线 + 内核内存
    中 CORE       连接铭牌（节点 + 延迟分档）+ 核心计时表（圆弧 = 今日进度）+ 暂停
    右 ACTIONS    安全验证 / 断开连接（带确认）
    底 INTEL      公告照样看得到

  暂停：2026-09-13 起<b>整个核心就是按钮</b>（方案 C），点六边形任意位置暂停 / 继续；
  悬停时六边形底色变亮、描边加粗，下方提示转成当前色；暂停后整环转琥珀、数字慢闪。
*/
import { computed, ref, watch } from 'vue'
import { api, type LiveStats, type NoticeInfo } from '../api'
import { t } from '../i18n'
import CyberConfirm from './CyberConfirm.vue'
import ReactorCore from './ReactorCore.vue'
import IntelBand from './IntelBand.vue'
import Sparkline from './Sparkline.vue'

const props = defineProps<{ stats: LiveStats | null; serverName: string; notices: NoticeInfo[] }>()

const emit = defineEmits<{ (e: 'verify'): void; (e: 'disconnected'): void }>()

const paused = ref(false)
const pauseBusy = ref(false)   // 桥调用在途时挡住连点，免得前端状态与 C# 那边对不上
const disconnectOpen = ref(false)
const busy = ref(false)

/* 曲线的点前端自己攒：每次 stats 推一个，封顶 60 —— 不需要新的桥方法 */
const HIST = 60
const upHist = ref<number[]>([])
const downHist = ref<number[]>([])

watch(() => props.stats, (s) => {
  if (!s) return
  upHist.value = [...upHist.value, s.upKBps].slice(-HIST)
  downHist.value = [...downHist.value, s.downKBps].slice(-HIST)
})

const delayText = computed(() => {
  const d = props.stats?.delayMs
  return d == null || d < 0 ? t('cc.offline') : `${d} ms`
})

/** 延迟分档：≤80 绿 · ≤160 琥珀 · 更高或不通红 */
const delayTone = computed(() => {
  const d = props.stats?.delayMs
  if (d == null || d < 0) return 'd'
  if (d <= 80) return 'g'
  return d <= 160 ? 'a' : 'd'
})

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const upText = computed(() => fmt(props.stats?.upKBps ?? 0))
const downText = computed(() => fmt(props.stats?.downKBps ?? 0))
const memText = computed(() => String(Math.round(props.stats?.memoryMB ?? 0)))

const todayText = computed(() => {
  const s = props.stats?.todayOnlineSeconds ?? 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h && m) return `${h} ${t('cc.hour')} ${m} ${t('cc.minute')}`
  if (h) return `${h} ${t('cc.hour')}`
  return `${m} ${t('cc.minute')}`
})

const health = computed(() => Math.max(0, Math.min(1, props.stats?.healthProgress ?? 0)))
const healthPct = computed(() => Math.round(health.value * 100))

async function togglePause(): Promise<void> {
  if (pauseBusy.value) return
  pauseBusy.value = true
  try {
    if (paused.value) { await api.resumeOnlineTime(); paused.value = false }
    else { await api.pauseOnlineTime(); paused.value = true }
  } finally { pauseBusy.value = false }
}

async function confirmDisconnect(): Promise<void> {
  busy.value = true
  try {
    await api.disconnect()
    /*
      ⚠️ 主动报一次「断开了」而不是只等 C# 推 `disconnected` 事件：
      事件万一没到（桥断了、窗口正在关），界面会一直卡在控制中心而后台其实已经停了。
      事件到了也无妨，App 那边幂等。
    */
    emit('disconnected')
  } finally { busy.value = false }
}
</script>

<template>
  <div class="reactor">
    <!-- ── 左舱：遥测 ─────────────────────────────── -->
    <section class="bay tele">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />TELEMETRY <em>// {{ t('cc.speed') }}</em></div>

      <div class="rd">
        <div class="rk">{{ t('cc.up') }} · KB/s</div>
        <div class="rv">{{ upText }}</div>
        <Sparkline :values="upHist" tone="green" />
      </div>

      <div class="rd">
        <div class="rk">{{ t('cc.down') }} · KB/s</div>
        <div class="rv c">{{ downText }}</div>
        <Sparkline :values="downHist" tone="cyan" />
      </div>

      <div class="grow" />

      <div class="kv last"><span class="k">{{ t('cc.memory') }}</span><span class="v num mem">{{ memText }} MB</span></div>
    </section>

    <!-- ── 中舱：铭牌 + 计时核心 ───────────────────── -->
    <section class="center">
      <div class="plate">
        <span class="led" />
        <span class="pst">{{ t('cc.connected') }}</span>
        <span class="pn" :title="serverName">{{ serverName || '—' }}</span>
        <span class="pk">{{ t('cc.delay') }}</span>
        <span class="pd" :class="delayTone">{{ delayText }}</span>
      </div>

      <div class="stage">
        <!--
          2026-09-13 方案 C：整个核心就是暂停 / 继续键，与主页的连接按钮（MainView 的 .engage）同一种交互。
          原来六边形里那颗 28px 的小方键去掉了。「今日累计在线」在环下面的 ARC 那行。
        -->
        <button class="core-btn" :class="{ paused }" :aria-pressed="paused"
                :aria-label="t(paused ? 'cc.resume' : 'cc.pause')" :disabled="pauseBusy" @click="togglePause">
          <ReactorCore :tone="paused ? 'paused' : 'on'" :progress="health">
            <span class="k">{{ t('cc.session') }}</span>
            <span class="clock" :class="{ paused }">{{ stats?.onlineTime ?? '00:00:00' }}</span>
            <span class="tap">
              <svg v-if="!paused" viewBox="0 0 10 10" aria-hidden="true"><rect x="2.4" y="1" width="1.8" height="8" /><rect x="5.8" y="1" width="1.8" height="8" /></svg>
              <svg v-else viewBox="0 0 10 10" aria-hidden="true"><path d="M2.6 1.2l5.6 3.8-5.6 3.8z" /></svg>
              {{ t(paused ? 'cc.tapResume' : 'cc.tapPause') }}
            </span>
          </ReactorCore>
        </button>
      </div>

      <div class="hint">
        <template v-if="paused"><b class="pz">{{ t('cc.paused') }}</b><span class="sep">//</span></template>
        ARC = {{ t('cc.today') }} <b class="td">{{ todayText }} · {{ healthPct }}%</b>
      </div>
    </section>

    <!-- ── 右舱：动作 ─────────────────────────────── -->
    <section class="bay acts">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />SECURITY <em>// {{ t('cc.secCenter') }}</em></div>
      <p class="ds">{{ t('cc.vfDesc') }}</p>
      <button class="ab" @click="emit('verify')">
        <svg class="ico" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.4-3.3 8.2-8 9-4.7-.8-8-4.6-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
        {{ t('cc.vf') }}
      </button>

      <div class="grow" />

      <div class="bh cut"><i />LINK <em>// {{ t('cc.netOps') }}</em></div>
      <p class="ds">{{ t('cc.cutDesc') }}</p>
      <button class="ab danger" :disabled="busy" @click="disconnectOpen = true">
        <svg class="ico" viewBox="0 0 24 24"><path d="M12 3v9" /><path d="M7.3 6.3a8 8 0 1 0 9.4 0" /></svg>
        {{ t('cc.cut') }}
      </button>
    </section>

    <IntelBand class="band" :notices="notices" />

    <CyberConfirm
      v-model:open="disconnectOpen"
      level="danger"
      :title="t('cc.cutAsk')"
      :message="t('cc.cutDesc')"
      :ok-text="t('cc.cutOk')"
      @confirm="confirmDisconnect" />
  </div>
</template>

<style scoped src="./reactor.css"></style>

<style scoped>

/* ── 遥测 ─────────────────────────────── */
.rd { display: flex; flex-direction: column; gap: 2px; }
.rk { font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.rv { font-family: var(--orbit); font-size: var(--fs-num-lg); line-height: 1.25; font-variant-numeric: tabular-nums; color: var(--gray); }
.rv.c { color: var(--cyan); }
.kv.last { border-bottom: 0; }
.mem { color: var(--amber) !important; }

/* ── 铭牌 ─────────────────────────────── */
.plate {
  flex: none;
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border: 1px solid rgb(var(--green-rgb) / 45%);
  background: linear-gradient(90deg, rgb(var(--green-rgb) / 8%), transparent 60%), var(--card);
  font-size: var(--fs-body);
}

.led { flex: none; width: 8px; height: 8px; background: var(--green); box-shadow: 0 0 8px var(--green); }
/* 2026-09-13 按要求：四段一律同一个字号（--fs-body），不再靠 top 逐段补 —— 字号不一样时各段的墨迹高度不同，怎么补看着都不齐 */
.pst { flex: none; font-family: var(--share); font-size: var(--fs-body); letter-spacing: .12em; text-transform: uppercase; color: var(--green); }
.pn { flex: 1; min-width: 0; font-size: var(--fs-body); color: var(--gray); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pk { flex: none; font-family: var(--share); font-size: var(--fs-body); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.pd { flex: none; font-family: var(--orbit); font-size: var(--fs-body); font-variant-numeric: tabular-nums; }
.pd.g { color: var(--green); }
.pd.a { color: var(--amber); }
.pd.d { color: var(--danger); }

/* ── 核心计时 ─────────────────────────── */
.stage .k { font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }

/*
  ⚠️ 字号规范里<b>唯一的例外</b>（与 WPE 启动页的 62px 机位号丝印同一类：整屏的主视觉，不是正文）。
  九级里最大的 --fs-num-lg 只有 22px，放进 300px 的圆环里撑不起「核心计时表」。
  写定值不写 clamp(…vw)：圆环跟窗口<b>高度</b>缩放，按宽度算的字号会与环对不上。
  白名单在 tools/check-font-sizes.mjs。
*/
.clock {
  font-family: var(--orbit);
  font-weight: 900;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
  color: var(--green);
  text-shadow: 0 0 22px rgb(var(--green-rgb) / 40%);
}

.clock.paused { color: var(--amber); text-shadow: 0 0 22px rgb(var(--amber-rgb) / 35%); }

/*
  整个核心就是暂停键（方案 C）—— 写法照主页的 .engage：透明圆形按钮包住 ReactorCore。
  ⚠️ 焦点环画在内侧（outline-offset 负值）：圆环外面就是舱位边界，正偏移会被裁掉一截。
*/
.core-btn {
  height: 100%;
  max-width: 100%;
  aspect-ratio: 1;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 50%;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
}

.core-btn:disabled { cursor: progress; }
.core-btn:focus-visible { outline: 2px solid var(--green); outline-offset: -8px; }
.core-btn.paused:focus-visible { outline-color: var(--amber); }
.core-btn :deep(.hex) { transition: fill .2s, stroke-width .2s; }
.core-btn:hover :deep(.hex) { fill: rgb(var(--rc-rgb) / 14%); stroke-width: 2.2; }

/* 核心里的提示：平时是暗的说明，悬停转成当前色（绿 / 琥珀），暂停时常亮琥珀 */
.tap {
  margin-top: 8px;
  max-width: 100%;   /* 六边形内宽只有 ~197px：长语言兜底截断，文案已尽量收短 */
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--share);
  font-size: var(--fs-caption);
  line-height: 1;
  letter-spacing: .14em;
  color: var(--muted);
  white-space: nowrap;
  transition: color .2s;
}

.tap svg { width: 9px; height: 9px; fill: currentColor; }
.core-btn:hover .tap { color: var(--green); }
.core-btn.paused .tap { color: var(--amber); }

/* 暂停后数字慢闪，一眼看出「这个数现在不动」 */
.clock.paused { animation: cc-blink 1.4s steps(2, start) infinite; }
@keyframes cc-blink { 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .clock.paused { animation: none; } }

.hint .pz { font-weight: 400; color: var(--amber); }
.hint .sep { margin: 0 8px; color: var(--border2); }
/* 今日累计的数值：比说明亮一档，读起来是「ARC 的读数」而不是说明的一部分 */
.hint .td { margin-left: 6px; font-weight: 400; letter-spacing: .06em; color: var(--soft); }

/* ── 动作 ─────────────────────────────── */
.bh.cut { --bk: var(--danger); --bk-rgb: var(--danger-rgb); }
.ds { margin: 0; font-size: var(--fs-small); line-height: 1.65; color: var(--dim2); }

.ab {
  flex: none;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: transparent;
  border: 1px solid rgb(var(--cyan-rgb) / 45%);
  color: var(--cyan);
  font-family: var(--share);
  font-size: var(--btn-size);
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: .15s;
}

.ab:hover:not(:disabled) { background: rgb(var(--cyan-rgb) / 10%); border-color: var(--cyan); }
.ab:disabled { opacity: .4; cursor: default; }
.ab .ico { width: 14px; height: 14px; }

.ab.danger { height: 44px; border-color: rgb(var(--danger-rgb) / 45%); color: var(--danger); background: rgb(var(--danger-rgb) / 6%); }
.ab.danger:hover:not(:disabled) { background: rgb(var(--danger-rgb) / 12%); border-color: var(--danger); }
.ab.danger:focus-visible { outline-color: var(--danger); }
</style>
