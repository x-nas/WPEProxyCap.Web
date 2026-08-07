<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { api, type ServerInfo, type NoticeInfo, type AppState } from '../api'
import noticeIcon from '../assets/Notice.png'
import ConfirmModal from './ConfirmModal.vue'

// 可插拔的 hero 背景图：把图片放到 assets/hero-bg.{jpg,jpeg,png,webp} 即自动启用；
// 没放时用纯深色渐变兜底。glob 在文件缺失时返回空对象，构建安全。
const heroBgFiles = import.meta.glob('../assets/hero-bg.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }) as Record<string, string>
const heroBg = Object.values(heroBgFiles)[0] ?? ''

const props = defineProps<{
  state: AppState | null
  servers: ServerInfo[]
  notices: NoticeInfo[]
}>()

const username = ref('')
const password = ref('')
const remember = ref(true)
const selectedId = ref<string>('')
const busy = ref(false)
const activeIndex = ref(0)

watch(() => props.state, (s) => {
  if (s) {
    username.value = s.userName ?? ''
    // 记住我：勾选时回填已存密码（对应原程序 txtPassWord.Text = Operate.PassWord）
    password.value = s.password ?? ''
    remember.value = s.rememberAccount
  }
}, { immediate: true })

// 有节点则默认选中第一个（对应原程序 GetSubscriberServerList 的 SelectedValue = lstServers[0]）。
// 订阅更新后服务器列表会被换成新订阅的节点（App.refreshAll → getServers）：
//   · 当前选中仍在新列表中 → 保持不变；
//   · 否则有节点 → 自动选中第一个并同步后端；无节点 → 清空回占位。
watch(() => props.servers, (list) => {
  if (list.some(s => s.serverId === selectedId.value)) return
  const first = list[0]
  if (first) { selectedId.value = first.serverId; api.selectServer(first.serverId) }
  else selectedId.value = ''
}, { immediate: true })

watch(() => props.notices, () => { activeIndex.value = 0 }, { immediate: true })

const selectedServer = computed(() => props.servers.find(s => s.serverId === selectedId.value) ?? null)
const activeNotice = computed(() => props.notices[activeIndex.value] ?? null)

const TAGS: Record<number, { text: string; color: string }> = {
  1: { text: '活动情报', color: 'sky' }, 2: { text: '维护说明', color: 'amber' },
  3: { text: '电竞赛事', color: 'emerald' }, 4: { text: '限时商城', color: 'purple' },
  5: { text: '玩家社区', color: 'sky' },
}
const tag = (t: number) => TAGS[t] ?? { text: '活动情报', color: 'sky' }

// 左侧列表用短标签（参考 HTML：活动/维护/赛事/商城/社区）
const SHORT_TAGS: Record<number, string> = { 1: '活动', 2: '维护', 3: '赛事', 4: '商城', 5: '社区' }
const shortTag = (t: number) => SHORT_TAGS[t] ?? '活动'

// 自定义下拉（替代原生 select，以便完全控制弹层的文字色/大小/悬浮·选中高亮）
const dropOpen = ref(false)
const selectWrap = ref<HTMLElement | null>(null)
const selectedServerName = computed(() => selectedServer.value?.serverName ?? '')

function toggleDrop() { dropOpen.value = !dropOpen.value }
async function chooseServer(id: string) {
  selectedId.value = id
  dropOpen.value = false
  await api.selectServer(id)
}
function onDocClick(e: MouseEvent) {
  if (selectWrap.value && !selectWrap.value.contains(e.target as Node)) dropOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))
// 记住我：勾选/取消时把最新账号推给 C# 内存缓冲（真正落盘在程序关闭时，对应原程序 FormClosing）
function onRemember(e: Event) {
  remember.value = (e.target as HTMLInputElement).checked
  persistAccount()
}
// 账号/密码变化时把最新值推入 C# 缓冲，保证关闭时能拿到当前账号（不落盘，落盘在关闭时按条件判断）
function persistAccount() {
  api.updateAccount(username.value.trim(), password.value.trim(), remember.value)
}

async function login() {
  if (!selectedServer.value) { message.error('无法获取服务器地址，请检查订阅设置是否正确'); return }
  busy.value = true
  try {
    const ok = await api.connect(username.value.trim(), password.value.trim())
    if (!ok) message.error('登录失败，请检查订阅设置与账号密码')
  } finally { busy.value = false }
}
function openUrl(url?: string) { if (url) api.openExternal(url) }

