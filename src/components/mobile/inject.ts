import type { InjectionKey } from 'vue'
import type { useLoginForm } from '../useLoginForm'

/*
  手机版的登录表单只建<b>一份</b>（AppMobile.vue），四个页面与账号弹层共用：
  「加速」页用它连接、「节点」页用它选节点、「我的」与引导页改账号 —— 各建一份的话，
  一边改了账号另一边还是旧值，而 useLoginForm 的节点 watch 也会各自调一遍 selectServer。
*/
export const LOGIN: InjectionKey<ReturnType<typeof useLoginForm>> = Symbol('wpc-login')
