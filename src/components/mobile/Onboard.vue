<script setup lang="ts">
/*
  首次使用引导（手机版 2.0）：两步，每步只问一件事。
    ① 订阅号 —— 没有订阅号拿不到服务器地址（口径见 SubscriberModal.vue 顶部）；
    ② 账号密码 —— 填完保存在本机，之后首页不再出现表单，改账号去「我的」。
  已经有订阅号的用户直接从第二步开始；两样都有的用户根本看不到这一屏（AppMobile 判）。
  第二步时系统返回键回到第一步（useBackStack）。
*/
import { inject, onUnmounted, ref, watch } from 'vue'
import { api, type AppState } from '../../api'
import { t, tf } from '../../i18n'
import { pushBack } from '../../useBackStack'
import { LOGIN } from './inject'

const props = defineProps<{
  state: AppState | null
  /** 订阅成功后重取状态与节点（要等它完成再进第二步，注册 / 找回密码链接取自节点） */
  refresh: () => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'agreement', type: 'UserAgreement' | 'PrivacyPolicy'): void
  (e: 'done'): void
}>()

const { username, password, remember, selectedServer, persistAccount, openServerUrl } = inject(LOGIN)!

const step = ref<1 | 2>(props.state?.subscriberName ? 2 : 1)
const subId = ref(props.state?.subscriberName ?? '')
const busy = ref(false)
const err = ref('')
const showPwd = ref(false)

let dropBack: (() => void) | null = null

watch(step, (s) => {
  dropBack?.()
  dropBack = s === 2 ? pushBack(() => { dropBack = null; step.value = 1 }) : null
  err.value = ''
}, { immediate: true })

onUnmounted(() => dropBack?.())

async function next(): Promise<void> {
  err.value = ''
  const name = subId.value.trim()
  if (!name) { err.value = t('sub.empty'); return }

  busy.value = true
  try {
    const r = await api.setSubscriber(name)
    if (r !== 'ok') {
      err.value = r === 'network' ? t('sub.netErr') : r === 'empty' ? t('sub.empty') : t('sub.invalid')
      return
    }
    await props.refresh()
    step.value = 2
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

async function finish(): Promise<void> {
  err.value = ''
  if (!username.value.trim() || !password.value) { err.value = t('mob.accRequired'); return }
  busy.value = true
  try {
    await persistAccount()
    emit('done')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="m-page ob">
    <div class="in">
      <div class="top">
        <span class="m-wm">WPC</span>
        <div class="prog" aria-hidden="true"><i class="on" /><i :class="{ on: step === 2 }" /></div>
      </div>

      <span class="step">{{ tf('mob.obStep', step) }}<span class="m-eb">{{ step === 1 ? 'Subscribe' : 'Account' }}</span></span>

      <template v-if="step === 1">
        <h1 class="ttl">{{ t('mob.obSubTitle') }}</h1>
        <p class="ds">{{ t('mob.obSubDesc') }}</p>

        <label class="m-lbl" for="ob-sub">{{ t('sub.id') }}</label>
        <div class="m-inp">
          <input id="ob-sub" v-model="subId" autocomplete="off" autocapitalize="off" spellcheck="false"
                 enterkeyhint="next" :placeholder="t('sub.ph')" :disabled="busy" @keyup.enter="next" />
        </div>
      </template>

      <template v-else>
        <h1 class="ttl">{{ t('mob.obAccTitle') }}</h1>
        <p class="ds">{{ t('mob.obAccDesc') }}</p>

        <label class="m-lbl" for="ob-user">{{ t('home.account') }}</label>
        <div class="m-inp">
          <input id="ob-user" v-model="username" autocomplete="username" autocapitalize="off" spellcheck="false"
                 enterkeyhint="next" :placeholder="t('home.accountPh')" :disabled="busy" />
        </div>

        <label class="m-lbl" for="ob-pass">{{ t('home.password') }}</label>
        <div class="m-inp">
          <input id="ob-pass" v-model="password" :type="showPwd ? 'text' : 'password'" autocomplete="current-password"
                 enterkeyhint="done" :placeholder="t('home.passwordPh')" :disabled="busy" @keyup.enter="finish" />
          <button class="eye" type="button" :aria-label="t(showPwd ? 'mob.hidePwd' : 'mob.showPwd')" :aria-pressed="showPwd" @click="showPwd = !showPwd">
            <!-- 密码藏着时画睁眼（点了显示），显示着时画划掉的眼（点了隐藏） -->
            <svg v-if="!showPwd" class="ico" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
            <svg v-else class="ico" viewBox="0 0 24 24"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
          </button>
        </div>

        <div class="rem">
          <span id="ob-rem">{{ t('home.remember') }}</span>
          <button class="m-switch" :class="{ on: remember }" role="switch" :aria-checked="remember" aria-labelledby="ob-rem" @click="remember = !remember" />
        </div>

        <div class="links">
          <button class="m-link" type="button" @click="openServerUrl(selectedServer?.forgotURL)">{{ t('home.forgot') }}</button>
          <button class="m-link" type="button" @click="openServerUrl(selectedServer?.registerURL)">{{ t('home.register') }}</button>
        </div>
      </template>

      <p v-if="err" class="m-err" role="alert">{{ err }}</p>

      <div class="grow" />

      <p v-if="step === 1" class="agree">
        {{ t('mob.obAgree') }}
        <button class="m-link" type="button" @click="emit('agreement', 'UserAgreement')">{{ t('foot.agreement') }}</button>
        {{ t('mob.and') }}
        <button class="m-link" type="button" @click="emit('agreement', 'PrivacyPolicy')">{{ t('foot.privacy') }}</button>
      </p>

      <div class="acts">
        <button v-if="step === 2" class="m-btn back" type="button" :disabled="busy" @click="step = 1">{{ t('mob.obBack') }}</button>
        <button class="m-btn pri" type="button" :disabled="busy" @click="step === 1 ? next() : finish()">
          <span v-if="busy" class="loader"><i /><i /><i /></span>
          <template v-else>{{ step === 1 ? t('mob.obNext') : t('mob.obDone') }}</template>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.in { min-height: 100%; max-width: 460px; margin: 0 auto; padding: 12px 20px 20px; display: flex; flex-direction: column; gap: 12px; }

.top { display: flex; align-items: center; justify-content: space-between; min-height: 52px; }
.prog { display: flex; gap: 6px; width: 96px; }
.prog i { flex: 1; height: 3px; border-radius: 2px; background: var(--border2); }
.prog i.on { background: var(--green); box-shadow: 0 0 8px rgb(var(--green-rgb) / 60%); }

/* 中文步骤说明不用 Share Tech Mono 的大字距（那是给英文代号的），代号跟在后面 */
.step { display: flex; align-items: baseline; gap: 10px; font-size: var(--fs-small); color: var(--dim2); }

.ttl { margin: 2px 0 0; font-size: var(--fs-num); font-weight: 700; line-height: 1.3; text-wrap: balance; }
.ds { margin: 0 0 8px; font-size: var(--fs-small); line-height: 1.7; color: var(--soft); }

.rem { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.links { display: flex; justify-content: space-between; margin-top: -8px; }

.grow { flex: 1; min-height: 12px; }

.agree { margin: 0; font-size: var(--fs-small); line-height: 1.6; color: var(--dim2); text-align: center; }
.agree .m-link { padding: 4px 2px; }

.acts { display: flex; gap: 10px; }
.acts .back { flex: 0 0 34%; }
</style>
