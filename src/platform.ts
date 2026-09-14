/*
  当前宿主平台：windows（WebView2 外壳）| android（WPEProxyCap.Android 的系统 WebView）。

  构建期由 vite.config.ts 的 define 写死（vite build --mode windows / android），
  生产包里这就是一个字面量，另一个平台的根组件会被摇树摇掉。
  开发期（vite dev）探针页可以用 ?platform=android 临时切成手机版，同一个 dev server 截两套图。
*/
export type Platform = 'windows' | 'android'

function fromQuery(): Platform | null {
  try {
    const q = new URLSearchParams(location.search).get('platform')
    return q === 'android' || q === 'windows' ? q : null
  } catch {
    return null
  }
}

export const PLATFORM: Platform = import.meta.env.DEV ? (fromQuery() ?? __PLATFORM__) : __PLATFORM__

export const isAndroid = PLATFORM === 'android'
