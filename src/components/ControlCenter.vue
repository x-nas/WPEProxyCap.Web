<script setup lang="ts">
import { ref, computed } from 'vue'
import { api, type LiveStats } from '../api'

const props = defineProps<{ stats: LiveStats | null; serverName: string }>()
const emit = defineEmits<{ (e: 'verify'): void }>()

const paused = ref(false)
const disconnectOpen = ref(false)

const delayText = computed(() => {
  const d = props.stats?.delayMs
  return d == null || d < 0 ? '不在线' : `${d} ms`
})
const upText = computed(() => (props.stats?.upKBps ?? 0).toFixed(1))
const downText = computed(() => (props.stats?.downKBps ?? 0).toFixed(1))
const todayText = computed(() => {
  const s = props.stats?.todayOnlineSeconds ?? 0
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  if (h && m) return `今日累计在线：${h} 小时 ${m} 分钟`
  if (h) return `今日累计在线：${h} 小时`
  if (m) return `今日累计在线：${m} 分钟`
  return '今日累计在线：0 分钟'
})
const healthPct = computed(() => Math.max(0, Math.min(100, Math.round((props.stats?.healthProgress ?? 0) * 100))))

async function togglePause() {
  if (paused.value) { await api.resumeOnlineTime(); paused.value = false }
  else { await api.pauseOnlineTime(); paused.value = true }
}

function confirmDisconnect() {
  disconnectOpen.value = false
  api.disconnect()
}
</script>

<template>
  <div class="cc">
    <div class="cc-inner">
      <!-- 页面标题 -->
      <div class="page-head">
        <h1 class="page-title">
          <svg class="pt-ic" viewBox="0 0 24 24" width="30" height="30"><path fill="currentColor" d="M12,19.2C9.5,19.2 7.29,17.92 6,15.98C6.03,13.99 10,12.9 12,12.9C13.99,12.9 17.97,13.99 18,15.98C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
          玩家控制中心
        </h1>
        <p class="page-sub">管理你的在线状态、连接与安全验证</p>
      </div>

      <!-- 第一行：在线时长 + 连接状态 -->
      <div class="row row-top">
        <div class="stat-card glass-panel card-time">
          <div class="ct-head">
            <div>
              <p class="card-label">本次游戏在线时长</p>
              <h2 class="clock">{{ stats?.onlineTime ?? '00:00:00' }}</h2>
              <p class="clock-sub">小时 : 分钟 : 秒</p>
            </div>
            <div class="toggle-btn" :class="{ paused }" @click="togglePause" :title="paused ? '继续计时' : '暂停计时'">
              <svg v-if="!paused" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>
            </div>
          </div>
          <div class="bar-track"><div class="bar-fill" :style="{ width: healthPct + '%' }" /></div>
          <p class="bar-sub">{{ todayText }}</p>
        </div>

        <div class="stat-card glass-panel card-conn">
          <p class="card-label conn-label">当前连接状态</p>
          <div class="conn-list">
            <div class="conn-row"><span>服务器</span><span class="v-ok">{{ serverName || '—' }}</span></div>
            <div class="conn-row"><span>网络延迟</span><span class="v-strong">{{ delayText }}</span></div>
            <div class="conn-row"><span>内存占用</span><span class="v-strong">{{ stats?.memoryMB ?? 0 }} MB</span></div>
            <div class="conn-row"><span>实时网速</span><span class="v-strong">↑ {{ upText }} KB/s · ↓ {{ downText }} KB/s</span></div>
          </div>
        </div>
      </div>

      <!-- 第二行：危险操作 + 安全中心 -->
      <div class="row row-actions">
        <div class="stat-card glass-panel">
          <p class="card-label danger act-label">联网操作</p>
          <h3 class="card-h3">立即断开代理服务器</h3>
          <p class="card-desc">断开后将退出当前代理连接，未保存进度可能会丢失，请谨慎操作。</p>
          <button class="btn lift btn-danger" @click="disconnectOpen = true">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13V3Z"/></svg>
            立即断开连接
          </button>
        </div>

        <div class="stat-card glass-panel">
          <p class="card-label sky act-label">安全中心</p>
          <h3 class="card-h3">账号安全验证</h3>
          <p class="card-desc">可验证代理服务器的连接状态，以及输入的账号密码是否正确。</p>
          <button class="btn lift btn-sky" @click="emit('verify')">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>
            立即安全验证
          </button>
        </div>
      </div>
    </div>

    <!-- 断开确认弹窗 -->
    <div v-if="disconnectOpen" class="modal-overlay" @click.self="disconnectOpen = false">
      <div class="modal-box">
        <svg class="mb-ic danger" viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13V3Z"/></svg>
        <h2 class="mb-title">确认断开连接？</h2>
        <p class="mb-desc">断开后将退出当前代理连接，未保存进度可能会丢失。</p>
        <div class="mb-actions">
          <button class="btn btn-ghost" @click="disconnectOpen = false">取消</button>
          <button class="btn btn-danger" @click="confirmDisconnect">确认断开</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 外层：对应参考 HTML 的 p-8(32px)；内容 max-w-5xl(1024px) 居中 */
