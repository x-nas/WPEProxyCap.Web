<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { api } from '../api'

const props = defineProps<{ open: boolean; subscriberName: string | null; subscriberTime: string | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'updated'): void }>()

const input = ref('')
const busy = ref(false)

watch(() => props.open, (v) => { if (v) input.value = props.subscriberName ?? '' })

async function update() {
  const name = input.value.trim()
  if (!name) return
  busy.value = true
  try {
    const ok = await api.setSubscriber(name)
    if (ok) {
      message.success('更新订阅成功，已自动保存订阅地址')
      emit('updated')
      emit('update:open', false)
    } else {
      message.error('更新订阅失败，请检查订阅地址是否正确')
    }
  } finally {
    busy.value = false
  }
}

function close() { emit('update:open', false) }
</script>

<template>
  <a-modal :open="open" title="订阅设置" :footer="null" centered :width="400"
           wrap-class-name="sub-modal-wrap" @update:open="emit('update:open', $event)">
    <div class="sub-body">
      <div class="sub-meta">
        <div>当前订阅：{{ subscriberName || '未配置订阅地址' }}</div>
        <div class="sub-time">更新时间：{{ subscriberTime || '从未更新' }}</div>
      </div>
      <a-input v-model:value="input" placeholder="请输入订阅号" allow-clear @press-enter="update" />
      <div class="sub-actions">
        <button class="sub-btn sub-exit" @click="close">退出</button>
        <button class="sub-btn sub-update" :disabled="busy" @click="update">
          <svg class="sub-btn-ic" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/></svg>
          {{ busy ? '更新中…' : '更新订阅' }}
        </button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.sub-body { display: flex; flex-direction: column; gap: 14px; padding-top: 6px; }
.sub-meta { font-size: 13px; color: #94a3b8; line-height: 1.8; }
.sub-time { font-size: 12px; }

/* 底部按钮行：退出(深色·较窄) + 更新订阅(蓝色·较宽·带图标) */
.sub-actions { display: flex; gap: 14px; margin-top: 4px; }
.sub-btn {
  flex: 1; height: 44px; border: none; border-radius: 10px; cursor: pointer;
  font-size: 15px; font-weight: 600; display: inline-flex; align-items: center;
  justify-content: center; gap: 8px; transition: all .18s;
}
.sub-btn-ic { flex-shrink: 0; }
.sub-exit { background: #334155; color: #e2e8f0; }
.sub-exit:hover { background: #3f4d63; }
.sub-update { background: #0ea5e9; color: #fff; box-shadow: 0 8px 20px rgba(14,165,233,.28); }
.sub-update:hover:not(:disabled) { background: #38bdf8; }
.sub-update:active:not(:disabled), .sub-exit:active { transform: scale(.97); }
.sub-update:disabled { opacity: .7; cursor: default; }
</style>

<!-- 弹窗 teleport 到 body，scoped 够不到，用 wrapClassName 定位做全局覆盖 -->
<style>
/* 标题颜色与主界面左上角软件名(.bname #38bdf8)一致 */
.sub-modal-wrap .ant-modal-title { color: #38bdf8; }
/* 订阅号输入框高度对齐主页输入框(.input 48px)，圆角/字号一并对齐 */
.sub-modal-wrap .ant-input-affix-wrapper,
.sub-modal-wrap .ant-input { height: 48px; border-radius: 12px; font-size: 16px; }
.sub-modal-wrap .ant-input-affix-wrapper { padding-top: 0; padding-bottom: 0; }
.sub-modal-wrap .ant-input-affix-wrapper .ant-input { height: auto; border-radius: 0; }
</style>
