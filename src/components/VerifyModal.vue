<script setup lang="ts">
/*
  安全验证 —— 真连一次 SOCKS5 走完握手 + 认证，报告结果。

  ⚠️ 这条<b>不承载流量</b>：真实流量是 mihomo 发的，这里只是 WPC 自己直连一次
  验证「地址通不通、账号密码对不对」。界面上没必要展开说，但改这一屏之前要知道。

  三态一屏：验证中（三格音量条 + 进度文字）· 通过（绿）· 失败（红）。
  三种都用同一个外壳，只换图标 / 标题 / 正文 / 页脚按钮 —— 尺寸不跳。
*/
import { ref, watch } from 'vue'
import { on } from '../bridge'
import { api } from '../api'
import { t } from '../i18n'
import CyberModal from './CyberModal.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const phase = ref<'running' | 'success' | 'fail'>('running')
const progress = ref('')
const resultText = ref('')

let offProgress: (() => void) | null = null
// 每次打开记一个序号：验证还没回来就关掉再打开时，上一轮的结果不能写到这一轮的界面上
let runId = 0

watch(() => props.open, async (v) => {
  offProgress?.()
  offProgress = null
  const id = ++runId
  if (!v) return

  // 每次打开重跑一次验证（对应原程序 VerifyForm_Load）
  phase.value = 'running'
  progress.value = t('vf.wait')
  resultText.value = ''

  offProgress = on('verifyProgress', (s: string) => { if (id === runId) progress.value = s })

  try {
    const r = await api.verifyProxy()
    if (id !== runId) return
    resultText.value = r.error
    phase.value = r.success ? 'success' : 'fail'
  } catch (e) {
    if (id !== runId) return
    resultText.value = e instanceof Error ? e.message : String(e)
    phase.value = 'fail'
  } finally {
    if (id === runId) { offProgress?.(); offProgress = null }
  }
})

/*
  ⚠️ 2026-09-13 按要求去掉了验证通过时的「确定」，页脚只剩「关闭」。
  那颗按钮原来会顺手打开服务器配置的验证页（ServerInfo.verifyURL，对应原程序 VerifyResult），
  这个动作随之没有了；字段仍在 api.ts 的契约里，要找回就在这里加一颗按钮。
*/
</script>

<template>
  <CyberModal
    :open="props.open"
    :title="t('cc.vfTitle')"
    subtitle="Verification"
    :width="470"
    readonly
    :cancel-text="t('dlg.close')"
    @update:open="emit('update:open', $event)"
  >
    <div class="vf" :class="phase">
      <template v-if="phase === 'running'">
        <span class="loader c"><i /><i /><i /></span>
        <h2>{{ t('vf.running') }}</h2>
        <p>{{ t('vf.runningDesc') }}</p>
        <p class="pg">{{ progress }}</p>
      </template>

      <template v-else-if="phase === 'success'">
        <svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></svg>
        <h2>{{ t('vf.ok') }}</h2>
        <p>{{ resultText || t('vf.okDesc') }}</p>
      </template>

      <template v-else>
        <svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
        <h2>{{ t('vf.bad') }}</h2>
        <p>{{ resultText || t('vf.badDesc') }}</p>
      </template>
    </div>
  </CyberModal>
</template>

<style scoped>
.vf {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  /* 三态高度一致，切换时弹窗不跳 */
  min-height: 190px;
  justify-content: center;
  padding: 18px 24px;
  /* 等级色由这一层往下传 */
  --lv: var(--cyan);
  --lv-rgb: var(--cyan-rgb);
}

.vf.success { --lv: var(--green); --lv-rgb: var(--green-rgb); }
.vf.fail { --lv: var(--danger); --lv-rgb: var(--danger-rgb); }

.ic {
  width: 44px;
  height: 44px;
  margin-bottom: 14px;
  stroke: var(--lv);
  stroke-width: 1.6;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 12px rgb(var(--lv-rgb) / 45%));
}

.loader { margin-bottom: 16px; }

h2 {
  margin: 0 0 10px;
  font-family: var(--orbit);
  font-weight: 700;
  font-size: var(--fs-title);
  letter-spacing: .04em;
  color: var(--lv);
}

/* 正文是整句（服务端给的错误可以很长），要能折行 */
p { margin: 0; font-size: var(--fs-lead); line-height: 1.65; color: var(--dim2); }

.pg { margin-top: 10px; font-family: var(--share); font-size: var(--fs-small); letter-spacing: .08em; color: var(--cyan); }
</style>