const confirmExitOpen = ref(false)

// 找回密码/立即注册：直接在系统浏览器中打开对应服务器配置的地址。
// 对应原程序 Operate.InitURLString：无 http(s):// 前缀则补 http://
function initUrl(u?: string) {
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : 'http://' + u
}
function openServerUrl(rawUrl?: string) {
  const url = initUrl(rawUrl)
  if (!selectedServer.value || !url) return   // 对应原程序 SelectServer==null / url 为空时直接 return
  api.openExternal(url)
}
</script>

<template>
  <div class="content">
    <!-- 左侧：公告列表 -->
    <aside class="sidebar">
      <div class="sb-head">
        <img class="sb-ic" :src="noticeIcon" alt="" />
        <span>最新动态</span>
      </div>
      <div class="notice-list">
        <div
          v-for="(n, i) in notices" :key="i"
          class="ni" :class="{ active: i === activeIndex }" @click="activeIndex = i">
          <span class="ni-tag" :class="tag(n.noticeType).color">{{ shortTag(n.noticeType) }}</span>
          <div class="ni-title">{{ n.noticeTitle }}</div>
          <div class="ni-date">{{ (n.noticeTime || '').slice(0, 10) }}</div>
        </div>
        <div v-if="!notices.length" class="ni-empty">暂无公告</div>
      </div>
    </aside>

    <!-- 右侧：hero -->
    <div class="hero">
      <div class="hero-bg">
        <img v-if="heroBg" :src="heroBg" class="hero-img" alt="" />
        <div class="hero-fade hero-fade-top" />
        <div class="hero-fade hero-fade-left" />
      </div>

      <!-- 公告详情（左） -->
      <div v-if="activeNotice" class="detail" :key="activeIndex">
        <span class="d-tag" :class="tag(activeNotice.noticeType).color">{{ tag(activeNotice.noticeType).text }}</span>
        <h2 class="d-title">{{ activeNotice.noticeTitle }}</h2>
        <div class="d-line" />
        <p class="d-desc">{{ activeNotice.noticeContent }}</p>
        <button v-if="activeNotice.noticeMore" class="d-more" @click="openUrl(activeNotice.noticeMore)">
          了解更多详情
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/></svg>
        </button>
      </div>

      <!-- 登录卡（右） -->
      <div class="login-card">
        <div class="lc-head">
          <h1>欢迎回来</h1>
          <p>选择你的战场，立即开始征程</p>
        </div>

        <label class="field-label">选择服务器</label>
        <div class="field" ref="selectWrap">
          <svg class="fi" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17,3A2,2 0 0,1 19,5V9A2,2 0 0,1 17,11H13V13H17A2,2 0 0,1 19,15V19A2,2 0 0,1 17,21H7A2,2 0 0,1 5,19V15A2,2 0 0,1 7,13H11V11H7A2,2 0 0,1 5,9V5A2,2 0 0,1 7,3H17M7,5V9H17V5H7M7,15V19H17V15H7M8,6H10V8H8V6M8,16H10V18H8V16Z"/></svg>
          <button type="button" class="input select-trigger" :class="{ placeholder: !selectedId, open: dropOpen }" @click="toggleDrop">
            {{ selectedServerName || '请选择服务器' }}
          </button>
          <svg class="fchev" :class="{ open: dropOpen }" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
          <ul v-if="dropOpen" class="select-menu">
            <li v-for="s in servers" :key="s.serverId"
                class="select-option" :class="{ selected: s.serverId === selectedId }"
                @click="chooseServer(s.serverId)">
              {{ s.serverName }}
            </li>
            <li v-if="!servers.length" class="select-empty">暂无服务器</li>
          </ul>
        </div>

        <label class="field-label">通行证账号</label>
        <div class="field">
          <svg class="fi" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z"/></svg>
          <input class="input" v-model="username" placeholder="请输入您的账号" @blur="persistAccount" />
        </div>

        <label class="field-label">安全密码</label>
        <div class="field">
          <svg class="fi" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 1a5 5 0 00-5 5v3H5v12h14V9h-2V6a5 5 0 00-5-5zm3 8H9V6a3 3 0 016 0z"/></svg>
          <input class="input" v-model="password" type="password" placeholder="请输入您的密码" @blur="persistAccount" @keyup.enter="login" />
        </div>

        <div class="btn-row">
          <button class="btn-login" :class="{ loading: busy }" :disabled="busy" @click="login">
            <svg v-if="!busy" class="btn-ic" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>
            {{ busy ? '正在连接…' : '立即登录' }}
          </button>
          <button class="btn-power" title="退出程序" @click="confirmExitOpen = true">
            <svg class="btn-ic" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13V3Z"/></svg>
          </button>
        </div>

        <div class="lc-foot">
          <label class="remember"><input type="checkbox" :checked="remember" @change="onRemember" /> 记住我的账号</label>
          <div class="links">
            <a @click="openServerUrl(selectedServer?.forgotURL)">找回密码</a>
            <span class="sep">|</span>
            <a class="reg" @click="openServerUrl(selectedServer?.registerURL)">立即注册</a>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model:open="confirmExitOpen"
      title="确定要退出程序吗？"
      message="退出后将断开与服务器的连接，请谨慎操作"
      confirm-text="确定"
      cancel-text="取消"
      @confirm="api.closeWindow()" />
  </div>
