<script setup lang="ts">
/*
  「我的」页（方案 C 的分组设置，放进方案 A 的第四个标签）。

  原来散在四处的东西收成一张系统设置式的分组列表：
    账号卡（改账号）→ 订阅（订阅号 / 订阅服务器 / 更新时间 / 节点数）→ 运行（后台运行 / 分应用代理 / 系统日志）
    → 外观（主题 / 语言 / 扫描线，改完立即生效）→ 帮助（教程 / 协议 / 隐私 / 开源代码 / 版本）。
  平板宽屏两列。主题与语言用底部弹层选（原来的「软件设置」弹窗手机上不再用）。
*/
import { computed, onMounted, ref } from 'vue'
import { api, type AppProxy, type AppState, type PlatformInfo, type ServerInfo } from '../../api'
import { lang, setLang, t, tf } from '../../i18n'
import { LANGS, type Lang } from '../../i18n/langs'
import { scanLine, setScan, setTheme, theme, type Theme } from '../../stores/theme'
import BottomSheet from './BottomSheet.vue'

const props = defineProps<{
  state: AppState | null
  servers: ServerInfo[]
  platform: PlatformInfo | null
  appProxy: AppProxy | null
  netText: string
  netTone: string
  subDelay: number
}>()

const emit = defineEmits<{
  (e: 'account'): void
  (e: 'subscribe'): void
  (e: 'apps'): void
  (e: 'battery'): void
  (e: 'log'): void
  (e: 'agreement', type: 'UserAgreement' | 'PrivacyPolicy'): void
  (e: 'tutorial'): void
  (e: 'open', url: string): void
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

// checkWpeServer 的四档：g 流畅 / a 一般 / o 卡顿 / m 不在线
const netClass = computed(() => ({ g: 'm-g', a: 'm-a', o: 'm-a', m: 'm-d' } as Record<string, string>)[props.netTone] ?? '')

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
        <section class="grp">
          <h2 class="m-grp-t">{{ t('mob.grpSub') }}</h2>
          <div class="m-card">
            <button class="m-row" type="button" data-probe="sub" @click="emit('subscribe')">
              <span class="k">{{ t('sub.id') }}</span>
              <span class="v mono">{{ state?.subscriberName || t('sub.none') }}</span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <div class="m-row">
              <span class="k">{{ t('win.subsrv') }}</span>
              <span class="v" :class="netClass">{{ netText }}<template v-if="subDelay >= 0"> · {{ subDelay }} ms</template></span>
            </div>
            <div class="m-row">
              <span class="k">{{ t('sub.time') }}</span>
              <span class="v mono">{{ state?.subscriberTime || t('sub.never') }}</span>
            </div>
            <div class="m-row">
              <span class="k">{{ t('mob.nodeCount') }}</span>
              <span class="v mono">{{ servers.length }}</span>
            </div>
          </div>
        </section>

        <section class="grp">
          <h2 class="m-grp-t">{{ t('mob.grpRun') }}</h2>
          <div class="m-card">
            <button class="m-row" type="button" :disabled="!platform?.batteryOptimized" @click="emit('battery')">
              <span class="k">{{ t('mob.battery') }}</span>
              <span class="v" :class="platform?.batteryOptimized ? 'm-a' : 'm-g'">
                {{ platform ? t(platform.batteryOptimized ? 'mob.batteryLimited' : 'mob.batteryOk') : '—' }}
              </span>
              <svg v-if="platform?.batteryOptimized" class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <button class="m-row" type="button" data-probe="apps" @click="emit('apps')">
              <span class="k">{{ t('mob.apps') }}</span>
              <span class="v">{{ appsText }}</span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <button class="m-row" type="button" data-probe="log" @click="emit('log')">
              <span class="k">{{ t('win.log') }}</span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
          <p v-if="platform?.batteryOptimized" class="note">{{ t('mob.batteryDesc') }}</p>
        </section>

        <section class="grp">
          <h2 class="m-grp-t">{{ t('set.theme') }}</h2>
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
        </section>

        <section class="grp">
          <h2 class="m-grp-t">{{ t('mob.grpHelp') }}</h2>
          <div class="m-card">
            <button class="m-row" type="button" @click="emit('tutorial')">
              <span class="k">{{ t('foot.tutorial') }}</span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <button class="m-row" type="button" @click="emit('agreement', 'UserAgreement')">
              <span class="k">{{ t('foot.agreement') }}</span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <button class="m-row" type="button" @click="emit('agreement', 'PrivacyPolicy')">
              <span class="k">{{ t('foot.privacy') }}</span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <button class="m-row" type="button" @click="emit('open', 'https://github.com/x-nas/WPEProxyCap.Android')">
              <span class="k">{{ t('mob.source') }}</span>
              <span class="v mono">GPL-3.0</span>
              <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <div class="m-row ver">
              <span class="k">{{ t('mob.version') }}</span>
              <span class="v mono">V {{ state?.version || '—' }}<template v-if="kernel"><br><small>{{ t('mob.kernel') }} {{ kernel }}</small></template></span>
            </div>
          </div>
        </section>
      </div>

      <button class="copy" type="button" @click="emit('open', 'https://www.wpe64.com')">© 2026 Winsock Packet Editor</button>
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
.acc { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; color: var(--gray); font: inherit; text-align: left; cursor: pointer; }
.av { width: 46px; height: 46px; flex: none; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgb(var(--green-rgb) / 40%); background: rgb(var(--green-rgb) / 10%); color: var(--green); }
.av .ico { width: 22px; height: 22px; }
.who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.who b { font-family: var(--mono); font-size: var(--fs-lead); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.who small { font-size: var(--fs-small); color: var(--dim2); }
.acc .chev { width: 18px; height: 18px; flex: none; color: var(--dim); }

.groups { display: flex; flex-direction: column; gap: 18px; }
.grp { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.note { margin: 0 4px; font-size: var(--fs-small); line-height: 1.6; color: var(--dim2); }

.m-row:disabled { cursor: default; }
.ver .v { white-space: normal; line-height: 1.5; }
.ver small { font-size: var(--fs-caption); color: var(--dim); }

.copy { align-self: center; margin-top: 6px; padding: 10px; border: 0; background: transparent; color: var(--dim2); font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }

.opts .tick { width: 22px; height: 22px; color: var(--cyan); stroke-width: 2.4; }
.opts .short { width: 28px; font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .1em; color: var(--muted); }

@media (min-width: 840px) {
  .groups { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 20px; }
}
</style>
