import { createApp } from 'vue'
import App from './App.vue'
import AppMobile from './AppMobile.vue'
import './style.css'
import { installTooltip } from './tooltip'
import { isAndroid, PLATFORM } from './platform'

/*
  ⚠️ 这里<b>只 import 一次 style.css</b>，而且排在根组件<b>之后</b>。

  顺序是有讲究的：打包产物里组件的 scoped 样式在前、style.css 在后，
  于是<b>特异度相同时 style.css 赢</b>（.list-page .head 与 .head[data-v-x] 都是 (0,2,0)）。
  要在某一屏覆盖共用件，得提高特异度，照着写一条同名规则是不管用的。
  WPE 那边的 main.ts 也是这个顺序，探针页曾经反过来写，结果「探针页与真程序渲染不一样、
  且不报错」—— 别改。

  【两个根组件】Windows 是 App.vue（无边框窗口：自绘标题栏 + 三舱 REACTOR），
  Android 是 AppMobile.vue（竖屏单列）。两者共用 api / 桥 / i18n / 主题 / 弹窗与反应堆核心，
  只有骨架不同。生产包里 isAndroid 是字面量，另一个根组件会被摇树摇掉。
*/

// 平台写在 <html> 上：style.css 里手机专属的覆盖都挂在 [data-platform="android"] 下，
// 弹窗 Teleport 到 body 也照样吃得到
document.documentElement.dataset.platform = PLATFORM

// 接管原生 title（与 WPE x64 同一份 tooltip.ts）。触屏上没有「悬停」：点一下弹出来的提示会压在按钮上，
// 所以 Android 不装，那边的图标按钮一律有 aria-label
if (!isAndroid) installTooltip()

createApp(isAndroid ? AppMobile : App).mount('#app')
