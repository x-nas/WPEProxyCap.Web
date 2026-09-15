<script setup lang="ts">
/*
  订阅设置（底部弹层）—— 手机版对应 SubscriberModal.vue，口径逐条相同：
  订阅号只能由订阅服务器签发，服务器地址只能经订阅号取得（sub.hint）；
  network / invalid 两种失败分开说。本机调试号 127.0.0.1:88 手机上用不上，这里不放。
*/
import { ref, watch } from 'vue'
import { api } from '../../api'
import { t } from '../../i18n'
import { pushToast } from '../../stores/toast'
import BottomSheet from './BottomSheet.vue'

const props = defineProps<{ open: boolean; subscriberName: string | null; subscriberTime: string | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'updated'): void }>()

const input = ref('')
const busy = ref(false)
const err = ref('')

watch(() => props.open, (on) => {
  if (!on) return
  input.value = props.subscriberName ?? ''
  err.value = ''
})

async function update(): Promise<void> {
  const name = input.value.trim()
  err.value = ''
  if (!name) { err.value = t('sub.empty'); return }

  busy.value = true
  try {
    const r = await api.setSubscriber(name)
    if (r === 'ok') {
      pushToast('success', t('sub.ok'))
      emit('updated')
      emit('update:open', false)
      return
    }
    err.value = r === 'network' ? t('sub.netErr') : r === 'empty' ? t('sub.empty') : t('sub.invalid')
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet :open="props.open" :title="t('sub.title')" :busy="busy" persistent @update:open="emit('update:open', $event)">
    <div class="form">
      <p class="hint">{{ t('sub.hint') }}</p>

      <div class="m-card">
        <div class="m-row"><span class="k">{{ t('sub.current') }}</span><span class="v mono">{{ subscriberName || t('sub.none') }}</span></div>
        <div class="m-row"><span class="k">{{ t('sub.time') }}</span><span class="v mono">{{ subscriberTime || t('sub.never') }}</span></div>
      </div>

      <label class="m-lbl" for="sub-id">{{ t('sub.id') }}</label>
      <div class="m-inp">
        <input id="sub-id" v-model="input" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
               :placeholder="t('sub.ph')" :disabled="busy" @keyup.enter="update" />
      </div>

      <p v-if="err" class="m-err" role="alert">{{ err }}</p>
    </div>

    <template #footer>
      <button class="m-btn" type="button" :disabled="busy" @click="emit('update:open', false)">{{ t('dlg.cancel') }}</button>
      <button class="m-btn pri" type="button" :disabled="busy" @click="update">{{ busy ? t('sub.updating') : t('sub.update') }}</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
.hint { margin: 0; font-size: var(--fs-small); line-height: 1.7; color: var(--soft); }
</style>
