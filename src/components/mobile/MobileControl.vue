<script setup lang="ts">
/*
  手机版控制中心（已连接）—— 与 Windows 版 ControlCenter <b>同一套零件，竖着排</b>：

    连接铭牌 → 核心计时表（整个核心就是暂停键，圆弧 = 今日进度）→ TELEMETRY 上下行 + 内存
    → SECURITY 安全验证 / LINK 断开 → INTEL 公告

  逻辑与 ControlCenter 共用 useControlPanel，零件样式共用 control.css / reactor.css。
*/
import type { LiveStats, NoticeInfo } from '../../api'
import { t } from '../../i18n'
import CyberConfirm from '../CyberConfirm.vue'
import ReactorCore from '../ReactorCore.vue'
import IntelBand from '../IntelBand.vue'
import Sparkline from '../Sparkline.vue'
import { useControlPanel } from '../useControlPanel'

const props = defineProps<{ stats: LiveStats | null; serverName: string; notices: NoticeInfo[] }>()

const emit = defineEmits<{ (e: 'verify'): void; (e: 'disconnected'): void }>()

const {
  paused, pauseBusy, disconnectOpen, busy, upHist, downHist,
  delayText, delayTone, upText, downText, memText, todayText, health, healthPct,
  togglePause, confirmDisconnect,
} = useControlPanel(() => props.stats, () => emit('disconnected'))
</script>

<template>
  <div class="mcc">
    <!-- ── 铭牌 + 计时核心 ───────────────────── -->
    <section class="center hero">
      <div class="plate">
        <span class="led" />
        <span class="pst">{{ t('cc.connected') }}</span>
        <span class="pn">{{ serverName || '—' }}</span>
        <span class="pd" :class="delayTone">{{ delayText }}</span>
      </div>

      <div class="stage">
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

    <!-- ── 遥测 ─────────────────────────────── -->
    <section class="bay tele">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />TELEMETRY <em>// {{ t('cc.speed') }}</em></div>

      <div class="rds">
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
      </div>

      <div class="kvs">
        <div class="kv"><span class="k">{{ t('cc.delay') }}</span><span class="v num" :class="delayTone">{{ delayText }}</span></div>
        <div class="kv last"><span class="k">{{ t('cc.memory') }}</span><span class="v num mem">{{ memText }} MB</span></div>
      </div>
    </section>

    <!-- ── 动作 ─────────────────────────────── -->
    <section class="bay acts">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />SECURITY <em>// {{ t('cc.secCenter') }}</em></div>
      <p class="ds">{{ t('cc.vfDesc') }}</p>
      <button class="ab" @click="emit('verify')">
        <svg class="ico" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.4-3.3 8.2-8 9-4.7-.8-8-4.6-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
        {{ t('cc.vf') }}
      </button>

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
      :title="t('cc.cutAsk')"
      :message="t('cc.cutDesc')"
      :ok-text="t('cc.cutOk')"
      @confirm="confirmDisconnect" />
  </div>
</template>

<style scoped src="../reactor.css"></style>
<style scoped src="../control.css"></style>

<style scoped>
.mcc { display: flex; flex-direction: column; gap: 12px; padding: 12px 12px 4px; }

.hero { padding: 0; }
.hero .stage { flex: none; height: 76vw; max-height: 300px; min-height: 220px; padding: 4px 0; }
.hero .hint { padding-bottom: 2px; white-space: normal; text-align: center; line-height: 1.6; }

.bay { overflow: visible; gap: 9px; padding: 14px 14px 16px; }
.bay.tele { --bk: var(--green); --bk-rgb: var(--green-rgb); }

/* 上下行两格并排：各自一条曲线 */
.rds { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
.rds .rv { font-size: var(--fs-num); }

.kv .v.g { color: var(--green); }
.kv .v.a { color: var(--amber); }
.kv .v.d { color: var(--danger); }

/* 验证与断开之间留出一段，读起来是两件事 */
.acts .bh.cut { margin-top: 10px; }
.ab { height: 44px; }
.ab.danger { height: 46px; }

.band { grid-template-columns: minmax(0, 1fr); }
.band :deep(.list) { max-height: 176px; border-right: 0; border-bottom: 1px solid var(--border); }
.band :deep(.det) { padding: 10px 14px 14px; }
.band :deep(.tx) { flex: none; max-height: 200px; }
</style>
