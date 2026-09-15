<script setup lang="ts">
/*
  首次使用引导（手机版 2.0）：只问一件事 —— 订阅号（口径见 SubscriberModal.vue 顶部）。
  没有订阅号拿不到服务器地址，也拿不到节点自带的找回密码 / 注册地址，所以它必须先填。

  ⚠️ 2026-09-15 起<b>账号密码不在引导里填</b>，直接放在「加速」页上（用户要求）：
  原来的第二步只能填账号，还没有账号的用户在那一步卡住，找回密码 / 注册又不好找。
  有订阅号的用户根本看不到这一屏（AppMobile 判）。
*/
import { ref } from 'vue'
import { api, type AppState } from '../../api'
import { t } from '../../i18n'

const props = defineProps<{
  state: AppState | null
  /** 订阅成功后重取状态与节点（要等它完成再进主界面，节点卡与找回密码 / 注册链接都取自节点） */
  refresh: () => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'agreement', type: 'UserAgreement' | 'PrivacyPolicy'): void
  (e: 'done'): void
}>()

const subId = ref(props.state?.subscriberName ?? '')
const busy = ref(false)
const err = ref('')

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
    emit('done')
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="m-page ob">
    <div class="in">
      <div class="top">
        <span class="m-wm">WPE <small>PROXY CAP</small></span>
      </div>

      <span class="m-eb">Subscribe</span>
      <h1 class="ttl">{{ t('mob.obSubTitle') }}</h1>
      <p class="ds">{{ t('mob.obSubDesc') }}</p>

      <label class="m-lbl" for="ob-sub">{{ t('sub.id') }}</label>
      <div class="m-inp">
        <input id="ob-sub" v-model="subId" autocomplete="off" autocapitalize="off" spellcheck="false"
               enterkeyhint="go" :placeholder="t('sub.ph')" :disabled="busy" @keyup.enter="next" />
      </div>

      <p v-if="err" class="m-err" role="alert">{{ err }}</p>

      <div class="grow" />

      <p class="agree">
        {{ t('mob.obAgree') }}
        <button class="m-link" type="button" @click="emit('agreement', 'UserAgreement')">{{ t('foot.agreement') }}</button>
        {{ t('mob.and') }}
        <button class="m-link" type="button" @click="emit('agreement', 'PrivacyPolicy')">{{ t('foot.privacy') }}</button>
      </p>

      <button class="m-btn pri go" type="button" :disabled="busy" @click="next">
        <span v-if="busy" class="loader"><i /><i /><i /></span>
        <template v-else>{{ t('mob.obNext') }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.in { min-height: 100%; max-width: 460px; margin: 0 auto; padding: 12px 20px 20px; display: flex; flex-direction: column; gap: 12px; }

.top { display: flex; align-items: center; min-height: 52px; }

.ttl { margin: -4px 0 0; font-size: var(--fs-num); font-weight: 700; line-height: 1.3; text-wrap: balance; }
.ds { margin: 0 0 8px; font-size: var(--fs-small); line-height: 1.7; color: var(--soft); }

.grow { flex: 1; min-height: 12px; }

.agree { margin: 0; font-size: var(--fs-small); line-height: 1.6; color: var(--dim2); text-align: center; }
.agree .m-link { padding: 4px 2px; }

.go { flex: none; }
</style>
