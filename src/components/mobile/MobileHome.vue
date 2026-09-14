<script setup lang="ts">
/*
  手机版主页（未连接）—— 与 Windows 版 MainView <b>同一套零件，竖着排</b>：

    节点磁贴（横向滑动）→ 反应堆核心（它本身就是连接按钮）→ AUTH 凭据 → SUBSCRIPTION 订阅
    → APPS 分应用代理与后台运行 → INTEL 公告

  登录逻辑与 MainView 共用 useLoginForm，零件样式共用 home.css / reactor.css，
  这里只写竖屏骨架与手机专属的那一张卡。

  ⚠️ 手机专属的样式<b>不许用 :has() / color-mix()</b>：System WebView 可能停在较老的 Chromium（见 vite.config.ts）。
*/
import { computed } from 'vue'
import type { AppProxy, AppState, NoticeInfo, PlatformInfo, ServerInfo } from '../../api'
import { t, tf, type Key } from '../../i18n'
import ReactorCore from '../ReactorCore.vue'
import IntelBand from '../IntelBand.vue'
import { useLoginForm } from '../useLoginForm'

const props = defineProps<{
  state: AppState | null
  servers: ServerInfo[]
  notices: NoticeInfo[]
  /** 订阅服务器连通性的文案与色槽（外壳按 checkWpeServer 算好） */
  netText: string
  netTone: string
  /** 订阅服务器延迟，-1 = 不通 */
  subDelay: number
  appProxy: AppProxy | null
  platform: PlatformInfo | null
  /** 连接失败时的具体原因（没给 VPN 授权），由外壳按 connectError 事件给 */
  failKey: () => Key | null
}>()

const emit = defineEmits<{ (e: 'subscribe'): void; (e: 'apps'): void; (e: 'battery'): void }>()

const {
  username, password, remember, selectedId, busy, selectedServer, coreTone,
  persistAccount, toggleRemember, chooseServer, login, openServerUrl,
} = useLoginForm(() => props.state, () => props.servers, () => props.failKey())

const pad2 = (n: number) => String(n + 1).padStart(2, '0')

const appsText = computed(() => {
  const p = props.appProxy
  if (!p || p.mode === 'all') return t('mob.appsAll')
  return tf('mob.appsSel', p.packages.length)
})
</script>

<template>
  <div class="mhome">
    <!-- ── 节点 + 核心 ─────────────────────────── -->
    <section class="center hero" :class="{ off: coreTone === 'off' }">
      <div class="nodes" role="radiogroup" :aria-label="t('home.server')">
        <button
          v-for="(s, i) in servers" :key="s.serverId"
          class="node" :class="{ on: s.serverId === selectedId }"
          role="radio" :aria-checked="s.serverId === selectedId" :disabled="busy"
          @click="chooseServer(s.serverId)"
        >
          <span class="nc">NODE {{ pad2(i) }}</span>
          <b>{{ s.serverName }}</b>
        </button>

        <button v-if="!servers.length" class="node empty" @click="emit('subscribe')">
          <span class="nc">NO NODE</span>
          <b>{{ t('home.noServer') }} · {{ t('win.sub') }}</b>
        </button>
      </div>

      <div class="stage">
        <button class="engage" :disabled="busy" :aria-label="t('home.login')" @click="login">
          <ReactorCore :tone="coreTone">
            <template v-if="busy">
              <span class="loader"><i /><i /><i /></span>
              <span class="zh">{{ t('home.connecting') }}</span>
            </template>
            <template v-else>
              <svg class="play" viewBox="0 0 24 24"><path d="M7 5l11 7-11 7z" /></svg>
              <span class="en">{{ servers.length ? 'ENGAGE' : 'OFFLINE' }}</span>
              <span class="zh">{{ servers.length ? t('home.login') : t('home.noServer') }}</span>
              <span v-if="selectedServer" class="sv">{{ selectedServer.serverName }}</span>
            </template>
          </ReactorCore>
        </button>
      </div>

      <div class="hint">{{ servers.length }} NODES <span>//</span> VPN · MIHOMO</div>
    </section>

    <!-- ── 凭据 ─────────────────────────────── -->
    <section class="bay auth">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />AUTH <em>// {{ t('home.welcome') }}</em></div>

      <label class="fl" for="m-user">{{ t('home.account') }}</label>
      <input id="m-user" v-model="username" class="inp lg" autocomplete="username" autocapitalize="off"
             :placeholder="t('home.accountPh')" @blur="persistAccount" />

      <label class="fl" for="m-pass">{{ t('home.password') }}</label>
      <input id="m-pass" v-model="password" class="inp lg" type="password" autocomplete="current-password" enterkeyhint="go"
             :placeholder="t('home.passwordPh')" @blur="persistAccount" @keyup.enter="login" />

      <div class="row2">
        <button class="chk" :class="{ on: remember }" @click="toggleRemember"><i />{{ t('home.remember') }}</button>
        <div class="lk">
          <a @click="openServerUrl(selectedServer?.forgotURL)">{{ t('home.forgot') }}</a>
          <span class="sp">/</span>
          <a class="reg" @click="openServerUrl(selectedServer?.registerURL)">{{ t('home.register') }}</a>
        </div>
      </div>
    </section>

    <!-- ── 订阅 ─────────────────────────────── -->
    <section class="bay sub">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />SUBSCRIPTION <em>// {{ t('win.sub') }}</em></div>

      <div class="subid">{{ state?.subscriberName || t('sub.none') }}</div>

      <div class="kvs">
        <div class="kv"><span class="k">{{ t('sub.time') }}</span><span class="v">{{ state?.subscriberTime || t('sub.never') }}</span></div>
        <div class="kv">
          <span class="k">{{ t('win.subsrv') }}</span>
          <span class="v" :class="netTone">{{ netText }}<template v-if="subDelay >= 0"> · {{ subDelay }} ms</template></span>
        </div>
        <div class="kv"><span class="k">NODES</span><span class="v num">{{ servers.length }}</span></div>
      </div>

      <button class="subbtn" @click="emit('subscribe')">
        <svg class="ico" viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z" /></svg>
        {{ t('win.sub') }}
      </button>
    </section>

    <!-- ── 手机专属：分应用代理 + 后台运行 ───────── -->
    <section class="bay apps">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />DEVICE <em>// {{ t('mob.device') }}</em></div>

      <div class="kvs">
        <div class="kv"><span class="k">{{ t('mob.apps') }}</span><span class="v">{{ appsText }}</span></div>
        <div class="kv">
          <span class="k">{{ t('mob.battery') }}</span>
          <span class="v" :class="platform?.batteryOptimized ? 'a' : 'g'">
            {{ platform ? t(platform.batteryOptimized ? 'mob.batteryLimited' : 'mob.batteryOk') : '—' }}
          </span>
        </div>
      </div>

      <p class="ds">{{ t(platform?.batteryOptimized ? 'mob.batteryDesc' : 'mob.appsDesc') }}</p>

      <div class="btns">
        <button class="subbtn cy" @click="emit('apps')">
          <svg class="ico" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></svg>
          {{ t('mob.appsPick') }}
        </button>
        <button v-if="platform?.batteryOptimized" class="subbtn am" @click="emit('battery')">
          <svg class="ico" viewBox="0 0 24 24"><rect x="3" y="7" width="16" height="10" /><path d="M21 10v4M7 10v4" /></svg>
          {{ t('mob.batteryFix') }}
        </button>
      </div>
    </section>

    <!-- ── 公告 ─────────────────────────────── -->
    <IntelBand class="band" :notices="notices" />
  </div>
