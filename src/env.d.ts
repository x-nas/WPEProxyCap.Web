/// <reference types="vite/client" />

/** 构建期平台，由 vite.config.ts 的 define 注入。业务代码请用 src/platform.ts 的 PLATFORM / isAndroid。 */
declare const __PLATFORM__: 'windows' | 'android'
