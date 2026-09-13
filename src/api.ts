// 类型化的桥接封装：把 bridge.call() 包成语义方法，组件里直接用。
//
// ⚠️ 语言与主题<b>不走这里</b>：它们各自在 i18n.ts / stores/theme.ts 里直接 call
// （'setLanguage' / 'setAppearance'），与 WPE x64 同一条路数 —— 那两个模块自带
// 「先改本地、再推 C#、失败只是这次没记住」的语义，包一层反而把它藏起来了。
import { call } from './bridge'

export interface ServerInfo {
  serverId: string
  serverName: string
  serverIP: string
  serverPort: number
  forgotURL: string
  registerURL: string
  verifyURL: string
}

export interface NoticeInfo {
  noticeType: number
  noticeTitle: string
  noticeContent: string
  noticeMore: string
  noticeTime: string
}

export interface LiveStats {
  upKBps: number
  downKBps: number
  memoryMB: number
  delayMs: number
  onlineTime: string
  todayOnlineSeconds: number
  healthProgress: number
}

export interface AppState {
  version: string
  isConnected: boolean
  subscriberName: string | null
  subscriberTime: string | null
  selectedServerId: string | null
  userName: string | null
  password: string | null
  rememberAccount: boolean

  // ── 界面偏好（2026-09-12 加）──────────────────────────────
  // 与 WPE x64 的 getSystemCheck 同一条口径：<b>跟着首屏那一次往返一起带回来</b>，
  // 不为它们单开一次 getPrefs —— 语言与主题必须在<b>任何像素画出来之前</b>定好，
  // 否则英文用户会先看见一帧中文、浅色用户会先闪一下深色。
  /** BCP-47 文化名，如 zh-CN / en-US。认不出来的由前端 normalize 回简体 */
  language: string
  /** 用户选的那一档：dark | light | system */
  themeMode: string
  /** 解析后的实际主题。跟随系统时存的是上次解析出来的值 */
  isDark: boolean
  /** 氛围层那条游走亮带开不开 */
  scanLine: boolean
}

export interface LogItem {
  type: number // 0 Info 1 Warning 2 Error 3 Debug
  logTime: string
  logName: string
  logContent: string
}

export interface VerifyResult {
  success: boolean
  error: string
}

export const api = {
  getState: () => call<AppState>('getState'),
  checkWpeServer: () => call<string>('checkWpeServer'),        // online/slow/lag/offline
  checkSubscriberServer: () => call<number>('checkSubscriberServer'), // ms, -1=不通
  getServers: () => call<ServerInfo[]>('getServers'),
  getNotices: () => call<NoticeInfo[]>('getNotices'),
  getMihomoVersion: () => call<string>('getMihomoVersion'),
  getOsVersion: () => call<string>('getOsVersion'),
  readAgreement: (type: 'UserAgreement' | 'PrivacyPolicy') => call<string>('readAgreement', { type }),

  // 返回状态码：'ok'=成功 | 'empty'=订阅号为空 | 'network'=无法连接订阅服务器 | 'invalid'=订阅号不存在或已过期
  setSubscriber: (name: string) =>
    call<'ok' | 'empty' | 'network' | 'invalid'>('setSubscriber', { name }),
  updateAccount: (username: string, password: string, remember: boolean) => call<boolean>('updateAccount', { username, password, remember }),
  selectServer: (serverId: string) => call<boolean>('selectServer', { serverId }),
  connect: (username: string, password: string) => call<boolean>('connect', { username, password }),
  disconnect: () => call<boolean>('disconnect'),
  verifyProxy: () => call<VerifyResult>('verifyProxy'),
  pauseOnlineTime: () => call<boolean>('pauseOnlineTime'),
  resumeOnlineTime: () => call<boolean>('resumeOnlineTime'),
  openExternal: (url: string) => call<boolean>('openExternal', { url }),
  closeWindow: () => call<boolean>('closeWindow'),
  minimizeWindow: () => call<boolean>('minimizeWindow'),
  toggleMaximize: () => call<{ maximized: boolean }>('toggleMaximize'),
  startDragWindow: () => call<boolean>('startDragWindow'),

  /**
   * 窗口保持最前。
   *
   * ⚠️ <b>状态以 C# 回的为准</b>，不是本地先翻再发：置顶是 Windows 说了算的，
   * 极少数情况下（全屏独占的程序）设了也不生效，那时按钮该照实显示。
   * 同样<b>不落盘</b> —— 它是个运行期的窗体属性，重启回到不置顶。
   */
  setTopMost: (on: boolean) => call<{ topMost: boolean }>('setTopMost', { on }),
}
