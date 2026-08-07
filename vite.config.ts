import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

// 构建产物直接输出到 C# 项目的 wwwroot，随 Release 打包。
// base 用相对路径，配合 WebView2 的 https://app.wpeproxycap.local/ 虚拟主机加载。
export default defineConfig({
  plugins: [
    vue(),
    // ant-design-vue 按需自动引入（v4 用 cssinjs，运行时注入样式，故 importStyle:false）
    Components({
      resolvers: [AntDesignVueResolver({ importStyle: false, resolveIcons: true })],
      dts: false,
    }),
  ],
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