</template>

<style scoped>
.content { flex: 1; display: flex; overflow: hidden; z-index: 10; }

/* 侧栏 */
.sidebar { width: 320px; flex-shrink: 0; background: rgba(15,23,42,.5); border-right: 1px solid rgba(255,255,255,.05); display: flex; flex-direction: column; }
.sb-head { display: flex; align-items: center; gap: 8px; padding: 16px; border-bottom: 1px solid rgba(255,255,255,.05); font-size: 18px; font-weight: 600; }
.sky { color: #38bdf8; }
.sb-ic { width: 20px; height: 20px; object-fit: contain; display: block; }
.notice-list { flex: 1; overflow-y: auto; }
.ni { padding: 16px; cursor: pointer; border-left: 4px solid transparent; transition: all .15s; }
.ni:hover { background: rgba(255,255,255,.05); }
.ni.active { background: rgba(56,189,248,.1); border-left-color: #38bdf8; }
.ni.active:hover { background: rgba(255,255,255,.05); }
.ni-tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; margin-bottom: 4px; text-transform: uppercase; }
.ni-title { font-size: 14px; font-weight: 500; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.ni-date { font-size: 12px; color: #64748b; }
.ni-empty { height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; padding: 30px; text-align: center; color: #64748b; font-size: 13px; }

/* tag 配色 */
.sky   { }
.ni-tag.sky, .d-tag.sky       { background: rgba(56,189,248,.2); color: #38bdf8; }
.ni-tag.amber, .d-tag.amber   { background: rgba(245,158,11,.2); color: #fbbf24; }
.ni-tag.emerald, .d-tag.emerald { background: rgba(16,185,129,.2); color: #34d399; }
.ni-tag.purple, .d-tag.purple { background: rgba(168,85,247,.2); color: #c084fc; }

/* hero */
.hero { flex: 1; position: relative; overflow: hidden; }
/* 参考 HTML #main-bg：背景图(30% 透明 + 2px 模糊) + 两道由 #1e293b 淡出的渐变。
   无背景图时用深色渐变兜底。 */
.hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: linear-gradient(120deg, #0f172a 0%, #1e293b 55%, #0f172a 100%); }
.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .3; filter: blur(2px); }
.hero-fade { position: absolute; inset: 0; pointer-events: none; }
.hero-fade-top { background: linear-gradient(to top, #1e293b 0%, transparent 50%, transparent 100%); }
.hero-fade-left { background: linear-gradient(to right, #1e293b 0%, transparent 50%, transparent 100%); }

/* 公告详情 */
.detail { position: absolute; left: 48px; top: 80px; z-index: 10; max-width: 512px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; animation: fadeIn .5s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
.d-tag { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.d-title { font-size: 36px; font-weight: 800; color: #fff; line-height: 1.25; margin: 0; }
.d-line { width: 80px; height: 4px; background: #0ea5e9; border-radius: 999px; }
.d-desc { color: #cbd5e1; font-size: 14px; line-height: 1.625; margin: 0; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }
.d-more { display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1); border-radius: 999px; color: #e2e8f0; cursor: pointer; font-size: 14px; font-weight: 400; transition: all .3s cubic-bezier(.4,0,.2,1); }
.d-more:hover { background: rgba(255,255,255,.2); }

/* 登录卡 */
.login-card {
  /* 折中：圆角浮卡 + 上下留小边距（几乎顶满、又保留浮卡的圆角/阴影感），宽 400、右留 48px */
  position: absolute; top: 16px; right: 48px; bottom: 16px; z-index: 20; width: 400px;
  display: flex; flex-direction: column;
  background: rgba(15,23,42,.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 40px 32px 32px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,.5); animation: cardIn .5s cubic-bezier(.16,1,.3,1);
}
@keyframes cardIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
.lc-head { margin-bottom: 32px; }
.lc-head h1 { font-size: 30px; font-weight: 700; color: #fff; margin: 0 0 8px; }
.lc-head p { font-size: 14px; color: #94a3b8; margin: 0; }
.field-label { display: block; font-size: 12px; font-weight: 600; letter-spacing: .05em; color: #64748b; margin: 20px 0 8px; text-transform: uppercase; }
.field-label:first-of-type { margin-top: 0; }
.field { position: relative; }
.fi { position: absolute; left: 12px; top: 12px; color: #94a3b8; pointer-events: none; }
.fchev { position: absolute; right: 12px; top: 12px; color: #94a3b8; pointer-events: none; }
.input {
  width: 100%; height: 48px; background: rgba(2,6,23,.5); border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px; padding: 0 16px 0 40px; color: #e2e8f0; font-size: 16px; outline: none; transition: all .2s;
  appearance: none;
}
.input::placeholder { color: #475569; }
.input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14,165,233,.5); }

/* 自定义下拉：触发按钮（外观完全复用 .input，仅补按钮态） */
.field { position: relative; }
.select-trigger {
  display: flex; align-items: center; text-align: left; cursor: pointer;
  font-family: inherit; line-height: 48px;
}
.select-trigger.placeholder { color: #475569; }
.select-trigger.open { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14,165,233,.5); }
.fchev { transition: transform .2s; }
.fchev.open { transform: rotate(180deg); }

/* 弹出的选项列表：深色面板 + 主界面 slate/天蓝高亮 */
.select-menu {
  list-style: none; margin: 6px 0 0; padding: 6px;
  position: absolute; top: 100%; left: 0; right: 0; z-index: 30;
  background: #0f172a; border: 1px solid rgba(255,255,255,.1); border-radius: 12px;
  box-shadow: 0 20px 40px -12px rgba(0,0,0,.6);
  max-height: 240px; overflow-y: auto;
}
.select-option {
  padding: 11px 14px; border-radius: 8px; cursor: pointer;
  color: #e2e8f0; font-size: 15px; line-height: 1.4; transition: background .12s, color .12s;
}
.select-option:hover { background: rgba(56,189,248,.1); color: #38bdf8; }
.select-option.selected { background: rgba(56,189,248,.2); color: #38bdf8; font-weight: 600; }
.select-empty { padding: 14px; text-align: center; color: #64748b; font-size: 13px; }

.btn-row { display: flex; gap: 16px; margin-top: 28px; }
.btn-login { flex: 1; height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #0ea5e9; color: #fff; font-weight: 700; font-size: 16px; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 8px 20px rgba(14,165,233,.3); transition: all .2s; }
.btn-ic { flex-shrink: 0; }
.btn-login:hover:not(:disabled) { background: #38bdf8; transform: translateY(-4px); }
.btn-login:active:not(:disabled) { transform: scale(.95); }
.btn-login:disabled, .btn-login.loading { opacity: .7; cursor: default; }
.btn-power { width: 56px; height: 56px; background: #1e293b; color: #94a3b8; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; }
.btn-power:hover { background: #334155; color: #fff; }
.btn-power .btn-ic { transition: transform .2s; }
.btn-power:hover .btn-ic { transform: scale(1.1); }

.lc-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 28px; font-size: 12px; color: #64748b; }
.remember { display: flex; align-items: center; gap: 8px; cursor: pointer; transition: color .15s; }
.remember:hover { color: #cbd5e1; }
.remember input { accent-color: #0ea5e9; width: 16px; height: 16px; }
.links { display: flex; align-items: center; gap: 16px; }
.links a { color: #64748b; cursor: pointer; transition: color .15s; }
.links a:hover { color: #38bdf8; }
.links a.reg { color: #38bdf8; font-weight: 700; }
.links a.reg:hover { text-decoration: underline; }
.sep { color: #334155; }
</style>
