/*
  页内层级的「返回」—— 手机版专用（2026-09-15）。

  系统返回键的顺序（AppMobile.vue 的 onBack）：
    ① 关掉最上面的弹窗 / 底部弹层（useModal 的 closeTopModal）；
    ② 退一层页内层级（这里：消息详情、引导的第二步这类<b>不遮挡外壳</b>的层级）；
    ③ 不在「加速」页时回到「加速」页；
    ④ 都没有才交还给系统（原生侧把应用退到后台，VPN 照常跑）。

  ⚠️ 页内层级不能走 useModal：登记进模态栈会让外壳整块 inert，而详情页本身就在外壳里。
*/
const stack: Array<() => void> = []

/** 登记一层；返回撤销函数 —— 用户点页面上的「返回」自己关掉时要调它，否则下一次返回键会去关一个已经没了的层级。 */
export function pushBack(close: () => void): () => void {
  stack.push(close)
  return () => {
    const i = stack.lastIndexOf(close)
    if (i >= 0) stack.splice(i, 1)
  }
}

/** 退一层。返回 true 表示返回键被消费掉了。 */
export function popBack(): boolean {
  const close = stack.pop()
  if (!close) return false
  close()
  return true
}
