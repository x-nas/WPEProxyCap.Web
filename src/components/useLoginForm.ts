/*
  主页登录卡的逻辑 —— Windows 的 MainView 与手机版的 MobileHome <b>共用这一份</b>。
  两边只是骨架不同（三舱横排 / 竖屏单列），账号记忆、节点选择、连接的规矩必须一模一样，
  抄两份迟早抄歪（WPE 那边「同名不同物」栽过五次）。
*/
import { computed, ref, watch } from 'vue'
import { api, type AppState, type ServerInfo } from '../api'
import { t, type Key } from '../i18n'
import { pushToast } from '../stores/toast'

export function useLoginForm(
  state: () => AppState | null,
  servers: () => ServerInfo[],
  /** 连接失败时换一句更具体的提示（手机版：没给 VPN 授权）。返回 null 用通用的「登录失败」 */
  failKey?: () => Key | null,
) {
  const username = ref('')
  const password = ref('')
  const remember = ref(true)
  const selectedId = ref<string>('')
  const busy = ref(false)

  watch(state, (s) => {
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
  watch(servers, (list) => {
    const keep = list.find((s) => s.serverId === selectedId.value) ?? list[0]
    selectedId.value = keep?.serverId ?? ''
    if (keep) api.selectServer(keep.serverId).catch(() => {})
  }, { immediate: true })

  const selectedServer = computed(() => servers().find((s) => s.serverId === selectedId.value) ?? null)

  const coreTone = computed<'busy' | 'idle' | 'off'>(() => (busy.value ? 'busy' : servers().length ? 'idle' : 'off'))

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
      if (!ok) pushToast('error', t(failKey?.() ?? 'msg.loginFail'))
    } catch {
      pushToast('error', t('msg.loginFail'))
    } finally { busy.value = false }
  }

  /**
   * 找回密码 / 立即注册：无 http(s):// 前缀则补 http://（对应原程序 Operate.InitURLString）。
   * ⚠️ 打不开时一定要出声（2026-09-15 用户报「点了没反应」）：还没有节点、节点没配这条链接、系统打不开链接，各给一句提示。
   */
  async function openServerUrl(rawUrl?: string): Promise<void> {
    if (!selectedServer.value) { pushToast('warning', t('mob.noNode')); return }
    const url = rawUrl?.trim()
    if (!url) { pushToast('warning', t('msg.noLink')); return }
    const ok = await api.openExternal(/^https?:\/\//i.test(url) ? url : 'http://' + url).catch(() => false)
    if (!ok) pushToast('error', t('msg.openFail'))
  }

  return {
    username, password, remember, selectedId, busy, selectedServer, coreTone,
    persistAccount, toggleRemember, chooseServer, login, openServerUrl,
  }
}
