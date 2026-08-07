// 类型化的桥接封装：把 bridge.call() 包成语义方法，组件里直接用。
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

  setSubscriber: (name: string) => call<boolean>('setSubscriber', { name }),
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
  startDragWindow: () => call<boolean>('startDragWindow'),
  hideWindow: () => call<boolean>('hideWindow'),   // 隐藏界面但保留代理
}
