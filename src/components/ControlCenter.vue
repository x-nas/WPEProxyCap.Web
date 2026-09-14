<script setup lang="ts">
/*
  控制中心（方案 A · REACTOR，2026-09-13 整屏重做）—— 与主页<b>同一副骨架</b>：
    左 TELEMETRY  上 / 下行速率 + 迷你曲线 + 内核内存
    中 CORE       连接铭牌（节点 + 延迟分档）+ 核心计时表（圆弧 = 今日进度）+ 暂停
    右 ACTIONS    安全验证 / 断开连接（带确认）
    底 INTEL      公告照样看得到

  暂停：2026-09-13 起<b>整个核心就是按钮</b>（方案 C），点六边形任意位置暂停 / 继续；
  悬停时六边形底色变亮、描边加粗，下方提示转成当前色；暂停后整环转琥珀、数字慢闪。

  【与手机版共用】逻辑在 useControlPanel.ts、零件样式在 control.css（2026-09-14 拆出来），
  手机版的 mobile/MobileControl.vue 用的是同一份，这里只剩三舱骨架。
*/
import type { LiveStats, NoticeInfo } from '../api'
import { t } from '../i18n'
import CyberConfirm from './CyberConfirm.vue'
import ReactorCore from './ReactorCore.vue'
import IntelBand from './IntelBand.vue'
import Sparkline from './Sparkline.vue'
import { useControlPanel } from './useControlPanel'

const props = defineProps<{ stats: LiveStats | null; serverName: string; notices: NoticeInfo[] }>()

const emit = defineEmits<{ (e: 'verify'): void; (e: 'disconnected'): void }>()

const {
  paused, pauseBusy, disconnectOpen, busy, upHist, downHist,
  delayText, delayTone, upText, downText, memText, todayText, health, healthPct,
  togglePause, confirmDisconnect,
} = useControlPanel(() => props.stats, () => emit('disconnected'))
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
      :title="t('cc.cutAsk')"
      :message="t('cc.cutDesc')"
      :ok-text="t('cc.cutOk')"
      @confirm="confirmDisconnect" />
  </div>
</template>

<style scoped src="./reactor.css"></style>
<style scoped src="./control.css"></style>
