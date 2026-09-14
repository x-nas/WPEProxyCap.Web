# WPEProxyCap.Web

WPE Proxy Cap（WPC）的界面前端，Vue 3 + TypeScript + Vite。**Windows 版与 Android 版共用这一份。**

| 客户端 | 仓库 | 宿主 | 构建命令 | 产物 |
|---|---|---|---|---|
| Windows | WPEProxyCap（私有） | WebView2 | `npm run build:windows` | `dist/windows`，由 `publish.ps1` 镜像进 `App/wwwroot` |
| Android | WPEProxyCap.Android（GPL-3.0） | 系统 WebView | `npm run build:android` | `dist/android`，由 `tools/sync-web.ps1` 镜像进 `app/src/main/assets/www` |

三个仓库要在同一个父目录下并排检出：`WPEProxyCap/`、`WPEProxyCap.Web/`、`WPEProxyCap.Android/`。

## 平台怎么分

- 构建期由 `vite.config.ts` 的 `define` 写死 `__PLATFORM__`，业务代码读 `src/platform.ts` 的 `PLATFORM` / `isAndroid`。
- 根组件：Windows 是 `App.vue`（无边框窗口、三舱横排），Android 是 `AppMobile.vue`（竖屏单列）。
- 两边共用：`api.ts`、`bridge.ts`、i18n（七种语言）、主题、所有弹窗、`ReactorCore`、`IntelBand`；
  登录与控制中心的逻辑在 `components/useLoginForm.ts`、`components/useControlPanel.ts`，
  零件样式在 `components/home.css`、`components/control.css`。
- 手机专属的全局覆盖一律写在 `style.css` 末尾的 `html[data-platform="android"]` 下。

## 桥

报文两边一样：请求 `{id, method, args}`，应答 `{type:'result', id, ok, result|error}`，推送 `{type:'event', name, data}`。

- Windows：`window.chrome.webview`（传对象）。
- Android：`window.wpcNative`，原生侧 `WebViewCompat.addWebMessageListener` 注入，只对本地资源来源可见，收发 JSON 文本；页面一加载先发 `__hello`。

Android 独有的方法（`getPlatformInfo`、`getApps`、`getAppProxy`、`setAppProxy`、`requestIgnoreBattery`）和事件（`connectError`、`resume`）定义在 `api.ts` 末尾。

## 开发与截图

```bash
npm install
npm run dev
```

打开 `http://localhost:5173/dev-probe.html`，它带一个假宿主。常用参数：

- `?view=cc`（已连接）、`?theme=light`、`?lang=en|tw|ja|ko|vi|ru`、`?empty=1`
- `?platform=android`：切成手机版（假宿主换成 `window.wpcNative`）；配合 `&battery=ok`、`&apps=sel`
- `?auto=set|sub|log|verify|cut`，手机版另有 `apps`

⚠️ 手机版截图请用浏览器的设备模拟（390×844 等），不要用无头 Edge 的 `--window-size`：它有最小宽度，截出来的图会被裁掉右边。

## 守门

```bash
npx vue-tsc -b
node tools/check-font-sizes.mjs
```

- 字号只许 `var(--fs-*)`，例外写在 `tools/check-font-sizes.mjs` 的白名单里。
- Android 的 System WebView 可能较老：JS 语法降到 Chrome 87；手机专属的样式不许用 `:has()`、`color-mix()`。

## 许可证

MIT。Android 客户端整体按 GPL-3.0 分发，MIT 代码可以被它包含。
