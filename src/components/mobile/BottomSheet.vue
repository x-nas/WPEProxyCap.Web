<script setup lang="ts">
/*
  底部弹层 —— 手机版 2.0 所有「选一项 / 填几个字 / 确认一下」的容器（2026-09-15）。

  · 手机宽度（< 600px）从底部弹出，拇指够得着；平板上居中，最宽 560px。
  · 登记进 useModal：外壳因此 inert，系统返回键先关它（closeTopModal）。
  · 点遮罩关闭 —— 与 CyberModal 相反（那边有填了一半的表单）；这里有表单的弹层传 persistent。
  · busy 时不许关（正在保存 / 断开）。
*/
import { nextTick, ref, watch } from 'vue'
import { t } from '../../i18n'
import { useModal } from '../../useModal'

const props = withDefaults(defineProps<{ open: boolean; title?: string; persistent?: boolean; busy?: boolean }>(), {
  title: '',
  persistent: false,
  busy: false,
})

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const box = ref<HTMLElement | null>(null)

function close(): void {
  if (props.busy) return
  emit('update:open', false)
}

function onMask(): void {
  if (!props.persistent) close()
}

const { covered } = useModal(() => props.open, close)

watch(() => props.open, async (on) => {
  if (!on) return
  await nextTick()
  box.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="bs-mask" :inert="covered" @click.self="onMask">
      <section ref="box" class="bs" role="dialog" aria-modal="true" :aria-label="props.title" tabindex="-1" @keydown.esc="close">
        <div class="bs-handle" aria-hidden="true" />
        <header v-if="props.title" class="bs-hd">
          <h2>{{ props.title }}</h2>
          <slot name="action" />
          <button class="bs-x" type="button" :aria-label="t('dlg.close')" :disabled="props.busy" @click="close">
            <svg class="ico" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <div class="bs-bd"><slot /></div>
        <footer v-if="$slots.footer" class="bs-ft"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.bs-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: rgb(var(--scrim-rgb) / 62%);
}

.bs {
  width: 100%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border-top: 1px solid var(--border2);
  border-radius: 20px 20px 0 0;
  color: var(--gray);
  font-family: var(--m-sans);
  font-size: var(--fs-body);
  outline: none;
  box-shadow: 0 -12px 40px rgb(var(--shadow-rgb) / 40%);
  animation: bs-up .22s ease-out;
}

.bs-handle { flex: none; width: 40px; height: 4px; margin: 10px auto 2px; border-radius: 4px; background: var(--border2); }

.bs-hd { flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 8px 8px 20px; }
.bs-hd h2 { flex: 1; min-width: 0; margin: 0; font-size: var(--fs-lead); font-weight: 700; line-height: 1.4; }

.bs-x { flex: none; width: 44px; height: 44px; display: grid; place-items: center; border: 0; background: transparent; color: var(--muted); cursor: pointer; }
.bs-x .ico { width: 20px; height: 20px; }
.bs-x:disabled { opacity: .4; }

.bs-bd { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 16px 12px; }

.bs-ft { flex: none; display: flex; gap: 10px; padding: 12px 16px 16px; border-top: 1px solid var(--border); }

@keyframes bs-up { from { transform: translateY(24px); opacity: .4; } to { transform: none; opacity: 1; } }

@media (min-width: 600px) {
  .bs-mask { justify-content: center; align-items: center; padding: 24px; }
  .bs { width: min(560px, 100%); max-height: 80vh; border: 1px solid var(--border2); border-radius: 18px; }
  .bs-handle { display: none; }
  .bs-hd { padding-top: 12px; }
}

@media (prefers-reduced-motion: reduce) { .bs { animation: none; } }
</style>
