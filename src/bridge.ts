// JS 侧 JSON-RPC 客户端：封装与宿主的通信。
// call(method, args) → Promise<result>；on(event, cb) 订阅宿主主动推送。
//
// 两种宿主，报文完全一样：
//   请求 {id, method, args} · 应答 {type:'result', id, ok, result | error} · 推送 {type:'event', name, data}
//
//   Windows  WebView2     window.chrome.webview —— postMessage 直接传对象，收到的 e.data 也是对象
//   Android  系统 WebView  window.wpcNative —— 原生侧 WebViewCompat.addWebMessageListener 注入的对象，
//                         只对本地资源的来源（https://appassets.androidplatform.net）可见；
//                         它的 postMessage 只收字符串，所以两个方向都走 JSON 文本。
//
// ⚠️ Android 那边原生要先<b>收到过一条消息</b>才拿得到往回推的通道（JavaScriptReplyProxy），
//    所以一加载就发一条 __hello；在它之前产生的事件（日志之类）原生侧会先排着队。

type Pending = { resolve: (v: any) => void; reject: (e: any) => void }

interface Host {
  post(msg: object): void
  listen(cb: (msg: any) => void): void
  /** Android 需要先打个招呼，原生侧才能往回推事件 */
  hello?: boolean
}

function pickHost(): Host | null {
  const w = window as any

  const webview = w.chrome?.webview
  if (webview) {
    return {
      post: (m) => webview.postMessage(m),
      listen: (cb) => webview.addEventListener('message', (e: MessageEvent) => cb(e.data)),
    }
  }

  const native = w.wpcNative
  if (native) {
    return {
      post: (m) => native.postMessage(JSON.stringify(m)),
      listen: (cb) => native.addEventListener('message', (e: MessageEvent) => {
        try {
          cb(typeof e.data === 'string' ? JSON.parse(e.data) : e.data)
        } catch {
          console.warn('[bridge] 丢弃一条解析不了的宿主报文')
        }
      }),
      hello: true,
    }
  }

  return null
}

const host = pickHost()
const pending = new Map<string, Pending>()
const listeners = new Map<string, Set<(data: any) => void>>()
let seq = 0

/**
 * 在不在宿主里（WebView2 或 Android WebView）。
 *
 * 普通浏览器里打开（调试前端样式时）拿不到宿主对象，
 * 这时所有 call 都会 reject —— 界面该<b>显式说清楚</b>而不是到处弹「调用失败」。
 * App.vue / AppMobile.vue 用它出一句提示，与 WPE 的 bridge/index.ts 同一条口径。
 */
export const inHost = !!host

if (host) {
  host.listen((msg) => {
    if (msg?.type === 'result') {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      msg.ok ? p.resolve(msg.result) : p.reject(new Error(msg.error))
    } else if (msg?.type === 'event') {
      listeners.get(msg.name)?.forEach((cb) => cb(msg.data))
    }
  })

  if (host.hello) host.post({ id: '__hello', method: '__hello', args: {} })
}

/**
 * 一次调用最多等多久。最慢的是连接与安全验证（各自内部 5s 超时、串起来十几秒；
 * Android 上连接还要等用户在系统弹窗里同意 VPN 授权），
 * 120s 远在其上 —— 这道兜底只为「宿主那边异常没回应答」时别让调用方永远挂着。
 */
const CALL_TIMEOUT_MS = 120_000

export function call<T = any>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  // 仅在宿主内运行；普通浏览器里不支持桥调用。
  if (!host) return Promise.reject(new Error(`[bridge] 缺少宿主，无法调用 ${method}`))

  const id = `r${++seq}`
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`[bridge] ${method} 超时`))
    }, CALL_TIMEOUT_MS)
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v) },
      reject: (e) => { clearTimeout(timer); reject(e) },
    })
    host.post({ id, method, args })
  })
}

export function on(event: string, cb: (data: any) => void): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(cb)
  return () => listeners.get(event)!.delete(cb)
}
