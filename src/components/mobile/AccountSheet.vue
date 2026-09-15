<script setup lang="ts">
/*
  账号与密码（底部弹层）—— 「加速」页的账号行与「我的」页的账号卡都打开它。
  编辑的是一份草稿，点「保存」才写回共用的登录表单并落盘；取消 / 点遮罩就当没改过。
*/
import { inject, ref, watch } from 'vue'
import { t } from '../../i18n'
import { pushToast } from '../../stores/toast'
import BottomSheet from './BottomSheet.vue'
import { LOGIN } from './inject'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const { username, password, remember, selectedServer, persistAccount, openServerUrl } = inject(LOGIN)!

const u = ref('')
const p = ref('')
const r = ref(true)
const showPwd = ref(false)
const busy = ref(false)
const err = ref('')

watch(() => props.open, (on) => {
  if (!on) return
  u.value = username.value
  p.value = password.value
  r.value = remember.value
  showPwd.value = false
  err.value = ''
})

async function save(): Promise<void> {
  err.value = ''
  if (!u.value.trim() || !p.value) { err.value = t('mob.accRequired'); return }
  busy.value = true
  try {
    username.value = u.value.trim()
    password.value = p.value
    remember.value = r.value
    await persistAccount()
    pushToast('success', t('mob.accSaved'))
    emit('update:open', false)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet :open="props.open" :title="t('mob.editAccount')" :busy="busy" persistent @update:open="emit('update:open', $event)">
    <div class="form">
      <label class="m-lbl" for="acc-user">{{ t('home.account') }}</label>
      <div class="m-inp">
        <input id="acc-user" v-model="u" autocomplete="username" autocapitalize="off" spellcheck="false" :placeholder="t('home.accountPh')" :disabled="busy" />
      </div>

      <label class="m-lbl" for="acc-pass">{{ t('home.password') }}</label>
      <div class="m-inp">
        <input id="acc-pass" v-model="p" :type="showPwd ? 'text' : 'password'" autocomplete="current-password" enterkeyhint="done"
               :placeholder="t('home.passwordPh')" :disabled="busy" @keyup.enter="save" />
        <button class="eye" type="button" :aria-label="t(showPwd ? 'mob.hidePwd' : 'mob.showPwd')" :aria-pressed="showPwd" @click="showPwd = !showPwd">
          <!-- 密码藏着时画睁眼（点了显示），显示着时画划掉的眼（点了隐藏） -->
          <svg v-if="!showPwd" class="ico" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          <svg v-else class="ico" viewBox="0 0 24 24"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
        </button>
      </div>

      <div class="rem">
        <span id="acc-rem">{{ t('home.remember') }}</span>
        <button class="m-switch" :class="{ on: r }" type="button" role="switch" :aria-checked="r" aria-labelledby="acc-rem" @click="r = !r" />
      </div>

      <div class="links">
        <button class="m-link" type="button" @click="openServerUrl(selectedServer?.forgotURL)">{{ t('home.forgot') }}</button>
        <button class="m-link" type="button" @click="openServerUrl(selectedServer?.registerURL)">{{ t('home.register') }}</button>
      </div>

      <p v-if="err" class="m-err" role="alert">{{ err }}</p>
    </div>

    <template #footer>
      <button class="m-btn" type="button" :disabled="busy" @click="emit('update:open', false)">{{ t('dlg.cancel') }}</button>
      <button class="m-btn pri" type="button" :disabled="busy" @click="save">{{ busy ? t('dlg.working') : t('dlg.save') }}</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
.rem { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.links { display: flex; justify-content: space-between; margin-top: -8px; }
</style>
