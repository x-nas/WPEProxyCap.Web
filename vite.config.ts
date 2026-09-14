import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/*
  一份前端，两个宿主（2026-09-14 从 WPEProxyCap 仓库拆出来之后）：

    vite build --mode windows → dist/windows   Windows 版 WPEProxyCap（WebView2）
                                               由 WPEProxyCap/publish.ps1 镜像进 App/wwwroot
    vite build --mode android → dist/android   WPEProxyCap.Android（系统 WebView）
                                               由 WPEProxyCap.Android/tools/sync-web.ps1 镜像进 app/src/main/assets/www

  平台在构建期写死成 __PLATFORM__（见 src/platform.ts）；开发期探针页可以用 ?platform=android 临时切换，
  同一个 dev server 就能截两套界面。

  base 用相对路径：WebView2 走 https://app.wpeproxycap.local/，Android 走 WebViewAssetLoader 的
  https://appassets.androidplatform.net/assets/www/。

  ⚠️ Android 的 System WebView 不一定是新版：没有 Google 服务的机器由厂商推送更新，老机可能停在很旧的 Chromium。
  所以 android 那份把 JS 语法降到 Chrome 87（原生侧另有版本门槛，低于门槛显示引导更新页）。
  CSS 不会被降级 —— 手机专属的样式不许用 :has() / color-mix()，共用件里用到的都带了回退。
*/
export default defineConfig(({ mode }) => {
  const platform = mode === 'android' ? 'android' : 'windows'

  return {
    plugins: [vue()],
    base: './',
    define: {
      __PLATFORM__: JSON.stringify(platform),
    },
    build: {
      outDir: `dist/${platform}`,
      emptyOutDir: true,
      chunkSizeWarningLimit: 1500, // 本地加载，放宽体积告警
      target: platform === 'android' ? ['chrome87'] : 'modules',
    },
    server: {
      port: 5173,
      strictPort: true, // 端口固定，WPEProxyCap 的 ShellForm 在 DEBUG 下写死了它
    },
  }
})