</template>

<style scoped src="../reactor.css"></style>
<style scoped src="../home.css"></style>

<style scoped>
.mhome { display: flex; flex-direction: column; gap: 12px; padding: 12px 12px 4px; }

/* 核心：宽度占满、按屏宽定高（正方形），小屏不至于顶满整屏 */
.hero { padding: 2px 0 0; }
.hero .nodes { grid-auto-columns: minmax(138px, 46%); scrollbar-width: none; }
.hero .nodes::-webkit-scrollbar { display: none; }
.hero .stage { flex: none; height: 76vw; max-height: 300px; min-height: 220px; padding: 4px 0; }
.hero .hint { padding-bottom: 2px; }

/* 舱位在竖屏里是普通的卡片：高度随内容，不自己滚 */
.bay { overflow: visible; gap: 9px; padding: 14px 14px 16px; }

/* 触屏：输入框与按钮加高到 40px，手指点得准 */
.bay .inp.lg { height: 40px; }
.subbtn { height: 40px; }

.row2 { display: flex; align-items: center; justify-content: space-between; gap: 10px 14px; flex-wrap: wrap; margin-top: 4px; }
.row2 .chk { min-height: 32px; }
.lk { min-height: 32px; }

.subid { margin-top: 0; }

.btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
.btns .subbtn { flex: 1 1 140px; }

.subbtn.cy { border-color: rgb(var(--cyan-rgb) / 40%); color: var(--cyan); }
.subbtn.cy:hover { background: rgb(var(--cyan-rgb) / 10%); border-color: var(--cyan); }
.subbtn.am { border-color: rgb(var(--amber-rgb) / 45%); color: var(--amber); }
.subbtn.am:hover { background: rgb(var(--amber-rgb) / 10%); border-color: var(--amber); }

.bay.apps { --bk: var(--cyan); --bk-rgb: var(--cyan-rgb); }

.ds { margin: 0; font-size: var(--fs-small); line-height: 1.65; color: var(--dim2); }

/* 公告：列表在上、详情在下（Windows 是左右两栏） */
.band { grid-template-columns: minmax(0, 1fr); }
.band :deep(.list) { max-height: 176px; border-right: 0; border-bottom: 1px solid var(--border); }
.band :deep(.det) { padding: 10px 14px 14px; }
.band :deep(.tx) { flex: none; max-height: 200px; }
</style>
