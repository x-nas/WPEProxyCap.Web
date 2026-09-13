import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 构建产物直接输出到 C# 项目的 wwwroot，随 Release 打包。
// base 用相对路径，配合 WebView2 的 https://app.wpeproxycap.local/ 虚拟主机加载。
//
// ⚠️ 2026-09-12 去掉了 unplugin-vue-components + AntDesignVueResolver ——
// 界面已全部自绘，一个 antd 组件都不用了。
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: '../App/wwwroot',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500, // 本地加载，放宽体积告警
  },
  server: {
    port: 5173,
    strictPort: true, // 端口固定，ShellForm 的 DEBUG 分支写死了它
  },
})
