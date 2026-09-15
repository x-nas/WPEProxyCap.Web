<script setup lang="ts">
/*
  「我的」页（方案 C 的分组设置，放进方案 A 的第四个标签）。

  账号卡（改账号）→ 运行（订阅号 / 分应用代理 / 后台运行受限时才出现 / 系统日志）
  → 外观（主题 / 语言 / 扫描线，改完立即生效）→ 帮助（教程 · 协议与隐私）→ 底部一行版本号。

  ⚠️ 2026-09-15 起<b>尽量一屏放下</b>（用户要求）：去掉了订阅服务器状态 / 更新时间 / 节点数这组订阅信息、
  开源代码入口、底部版权，分组小标题也不要了（三张卡片本身就是分组）；行高收到 42。
  订阅号那一行留着 —— 有节点之后，那是改订阅号的唯一入口（弹层里有完整的订阅信息）。
  平板宽屏两列。主题与语言用底部弹层选（原来的「软件设置」弹窗手机上不再用）。
*/
import { computed, onMounted, ref } from 'vue'
import { api, type AppProxy, type AppState, type PlatformInfo } from '../../api'
import { lang, setLang, t, tf } from '../../i18n'
import { LANGS, type Lang } from '../../i18n/langs'
import { scanLine, setScan, setTheme, theme, type Theme } from '../../stores/theme'
import BottomSheet from './BottomSheet.vue'

const props = defineProps<{
  state: AppState | null
  platform: PlatformInfo | null
  appProxy: AppProxy | null
}>()

const emit = defineEmits<{
  (e: 'account'): void
  (e: 'subscribe'): void
  (e: 'apps'): void
  (e: 'battery'): void
  (e: 'log'): void
  (e: 'agreement', type: 'UserAgreement' | 'PrivacyPolicy'): void
  (e: 'tutorial'): void
}>()

const kernel = ref('')
onMounted(() => { api.getMihomoVersion().then((v) => { kernel.value = v }).catch(() => {}) })

const themeOpen = ref(false)
const langOpen = ref(false)

const THEMES: Array<{ id: Theme; k: 'set.dark' | 'set.light' | 'set.system' }> = [
  { id: 'dark', k: 'set.dark' },
  { id: 'light', k: 'set.light' },
  { id: 'system', k: 'set.system' },
]

const themeLabel = computed(() => t(THEMES.find((x) => x.id === theme.value)?.k ?? 'set.dark'))
const langLabel = computed(() => LANGS.find((l) => l.code === lang.value)?.label ?? '')

const appsText = computed(() => {
  const p = props.appProxy
  if (!p || p.mode === 'all') return t('mob.appsAll')
  return tf('mob.appsSel', p.packages.length)
})

function pickTheme(id: Theme): void {
  setTheme(id)
  themeOpen.value = false
}

function pickLang(code: Lang): void {
  setLang(code)
  langOpen.value = false
}
</script>

