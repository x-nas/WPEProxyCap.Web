<script setup lang="ts">
/*
  主页（方案 A · REACTOR，2026-09-13 整屏重做）。

  三舱对称 + 底部情报带：
    左 AUTH        账号 / 密码 / 记住我 / 找回密码·注册
    中 CORE        节点磁贴 + 反应堆核心（核心本身就是连接按钮）
    右 SUBSCRIPTION 订阅号 / 更新时间 / 订阅服务器状态 / 节点数 / 订阅设置
    底 INTEL       公告列表 + 详情（IntelBand，控制中心也用它）

  连上之后 ControlCenter 用<b>同一副骨架</b>：左舱变遥测、右舱变动作、核心变计时表。

  【与手机版共用】登录逻辑在 useLoginForm.ts、零件样式在 home.css（2026-09-14 拆出来），
  手机版的 mobile/MobileHome.vue 用的是同一份，这里只剩三舱骨架。

  ⚠️ 英文代号（AUTH / ENGAGE / NODE 01…）刻意保持字面量不进字典，
  与 WPE 启动页的 Mode 01 / Ready 同一条口径；给用户读的中文全部走 i18n。
*/
import type { ServerInfo, NoticeInfo, AppState } from '../api'
import { t } from '../i18n'
import ReactorCore from './ReactorCore.vue'
import IntelBand from './IntelBand.vue'
import { useLoginForm } from './useLoginForm'

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

const {
  username, password, remember, selectedId, busy, selectedServer, coreTone,
  persistAccount, toggleRemember, chooseServer, login, openServerUrl,
} = useLoginForm(() => props.state, () => props.servers)

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
    <!-- off 类：没有节点时核心压灰（以前用 :has() 判，手机 WebView 不一定支持，见 home.css） -->
    <section class="center" :class="{ off: coreTone === 'off' }">
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

<!-- 骨架与 ControlCenter 共用；零件与手机版 MobileHome 共用。用 src 引入才会带上 scoped（@import 进来的规则会漏成全局） -->
<style scoped src="./reactor.css"></style>
<style scoped src="./home.css"></style>
