// 轻提示的队列 —— 取代 ant-design-vue 的 message。
//
// 【为什么不用 a-message】它自带一整套浅色圆角胶囊，在这套深色赛博皮肤里像从别的
// 程序飞过来的；而且固定顶部居中，正好压在自绘标题栏的拖动区上 —— 提示一出来就拖不动窗口。
// 覆盖它的样式要跟 :deep + 内部类名较劲，还得盯着版本升级，自己画一个反而更短。
//
// 与 WPE x64 的 stores/toast.ts 逐条一致（同一个 MAX、同一套停留时长）。

import { ref } from 'vue'

export type ToastLevel = 'success' | 'info' | 'warning' | 'error'

export interface ToastItem {
  id: number
  level: ToastLevel
  /** 有标题的排版不同、停留也久一些 */
  title?: string
  text: string
}

/**
 * 同屏最多几条。超出就把最老的挤掉 —— 失败重试之类的场景可能一次来好几条，
 * 堆满整屏比丢掉几条更糟。
 */
const MAX = 5

export const toasts = ref<ToastItem[]>([])

let seq = 0

export function pushToast(level: ToastLevel, text: string, title?: string): void {
  if (!text && !title) return

  const id = ++seq
  const next = [...toasts.value, { id, level, title, text }]

  toasts.value = next.length > MAX ? next.slice(next.length - MAX) : next

  // 带标题的信息量大，多留一会儿；纯文本的一眼扫完就够
  window.setTimeout(() => dismissToast(id), title ? 6000 : 4000)
}

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((x) => x.id !== id)
}
