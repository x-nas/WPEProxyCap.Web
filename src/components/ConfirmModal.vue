<script setup lang="ts">
// 通用确认弹窗：顶部蓝色小横条 + 标题 + 副文案 + 取消/确定两按钮，配色沿用主界面 slate 风格。
withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
}>(), {
  message: '',
  confirmText: '确定',
  cancelText: '取消',
})

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onCancel() { emit('cancel'); emit('update:open', false) }
function onConfirm() { emit('confirm'); emit('update:open', false) }
</script>

<template>
  <a-modal
    :open="open" :footer="null" :closable="false" centered :width="380"
    wrap-class-name="confirm-modal-wrap"
    @update:open="emit('update:open', $event)">
    <div class="cf">
      <div class="cf-icon">
        <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13V3Z"/></svg>
      </div>
      <h3 class="cf-title">{{ title }}</h3>
      <p v-if="message" class="cf-msg">{{ message }}</p>
      <div class="cf-actions">
        <button class="cf-btn cf-cancel" @click="onCancel">{{ cancelText }}</button>
        <button class="cf-btn cf-ok" @click="onConfirm">{{ confirmText }}</button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.cf { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 8px 4px; }
.cf-icon {
  display: flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(56,189,248,.12); color: #38bdf8; margin-bottom: 18px;
}
.cf-title { font-size: 18px; font-weight: 700; color: #e2e8f0; margin: 0; }
.cf-msg { font-size: 13px; color: #94a3b8; margin: 12px 0 0; line-height: 1.6; }
.cf-actions { display: flex; gap: 14px; width: 100%; margin-top: 28px; }
.cf-btn {
  flex: 1; height: 44px; border: none; border-radius: 10px; cursor: pointer;
  font-size: 15px; font-weight: 600; transition: all .18s;
}
.cf-cancel { background: #334155; color: #e2e8f0; }
.cf-cancel:hover { background: #3f4d63; }
.cf-ok { background: #0ea5e9; color: #fff; box-shadow: 0 8px 20px rgba(14,165,233,.28); }
.cf-ok:hover { background: #38bdf8; }
.cf-ok:active, .cf-cancel:active { transform: scale(.96); }
</style>
