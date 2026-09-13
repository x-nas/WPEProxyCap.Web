<script setup lang="ts">
/*
  确认框 —— 全项目一份（退出程序 / 隐藏界面 / 断开连接都走它）。

  改造前这三处各画了一个 overlay + box（圆角 16px、蓝色主按钮、slate 配色），
  长得一样却是三份代码，而且与这套赛博皮肤完全不搭。收成一个之后，
  它与 CyberModal 是同一套语言：方角、发丝边、四角标记、Orbitron 青色标题。

  【等级色】按 level 换色：
    danger  破坏性的（断开连接 / 退出程序）—— 红
    warning 会有后果但能撤（隐藏界面）—— 琥珀
    info    单纯问一句 —— 青

  ⚠️ <b>焦点默认落在「取消」上</b>：这几个确认框里有断开连接、退出程序这类
  不可撤销的操作，回车不该直接把它做掉。
  ⚠️ <b>不在弹窗上绑 Enter = 确定</b>：焦点在「取消」上时按 Enter 会同时触发按钮的
  click 和弹窗的 keydown，两条路一起走到同一个出口，谁先谁后决定答案。
  Enter 就交给当前有焦点的按钮，标准且没有歧义。
*/
import { nextTick, ref, watch } from 'vue'
import { t } from '../i18n'
import { useModal } from '../useModal'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  /** 确定键的文案。默认「确定」 */
  okText?: string
  cancelText?: string
  level?: 'danger' | 'warning' | 'info'
}>(), { message: '', level: 'danger' })

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm'): void
}>()

const cancelBtn = ref<HTMLElement | null>(null)

watch(() => props.open, async (on) => {
  if (!on) return
  await nextTick()
  cancelBtn.value?.focus()
})

function close(): void { emit('update:open', false) }
function ok(): void { emit('confirm'); emit('update:open', false) }

const { covered } = useModal(() => props.open)
</script>

<template>
  <Teleport to="body"><div v-if="props.open" class="mask" :class="props.level" :inert="covered" @keydown.esc="close">
    <div class="box" role="alertdialog" aria-modal="true">
      <span class="mk tl" /><span class="mk tr" /><span class="mk bl" /><span class="mk br" />

      <svg class="ic" viewBox="0 0 24 24">
        <template v-if="props.level === 'info'"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></template>
        <template v-else-if="props.level === 'warning'"><path d="M12 3l9 16H3z" /><path d="M12 9v4M12 16h.01" /></template>
        <template v-else><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></template>
      </svg>

      <h2 class="tt">{{ props.title }}</h2>
      <p v-if="props.message" class="ms">{{ props.message }}</p>

      <div class="acts">
        <button ref="cancelBtn" class="b" @click="close">{{ props.cancelText || t('dlg.cancel') }}</button>
        <button class="b go" @click="ok">{{ props.okText || t('dlg.ok') }}</button>
      </div>
    </div>
  </div></Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgb(var(--scrim-rgb) / 78%);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 等级色由这一层往下传，box 里的件全走 currentColor / var(--lv) */
  --lv: var(--danger);
  --lv-rgb: var(--danger-rgb);
}

.mask.warning { --lv: var(--amber); --lv-rgb: var(--amber-rgb); }
.mask.info { --lv: var(--cyan); --lv-rgb: var(--cyan-rgb); }

.box {
  position: relative;
  width: 420px;
  max-width: calc(100vw - 64px);
  padding: 30px 30px 24px;
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 18px 60px rgb(var(--shadow-rgb) / 55%);
  text-align: center;
}

.mk { position: absolute; width: 11px; height: 11px; border: 1px solid rgb(var(--lv-rgb) / 55%); }
.mk.tl { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
.mk.tr { top: 6px; right: 6px; border-left: 0; border-bottom: 0; }
.mk.bl { bottom: 6px; left: 6px; border-right: 0; border-top: 0; }
.mk.br { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

.ic {
  width: 40px;
  height: 40px;
  margin: 0 auto 14px;
  display: block;
  stroke: var(--lv);
  stroke-width: 1.6;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 10px rgb(var(--lv-rgb) / 45%));
}

.tt {
  margin: 0 0 10px;
  font-family: var(--orbit);
  font-weight: 700;
  font-size: var(--fs-title);
  line-height: 1.35;
  letter-spacing: .03em;
  color: var(--lv);
}

/* 正文是整句，要能折行 —— 截断了就没意义 */
.ms { margin: 0 0 22px; font-size: var(--fs-lead); line-height: 1.65; color: var(--dim2); }

.acts { display: flex; gap: 10px; }

.b {
  flex: 1;
  padding: 11px 14px 11px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--gray);
  font-family: var(--share);
  font-size: var(--btn-size);
  /* 显式 1：Share Tech Mono 在 normal 行高下会把行距全压在字的下面 */
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: .15s;
  white-space: nowrap;
}

.b:hover { border-color: var(--cyan); color: var(--cyan); }

/* 确定键跟着等级色走：破坏性的那一下该看得出来是破坏性的 */
.b.go { border-color: rgb(var(--lv-rgb) / 45%); color: var(--lv); }
.b.go:hover { background: rgb(var(--lv-rgb) / 12%); border-color: var(--lv); color: var(--lv); }
.b.go:focus-visible { outline-color: var(--lv); }
</style>
