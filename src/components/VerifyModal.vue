<script setup lang="ts">
import { ref, watch } from 'vue'
import { on } from '../bridge'
import { api } from '../api'

const props = defineProps<{ open: boolean; verifyUrl?: string }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const phase = ref<'running' | 'success' | 'fail'>('running')
const progress = ref('连接测试中，请稍候...')
const resultText = ref('')

let offProgress: (() => void) | null = null

watch(() => props.open, async (v) => {
  if (!v) { offProgress?.(); offProgress = null; return }
  // 每次打开重跑一次验证（对应 VerifyForm_Load）
  phase.value = 'running'
  progress.value = '连接测试中，请稍候...'
  offProgress = on('verifyProgress', (s: string) => (progress.value = s))
  const r = await api.verifyProxy()
  offProgress?.(); offProgress = null
  resultText.value = r.error
  phase.value = r.success ? 'success' : 'fail'
})

function close() { emit('update:open', false) }

function confirm() {
  // 验证通过且有 URL：打开验证页（对应 VerifyResult 的按钮）
  if (phase.value === 'success' && props.verifyUrl) api.openExternal(props.verifyUrl)
  close()
}
</script>

<template>
  <div v-if="open" class="vm-overlay">
    <div class="vm-box">
      <!-- 验证中 -->
      <template v-if="phase === 'running'">
        <div class="vm-spinner" />
        <h2 class="vm-title">安全验证中...</h2>
        <p class="vm-desc">正在检测代理服务器可用性</p>
        <p class="vm-status">{{ progress }}</p>
      </template>

      <!-- 验证通过 -->
      <template v-else-if="phase === 'success'">
        <svg class="vm-ic ok" viewBox="0 0 24 24" width="52" height="52"><path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/></svg>
        <h2 class="vm-title">验证通过</h2>
        <p class="vm-desc mb">{{ resultText || '代理服务器正常，账号安全等级已提升' }}</p>
        <button class="vm-btn ok" @click="confirm">确定</button>
      </template>

      <!-- 验证失败 -->
      <template v-else>
        <svg class="vm-ic err" viewBox="0 0 24 24" width="52" height="52"><path fill="currentColor" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/></svg>
        <h2 class="vm-title">验证失败</h2>
        <p class="vm-desc mb">{{ resultText || '代理服务器不可用，请检查网络后重试' }}</p>
        <button class="vm-btn err" @click="close">关闭</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.vm-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(15, 23, 42, 0.8); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.vm-box {
  width: 460px; background: #1e293b; border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  padding: 32px; text-align: center;
}

/* 转圈 */
.vm-spinner {
  width: 64px; height: 64px; margin: 0 auto 16px;
  border: 4px solid #0ea5e9; border-top-color: transparent; border-radius: 50%;
  animation: vm-spin 1s linear infinite;
}
@keyframes vm-spin { to { transform: rotate(360deg); } }

.vm-ic { display: block; margin: 0 auto 16px; }
.vm-ic.ok { color: #34d399; }
.vm-ic.err { color: #f87171; }

.vm-title { margin: 0 0 8px; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; color: #fff; }
.vm-desc { margin: 0 0 4px; font-size: 0.875rem; line-height: 1.5; color: #94a3b8; }
.vm-desc.mb { margin-bottom: 24px; }
.vm-status { margin: 0; font-size: 0.75rem; color: #38bdf8; }

.vm-btn {
  width: 100%; padding: 12px 0; border: none; border-radius: 12px; cursor: pointer;
  font-size: 1rem; font-weight: 500; color: #fff; transition: background .2s;
}
.vm-btn.ok { background: #10b981; }
.vm-btn.ok:hover { background: #34d399; }
.vm-btn.err { background: #ef4444; }
.vm-btn.err:hover { background: #f87171; }
</style>
