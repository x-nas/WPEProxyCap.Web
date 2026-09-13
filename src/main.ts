import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { installTooltip } from './tooltip'

/*
  ⚠️ 这里<b>只 import 一次 style.css</b>，而且排在 App.vue <b>之后</b>。

  顺序是有讲究的：打包产物里组件的 scoped 样式在前、style.css 在后，
  于是<b>特异度相同时 style.css 赢</b>（.list-page .head 与 .head[data-v-x] 都是 (0,2,0)）。
  要在某一屏覆盖共用件，得提高特异度，照着写一条同名规则是不管用的。
  WPE 那边的 main.ts 也是这个顺序，探针页曾经反过来写，结果「探针页与真程序渲染不一样、
  且不报错」—— 别改。

  ant-design-vue 已于 2026-09-12 整个去掉：所有弹窗 / 下拉 / 表 / 提示都换成了自绘件
  （CyberModal · CyberSelect · CyberConfirm · ToastStack），
  连带 unplugin-vue-components 与那份 reset.css 一起删了。
*/

//接管原生 title，与 WPE x64 同一份 tooltip.ts：调用点照写 title="…"，全局换成自绘提示（2026-09-13）
installTooltip()

createApp(App).mount('#app')