.cc { flex: 1; overflow-y: auto; z-index: 10; padding: 32px; }
.cc-inner { max-width: 1024px; margin: 0 auto; }

.glass-panel {
  background: rgba(15, 23, 42, 0.7);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
/* rounded-xl 12px / p-6 24px / stat-card hover */
.stat-card {
  border-radius: 12px; padding: 24px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -8px rgba(56, 189, 248, 0.15);
}

/* 页面标题（mb-8=32px） */
.page-head { margin-bottom: 32px; }
.page-title { display: flex; align-items: center; gap: 12px; margin: 0 0 8px; font-size: 1.875rem; line-height: 2.25rem; font-weight: 700; color: #fff; }
.pt-ic { color: #38bdf8; display: block; }
.page-sub { margin: 0; color: #94a3b8; font-size: 1rem; }

/* 行布局（gap-6=24px / mb-8=32px） */
.row { display: grid; gap: 24px; margin-bottom: 32px; }
.row-top { grid-template-columns: 2fr 1fr; }
.row-actions { grid-template-columns: 1fr 1fr; }
.row-actions { margin-bottom: 0; }

/* 卡片标签 text-xs uppercase tracking-wider font-semibold slate-400 */
.card-label { margin: 0; font-size: 0.75rem; line-height: 1rem; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; color: #94a3b8; }
.card-label.danger { color: #f87171; }
.card-label.sky { color: #38bdf8; }
.conn-label { margin-bottom: 16px; }   /* mb-4 */
.act-label { margin-bottom: 12px; }    /* mb-3 */

/* 在线时长卡片 */
.ct-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.clock { margin: 8px 0 0; font-size: 2.25rem; line-height: 2.5rem; font-weight: 700; color: #fff; }
.clock-sub { margin: 4px 0 0; font-size: 0.875rem; color: #94a3b8; }
.toggle-btn {
  width: 48px; height: 48px; border-radius: 50%; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #38bdf8; background: rgba(56, 189, 248, 0.2); transition: all .25s;
}
.toggle-btn.paused { color: #fbbf24; background: rgba(245, 158, 11, 0.2); }
/* 进度条 h-1.5=6px / slate-800/50 / sky-500 fill */
.bar-track { width: 100%; height: 6px; border-radius: 9999px; background: rgba(30, 41, 59, 0.5); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 9999px; background: #0ea5e9; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3); transition: width .4s ease; }
.bar-sub { margin: 8px 0 0; font-size: 0.75rem; color: #64748b; }   /* text-xs slate-500 mt-2 */

/* 连接状态卡片（space-y-4=16px / text-sm） */
.conn-list { display: flex; flex-direction: column; gap: 16px; }
.conn-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.875rem; }
.conn-row > span:first-child { color: #e2e8f0; }
.v-ok { color: #34d399; font-weight: 500; }
.v-strong { color: #fff; font-weight: 500; }
.v-speed { color: #34d399; font-weight: 500; }

/* 危险 / 安全 卡片 */
.card-h3 { margin: 0 0 16px; font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; color: #fff; }
.card-desc { margin: 0 0 24px; font-size: 0.875rem; line-height: 1.5; color: #94a3b8; }

/* 按钮 py-3.5=14px / rounded-xl 12px / font-medium / gap-2=8px */
.btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 0; border: none; border-radius: 12px; cursor: pointer;
  font-size: 1rem; font-weight: 500; color: #fff;
  transition: all 0.3s cubic-bezier(.4, 0, .2, 1);
}
.btn.lift:hover { transform: translateY(-4px); }   /* hover:-translate-y-1 */
.btn.lift:active { transform: scale(.95); }          /* active:scale-95 */
.btn-danger { background: #ef4444; }
.btn-danger:hover { background: #dc2626; }
.btn-sky { background: #0ea5e9; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3); }
.btn-sky:hover { background: #38bdf8; }
.btn-ghost { background: #334155; }
.btn-ghost:hover { background: #475569; }

/* 断开确认弹窗（与参考 modal-box 一致） */
.modal-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(15, 23, 42, 0.8); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  width: 420px; background: #1e293b; border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  padding: 32px; text-align: center;
}
.mb-ic { display: block; margin: 0 auto 16px; }
.mb-ic.danger { color: #ef4444; }
.mb-title { margin: 0 0 8px; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; color: #fff; }
.mb-desc { margin: 0 0 24px; font-size: 0.875rem; line-height: 1.5; color: #94a3b8; }
.mb-actions { display: flex; gap: 12px; }
.mb-actions .btn { padding: 12px 0; }   /* py-3 */
</style>
