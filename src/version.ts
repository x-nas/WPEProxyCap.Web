// 前端与 C# 客户端的「版本门槛」配置。
//
// 场景：Vue 前端集中托管、可随时更新；而 C# 客户端(exe)由用户各自安装、可能滞后。
// 当某次前端更新依赖了「新版 C# 才有的桥能力」时，把 MIN_CLIENT_VERSION 提升到那个 C# 版本，
// 低于此版本的旧客户端打开本前端会被拦截，提示更新，避免调用不存在的桥方法而报错。
//
// 维护约定：
//  · 只改前端、不依赖新 C# 能力 → 不用动这里。
//  · 前端开始依赖新 C# 契约 → 把 MIN_CLIENT_VERSION 设为对应的 C# <Version>。
//  · 客户端版本来自 getState().version（即 C# csproj 的 <Version>，格式 主.次.修订）。

/** 使用本前端所需的最低 C# 客户端版本（含）。低于此版本将被拦截要求更新。 */
export const MIN_CLIENT_VERSION = '1.0.1'

/** 客户端下载地址（拦截提示里的「下载最新版本」按钮打开）。TODO：换成真实下载页。 */
export const CLIENT_DOWNLOAD_URL = 'https://www.wpe64.com/downloads.html'

/** 比较版本号 a、b（"主.次.修订"）：a<b 返回 -1，a>b 返回 1，相等返回 0。缺失段按 0 处理。 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

/** 当前客户端版本是否低于门槛（需要更新）。读不到版本时返回 false（fail-open，不误锁正常用户）。 */
export function isClientOutdated(current: string | null | undefined): boolean {
  if (!current) return false
  return compareVersion(current, MIN_CLIENT_VERSION) < 0
}
