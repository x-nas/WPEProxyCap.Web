/*
  控制中心的逻辑 —— Windows 的 ControlCenter 与手机版的 MobileControl <b>共用这一份</b>：
  网速曲线的历史点、延迟分档、今日累计、暂停 / 继续计时、断开连接。
*/
import { computed, ref, watch } from 'vue'
import { api, type LiveStats } from '../api'
import { t } from '../i18n'

export function useControlPanel(stats: () => LiveStats | null, onDisconnected: () => void) {
  const paused = ref(false)
  const pauseBusy = ref(false)   // 桥调用在途时挡住连点，免得前端状态与宿主那边对不上
  const disconnectOpen = ref(false)
  const busy = ref(false)

  /* 曲线的点前端自己攒：每次 stats 推一个，封顶 60 —— 不需要新的桥方法 */
  const HIST = 60
  const upHist = ref<number[]>([])
  const downHist = ref<number[]>([])

  watch(stats, (s) => {
    if (!s) return
    upHist.value = [...upHist.value, s.upKBps].slice(-HIST)
    downHist.value = [...downHist.value, s.downKBps].slice(-HIST)
  })

  const delayText = computed(() => {
    const d = stats()?.delayMs
    return d == null || d < 0 ? t('cc.offline') : `${d} ms`
  })

  /** 延迟分档：≤80 绿 · ≤160 琥珀 · 更高或不通红 */
  const delayTone = computed(() => {
    const d = stats()?.delayMs
    if (d == null || d < 0) return 'd'
    if (d <= 80) return 'g'
    return d <= 160 ? 'a' : 'd'
  })

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const upText = computed(() => fmt(stats()?.upKBps ?? 0))
  const downText = computed(() => fmt(stats()?.downKBps ?? 0))
  const memText = computed(() => String(Math.round(stats()?.memoryMB ?? 0)))

  const todayText = computed(() => {
    const s = stats()?.todayOnlineSeconds ?? 0
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h && m) return `${h} ${t('cc.hour')} ${m} ${t('cc.minute')}`
    if (h) return `${h} ${t('cc.hour')}`
    return `${m} ${t('cc.minute')}`
  })

  const health = computed(() => Math.max(0, Math.min(1, stats()?.healthProgress ?? 0)))
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
        ⚠️ 主动报一次「断开了」而不是只等宿主推 `disconnected` 事件：
        事件万一没到（桥断了、窗口正在关），界面会一直卡在控制中心而后台其实已经停了。
        事件到了也无妨，外壳那边幂等。
      */
      onDisconnected()
    } finally { busy.value = false }
  }

  return {
    paused, pauseBusy, disconnectOpen, busy, upHist, downHist,
    delayText, delayTone, upText, downText, memText, todayText, health, healthPct,
    togglePause, confirmDisconnect,
  }
}
