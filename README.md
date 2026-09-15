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
- 两边共用：`api.ts`、`bridge.ts`、i18n（七种语言）、主题、`ReactorCore`、`Sparkline`、系统日志 / 安全验证 / 协议等弹窗；
  登录与控制中心的逻辑在 `components/useLoginForm.ts`、`components/useControlPanel.ts`。
- Windows 专属：`MainView.vue` / `ControlCenter.vue` 的三舱骨架，样式在 `components/home.css`、`components/control.css`。
- Android 专属：`components/mobile/`（引导、四个标签页、底部弹层、卡片式系统日志等），零件样式在 `components/mobile/mobile.css`（`m-` 前缀）；
  手机专属的全局覆盖一律写在 `style.css` 末尾的 `html[data-platform="android"]` 下。

## 手机版界面

- 没有订阅号时先进引导（只填订阅号）；之后是四个标签：加速 · 节点 · 消息 · 我的。账号密码在加速页上填，有节点后才显示账号卡。
- 加速页与「我的」页尽量一屏放下：加速页外层定高，核心按理想高度排、放不下时才收缩（最小 110px），高屏上不拉伸；「我的」页行高 40、没有分组标题。
  高度实在不够（横屏手机）才整页滚动；宽度 ≥ 600 换成左侧导航栏，≥ 840 分两栏。
- 更换订阅号在「节点」页顶部那一行（加速页只在没有节点时才有「设置订阅」，所以这一行不能删）；分应用代理在加速页（未连接时）；版本、内核、系统、机型、WebView 在「我的 → 系统信息」。
- 「选一项 / 填几个字 / 确认一下」都用 `BottomSheet.vue`，登记进 `useModal`，系统返回键先关最上层；键盘焦点困在最上层弹窗里靠 `src/focusTrap.ts`（老版 System WebView 不认 `inert`）。

## 桥

报文两边一样：请求 `{id, method, args}`，应答 `{type:'result', id, ok, result|error}`，推送 `{type:'event', name, data}`。

- Windows：`window.chrome.webview`（传对象）。
- Android：`window.wpcNative`，原生侧 `WebViewCompat.addWebMessageListener` 注入，只对本地资源来源可见，收发 JSON 文本；页面一加载先发 `__hello`。

Android 独有的方法（`getPlatformInfo`、`getApps`、`getAppProxy`、`setAppProxy`、`requestIgnoreBattery`、`testServerDelays`）和事件（`connectError`、`resume`、`rulesNoProxy`）定义在 `api.ts` 末尾。

**安全验证只传代码**：`verifyProxy` 返回 `{success, error, code}`，事件 `verifyProgress` 发 `server / handshake / auth / device`；`VerifyModal.vue` 的 `RESULT` / `PROGRESS` 表翻成 `vf.r.*` / `vf.p.*`，认不出的代码原样显示 `error`（兼容老版本宿主）。Windows（`ProxyService.VerifyProxyAsync`）与 Android（`ProxyService.verifyProxy`）的代码表必须一致。

## 开发与截图

```bash
npm install
npm run dev
```

打开 `http://localhost:5173/dev-probe.html`，它带一个假宿主。常用参数：

- `?view=cc`（已连接）、`?theme=light`、`?lang=en|tw|ja|ko|vi|ru`、`?empty=1`、`?auto=set|sub|log|verify|cut`
- `?platform=android`：切成手机版（假宿主换成 `window.wpcNative`），另有：
  - `&battery=ok`（后台运行不受限）、`&apps=sel`（分应用代理预选 3 个）、`&tab=nodes|inbox|me`
  - `&onboard=1`（没有订阅号：引导）、`&onboard=2`（有订阅号没账号）、`&rules=none`（节点在手机上无代理规则）、`&nodes=0`（有订阅号但没有节点）
  - `&auto=nodes|account|apps|rules|verify|cut|sub|log|info|theme|lang`：`sub` 配 `&tab=nodes`，`log / info / theme / lang` 配 `&tab=me`

⚠️ 手机版截图请用浏览器的设备模拟（390×844 等），或把探针页放进 390×844 的 iframe、用无头 Edge 按 2 倍截图再裁剪；不要直接给无头 Edge 设 `--window-size`：它有最小宽度，截出来的图会被裁掉右边。

## 守门

```bash
npx vue-tsc -b
node tools/check-font-sizes.mjs
```

- 字号只许 `var(--fs-*)`，例外写在 `tools/check-font-sizes.mjs` 的白名单里。
- Android 的 System WebView 可能较老：JS 语法降到 Chrome 87；手机专属的样式不许用 `:has()`、`color-mix()`。

## 许可证

MIT。Android 客户端整体按 GPL-3.0 分发，MIT 代码可以被它包含。
