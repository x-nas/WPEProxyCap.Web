<script setup lang="ts">
/*
  主页（方案 A · REACTOR，2026-09-13 整屏重做）。

  三舱对称 + 底部情报带：
    左 AUTH        账号 / 密码 / 记住我 / 找回密码·注册
    中 CORE        节点磁贴 + 反应堆核心（核心本身就是连接按钮）
    右 SUBSCRIPTION 订阅号 / 更新时间 / 订阅服务器状态 / 节点数 / 订阅设置
    底 INTEL       公告列表 + 详情（IntelBand，控制中心也用它）

  连上之后 ControlCenter 用<b>同一副骨架</b>：左舱变遥测、右舱变动作、核心变计时表。

  ⚠️ 英文代号（AUTH / ENGAGE / NODE 01…）刻意保持字面量不进字典，
  与 WPE 启动页的 Mode 01 / Ready 同一条口径；给用户读的中文全部走 i18n。
*/
import { computed, ref, watch } from 'vue'
import { api, type ServerInfo, type NoticeInfo, type AppState } from '../api'
import { t } from '../i18n'
import { pushToast } from '../stores/toast'
import ReactorCore from './ReactorCore.vue'
import IntelBand from './IntelBand.vue'

const props = defineProps<{
  state: AppState | null
  servers: ServerInfo[]
  notices: NoticeInfo[]
  /** 订阅服务器连通性的文案与色槽（App 里按 checkWpeServer 算好） */
  netText: string
  netTone: string
  /** 订阅服务器延迟，-1 = 不通 */
  subDelay: number
}>()

const emit = defineEmits<{ (e: 'subscribe'): void }>()

const username = ref('')
const password = ref('')
const remember = ref(true)
const selectedId = ref<string>('')
const busy = ref(false)

watch(() => props.state, (s) => {
  if (s) {
    username.value = s.userName ?? ''
    password.value = s.password ?? ''
    remember.value = s.rememberAccount
  }
}, { immediate: true })

/*
  有节点则默认选中第一个。订阅更新 / 刷新后服务器列表会整份换掉：
  当前选中仍在新列表中 → 保持；否则选中第一个；无节点 → 清空。
  ⚠️ 两种情况都要把选择<b>再报给后端一次</b>：后端每次取列表都会重算选中项，
  只在「换了一个」时才同步的话，两边可能一个指着 A、一个指着 B（节点 Id 按地址 + 名称算，刷新前后稳定）。
*/
watch(() => props.servers, (list) => {
  const keep = list.find((s) => s.serverId === selectedId.value) ?? list[0]
  selectedId.value = keep?.serverId ?? ''
  if (keep) api.selectServer(keep.serverId).catch(() => {})
}, { immediate: true })

const selectedServer = computed(() => props.servers.find((s) => s.serverId === selectedId.value) ?? null)

const coreTone = computed(() => (busy.value ? 'busy' : props.servers.length ? 'idle' : 'off'))

function persistAccount(): void {
  api.updateAccount(username.value.trim(), password.value.trim(), remember.value)
}

function toggleRemember(): void {
  remember.value = !remember.value
  persistAccount()
}

async function chooseServer(id: string): Promise<void> {
  if (busy.value) return
  selectedId.value = id
  await api.selectServer(id).catch(() => {})
}

async function login(): Promise<void> {
  if (busy.value) return
  if (!selectedServer.value) { pushToast('error', t('msg.noServer')); return }
  busy.value = true
  try {
    const ok = await api.connect(username.value.trim(), password.value.trim())
    if (!ok) pushToast('error', t('msg.loginFail'))
  } catch {
    pushToast('error', t('msg.loginFail'))
  } finally { busy.value = false }
}