<template>
  <div class="m-page">
    <div class="m-wrap wide me">
      <header class="m-hd"><h1 class="m-title">{{ t('mob.tabMe') }}</h1></header>

      <button class="m-card acc" type="button" data-probe="account" @click="emit('account')">
        <span class="av">
          <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
        </span>
        <span class="who">
          <b>{{ state?.userName || t('mob.meNotSigned') }}</b>
          <small>{{ t('mob.editAccount') }}</small>
        </span>
        <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
      </button>

      <div class="groups">
        <div class="m-card">
          <button class="m-row" type="button" data-probe="sub" @click="emit('subscribe')">
            <span class="k">{{ t('sub.id') }}</span>
            <span class="v mono">{{ state?.subscriberName || t('sub.none') }}</span>
            <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <button class="m-row" type="button" data-probe="apps" @click="emit('apps')">
            <span class="k">{{ t('mob.apps') }}</span>
            <span class="v">{{ appsText }}</span>
            <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <!-- 后台运行只在受限时出现（不受限时这一行没有可做的事；受限的说明在加速页顶部的提示条上） -->
          <button v-if="platform?.batteryOptimized" class="m-row" type="button" @click="emit('battery')">
            <span class="k">{{ t('mob.battery') }}</span>
            <span class="v m-a">{{ t('mob.batteryLimited') }}</span>
            <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <button class="m-row" type="button" data-probe="log" @click="emit('log')">
            <span class="k">{{ t('win.log') }}</span>
            <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>

        <div class="m-card">
          <button class="m-row" type="button" data-probe="theme" @click="themeOpen = true">
            <span class="k">{{ t('mob.theme') }}</span>
            <span class="v">{{ themeLabel }}</span>
            <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <button class="m-row" type="button" data-probe="lang" @click="langOpen = true">
            <span class="k">{{ t('set.lang') }}</span>
            <span class="v">{{ langLabel }}</span>
            <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <div class="m-row">
            <span id="me-scan" class="k">{{ t('set.scan') }}</span>
            <button class="m-switch" :class="{ on: scanLine }" type="button" role="switch" :aria-checked="scanLine" aria-labelledby="me-scan" @click="setScan(!scanLine)" />
          </div>
        </div>

        <div class="m-card">
          <button class="m-row" type="button" @click="emit('tutorial')">
            <span class="k">{{ t('foot.tutorial') }}</span>
            <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <!-- 协议与隐私并成一行两个链接：各占一行太高，而它们一年也点不了一次 -->
          <div class="m-row legal">
            <button class="m-link" type="button" @click="emit('agreement', 'UserAgreement')">{{ t('foot.agreement') }}</button>
            <i aria-hidden="true">·</i>
            <button class="m-link" type="button" @click="emit('agreement', 'PrivacyPolicy')">{{ t('foot.privacy') }}</button>
          </div>
        </div>
      </div>

      <p class="ver">{{ t('mob.version') }} {{ state?.version || '—' }}<template v-if="kernel"> · {{ t('mob.kernel') }} {{ kernel }}</template></p>
    </div>

    <BottomSheet v-model:open="themeOpen" :title="t('mob.theme')">
      <div class="m-card opts" role="radiogroup" :aria-label="t('mob.theme')">
        <button v-for="x in THEMES" :key="x.id" class="m-row" type="button" role="radio" :aria-checked="theme === x.id" @click="pickTheme(x.id)">
          <span class="k">{{ t(x.k) }}</span>
          <svg v-if="theme === x.id" class="ico tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      </div>
    </BottomSheet>

    <BottomSheet v-model:open="langOpen" :title="t('set.lang')">
      <div class="m-card opts" role="radiogroup" :aria-label="t('set.lang')">
        <button v-for="l in LANGS" :key="l.code" class="m-row" type="button" role="radio" :aria-checked="lang === l.code" @click="pickLang(l.code)">
          <span class="short">{{ l.short }}</span>
          <span class="k">{{ l.label }}</span>
          <svg v-if="lang === l.code" class="ico tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.me { gap: 8px; padding-bottom: 10px; }

.acc { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 14px; color: var(--gray); font: inherit; text-align: left; cursor: pointer; }
.av { width: 38px; height: 38px; flex: none; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgb(var(--green-rgb) / 40%); background: rgb(var(--green-rgb) / 10%); color: var(--green); }
.av .ico { width: 20px; height: 20px; }
.who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.who b { font-family: var(--mono); font-size: var(--fs-lead); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.who small { font-size: var(--fs-small); color: var(--dim2); }
.acc .chev { width: 18px; height: 18px; flex: none; color: var(--dim); }

.groups { display: flex; flex-direction: column; gap: 8px; }

/* 行高 52 → 40：设置列表一屏放下（外层 .m-row 是 mobile.css 的共用件，这里只收本页）；360×566 下后台运行受限时九行也放得下 */
.groups .m-row { min-height: 40px; padding-top: 5px; padding-bottom: 5px; }

.legal { gap: 8px; }
.legal .m-link { padding: 6px 0; font-size: var(--fs-body); }
.legal i { font-style: normal; color: var(--dim); }

.ver { margin: 2px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-family: var(--mono); font-size: var(--fs-caption); color: var(--dim); }

.opts .tick { width: 22px; height: 22px; color: var(--cyan); stroke-width: 2.4; }
.opts .short { width: 28px; font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .1em; color: var(--muted); }

@media (min-width: 840px) {
  .groups { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 20px; }
}
</style>
