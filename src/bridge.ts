// JS 侧 JSON-RPC 客户端：封装与 C# WebBridge 的通信。
// call(method, args) → Promise<result>；on(event, cb) 订阅 C# 主动推送。

type Pending = { resolve: (v: any) => void; reject: (e: any) => void }

const webview = (window as any).chrome?.webview
const pending = new Map<string, Pending>()
const listeners = new Map<string, Set<(data: any) => void>>()
let seq = 0

/**
 * 在不在 WebView2 宿主里。
 *
 * 普通浏览器里打开（调试前端样式时）拿不到 window.chrome.webview，
 * 这时所有 call 都会 reject —— 界面该<b>显式说清楚</b>而不是到处弹「调用失败」。
 * App.vue 用它出一句提示，与 WPE 的 bridge/index.ts 同一条口径。
 */
export const inHost = !!webview

if (webview) {
  webview.addEventListener('message', (e: MessageEvent) => {
    const msg = e.data
    if (msg?.type === 'result') {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      msg.ok ? p.resolve(msg.result) : p.reject(new Error(msg.error))
    } else if (msg?.type === 'event') {
      listeners.get(msg.name)?.forEach((cb) => cb(msg.data))
    }
  })
}

export function call<T = any>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  // 仅在 WebView2 宿主内运行；非宿主环境（如普通浏览器）不支持桥调用。
  if (!webview) return Promise.reject(new Error(`[bridge] 缺少 WebView2 宿主，无法调用 ${method}`))

  const id = `r${++seq}`
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    webview.postMessage({ id, method, args })
  })
}

export function on(event: string, cb: (data: any) => void): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(cb)
  return () => listeners.get(event)!.delete(cb)
}