/** 找回密码 / 立即注册：无 http(s):// 前缀则补 http://（对应原程序 Operate.InitURLString） */
function openServerUrl(rawUrl?: string): void {
  if (!selectedServer.value || !rawUrl) return
  api.openExternal(/^https?:\/\//i.test(rawUrl) ? rawUrl : 'http://' + rawUrl)
}

const pad2 = (n: number) => String(n + 1).padStart(2, '0')
</script>

<template>
  <div class="reactor">
    <!-- ── 左舱：凭据 ─────────────────────────────── -->
    <section class="bay auth">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />AUTH <em>// {{ t('home.welcome') }}</em></div>

      <label class="fl" for="rx-user">{{ t('home.account') }}</label>
      <input id="rx-user" v-model="username" class="inp lg" :placeholder="t('home.accountPh')" @blur="persistAccount" />

      <label class="fl" for="rx-pass">{{ t('home.password') }}</label>
      <input id="rx-pass" v-model="password" class="inp lg" type="password" :placeholder="t('home.passwordPh')"
             @blur="persistAccount" @keyup.enter="login" />

      <!-- 记住我 + 找回密码 / 注册 沉到左舱最下面（2026-09-13 按要求） -->
      <div class="grow" />

      <button class="chk" :class="{ on: remember }" @click="toggleRemember"><i />{{ t('home.remember') }}</button>

      <div class="lk">
        <a @click="openServerUrl(selectedServer?.forgotURL)">{{ t('home.forgot') }}</a>
        <span class="sp">/</span>
        <a class="reg" @click="openServerUrl(selectedServer?.registerURL)">{{ t('home.register') }}</a>
      </div>

      <!-- 「退出程序」按钮 2026-09-13 去掉：标题栏右上角的退出就是它，放两处是重复入口 -->
    </section>

    <!-- ── 中舱：节点 + 核心 ───────────────────────── -->
    <section class="center">
      <div class="nodes" role="radiogroup" :aria-label="t('home.server')">
        <button
          v-for="(s, i) in servers" :key="s.serverId"
          class="node" :class="{ on: s.serverId === selectedId }"
          role="radio" :aria-checked="s.serverId === selectedId" :disabled="busy"
          @click="chooseServer(s.serverId)"
        >
          <span class="nc">NODE {{ pad2(i) }}</span>
          <b :title="s.serverName">{{ s.serverName }}</b>
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

      <div class="hint">{{ servers.length }} NODES <span>//</span> TUN · MIHOMO</div>
    </section>

    <!-- ── 右舱：订阅 ─────────────────────────────── -->
    <section class="bay sub">
      <span class="mk a" /><span class="mk b" />
      <div class="bh"><i />SUBSCRIPTION <em>// {{ t('win.sub') }}</em></div>

      <div>
        <div class="fl">{{ t('sub.current') }}</div>
        <div class="subid" :title="state?.subscriberName || ''">{{ state?.subscriberName || t('sub.none') }}</div>
      </div>

      <div class="kvs">
        <div class="kv"><span class="k">{{ t('sub.time') }}</span><span class="v">{{ state?.subscriberTime || t('sub.never') }}</span></div>
        <div class="kv">
          <span class="k">{{ t('win.subsrv') }}</span>
          <span class="v" :class="netTone">{{ netText }}<template v-if="subDelay >= 0"> · {{ subDelay }} ms</template></span>
        </div>
        <div class="kv"><span class="k">NODES</span><span class="v num">{{ servers.length }}</span></div>
      </div>

      <div class="grow" />

      <button class="subbtn" @click="emit('subscribe')">
        <svg class="ico" viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z" /></svg>
        {{ t('win.sub') }}
      </button>
    </section>

    <!-- ── 底：情报带 ─────────────────────────────── -->
    <IntelBand class="band" :notices="notices" />
  </div>
</template>

<!-- 骨架与 ControlCenter 共用；用 src 引入才会带上 scoped（@import 进来的规则会漏成全局） -->
<style scoped src="./reactor.css"></style>

<style scoped>

/* ── 左舱 ─────────────────────────────── */
.fl {
  display: block;
  margin: 4px 0 -4px;
  font-family: var(--share);
  font-size: var(--fs-caption);
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--muted);
}

.inp.lg { width: 100%; }

.lk { display: flex; align-items: center; gap: 9px; font-size: var(--fs-small); }
.lk a { color: var(--dim2); cursor: pointer; }
.lk a:hover { color: var(--cyan); }
.lk a.reg { color: var(--cyan); }
.lk a.reg:hover { color: var(--green); }
.lk .sp { color: var(--border2); }

/* ── 中舱：节点磁贴 ───────────────────── */
.nodes {
  flex: none;
  width: 100%;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(130px, 1fr);
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.node {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 7px 10px 8px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--soft);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: .15s;
}

.node:hover:not(:disabled) { border-color: rgb(var(--cyan-rgb) / 50%); }
.node:disabled { cursor: default; }
.node.on { border-color: var(--cyan); background: rgb(var(--cyan-rgb) / 8%); box-shadow: inset 0 -2px 0 var(--cyan); color: var(--gray); }
.node:focus-visible { outline-offset: -2px; outline-color: var(--cyan); }
.node.empty { border-style: dashed; }
.node.empty:hover { border-color: var(--magenta); }

.nc { font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .16em; color: var(--muted); }
.node.on .nc { color: var(--cyan); }
.node b { max-width: 100%; font-weight: 400; font-size: var(--fs-body); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── 中舱：核心按钮 ───────────────────── */
.engage {
  height: 100%;
  max-width: 100%;
  aspect-ratio: 1;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 50%;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
}

.engage:disabled { cursor: default; }
.engage:focus-visible { outline: 2px solid var(--green); outline-offset: -8px; }
.engage:hover:not(:disabled) :deep(.hex) { fill: rgb(var(--rc-rgb) / 14%); }

.play { width: 26px; height: 26px; fill: var(--green); stroke: none; margin-bottom: 2px; filter: drop-shadow(0 0 8px rgb(var(--green-rgb) / 60%)); }
.en {
  font-family: var(--orbit);
  font-weight: 900;
  font-size: var(--fs-num-lg);
  line-height: 1;
  letter-spacing: .08em;
  color: var(--green);
  text-shadow: 0 0 18px rgb(var(--green-rgb) / 45%);
}

.zh { font-size: var(--fs-lead); color: var(--gray); }
.sv { max-width: 100%; margin-top: 4px; font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .12em; color: var(--cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.engage:disabled .play, .engage:disabled .en { opacity: 1; }
.center:has(.core.off) .play { fill: var(--muted); filter: none; }
.center:has(.core.off) .en { color: var(--muted); text-shadow: none; }

/* ── 右舱 ─────────────────────────────── */
.subid {
  margin-top: 8px;
  font-family: var(--orbit);
  font-size: var(--fs-num);
  line-height: 1.2;
  color: var(--gray);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subbtn {
  flex: none;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: 1px solid rgb(var(--magenta-rgb) / 40%);
  color: var(--magenta);
  font-family: var(--share);
  font-size: var(--btn-size);
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: .15s;
}

.subbtn:hover { background: rgb(var(--magenta-rgb) / 10%); border-color: var(--magenta); }
.subbtn:focus-visible { outline-color: var(--magenta); }
.subbtn .ico { width: 13px; height: 13px; }
</style>
