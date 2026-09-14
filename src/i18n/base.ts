// 界面文案的<b>基准表</b>：简体中文 + English 同键成对。
//
// 其余五种语言各一份 i18n/<code>.ts，都声明成 Record<Key, string> ——
// 往这里加一个键，五份译文当场编译不过（vue-tsc），
// 不会出现「加了功能、某几种语言是空白」的界面。
//
// 【键的命名】按屏 / 按区分组，前缀就是它出现的地方：
//   win.*   窗口按钮与标题栏      foot.*  底部状态栏
//   home.*  主页（公告 + 登录卡）  cc.*    控制中心（已连接之后那一屏）
//   sub.*   订阅设置弹窗          log.*   系统日志弹窗
//   vf.*    安全验证弹窗          set.*   软件设置弹窗
//   dlg.*   通用弹窗的按钮        nt.*    公告类型
//   msg.*   提示 / 错误
//
// ⚠️ 带 {0} {1} 的是占位符，调用点用 .replace('{0}', …) 填 ——
// 不做成模板函数是为了让五份译文里那些占位符<b>肉眼可查</b>。

export const DICT = {
  // ── 窗口 / 标题栏 ───────────────────────────────────────
  'win.set': { zh: '软件设置', en: 'Preferences' },
  'win.sub': { zh: '订阅设置', en: 'Subscription' },
  'win.log': { zh: '系统日志', en: 'System Log' },
  'win.min': { zh: '最小化', en: 'Minimize' },
  'win.max': { zh: '最大化', en: 'Maximize' },
  'win.restore': { zh: '还原', en: 'Restore' },
  'win.close': { zh: '退出', en: 'Exit' },
  'win.pin': { zh: '窗口保持最前', en: 'Always on Top' },
  'win.unpin': { zh: '取消保持最前', en: 'Cancel Always on Top' },
  'win.nohost': { zh: '这个页面要在 WPE Proxy Cap 里打开才能工作。', en: 'This page only works inside WPE Proxy Cap.' },

  // 订阅服务器的连通性（checkWpeServer 的四种返回）
  'win.subsrv': { zh: '订阅服务器', en: 'Subscription Server' },
  'win.net.online': { zh: '流畅', en: 'Good' },
  'win.net.slow': { zh: '一般', en: 'Fair' },
  'win.net.lag': { zh: '卡顿', en: 'Poor' },
  'win.net.offline': { zh: '不在线', en: 'Offline' },
  'win.net.checking': { zh: '检测中', en: 'Checking' },

  // ── 底部状态栏 ─────────────────────────────────────────
  'foot.agreement': { zh: '用户协议', en: 'Terms of Use' },
  'foot.privacy': { zh: '隐私政策', en: 'Privacy Policy' },
  'foot.site': { zh: '访问 WPE 官方网站', en: 'Visit the WPE website' },
  'foot.server': { zh: '当前服务器', en: 'Server' },
  'foot.unreachable': { zh: '未连通', en: 'Unreachable' },
  'foot.tutorial': { zh: '使用教程', en: 'Tutorial' },

  // ── 主页：公告栏 ───────────────────────────────────────
  'home.news': { zh: '最新动态', en: 'Latest News' },
  'home.noNews': { zh: '暂无公告', en: 'No announcements' },
  'home.more': { zh: '了解更多详情', en: 'Read more' },

  // ── 主页：登录卡 ───────────────────────────────────────
  'home.welcome': { zh: '欢迎回来', en: 'Welcome Back' },
  'home.server': { zh: '选择服务器', en: 'Server' },
  'home.noServer': { zh: '暂无服务器', en: 'No servers' },
  'home.account': { zh: '通行证账号', en: 'Account' },
  'home.accountPh': { zh: '请输入您的账号', en: 'Enter your account' },
  'home.password': { zh: '安全密码', en: 'Password' },
  'home.passwordPh': { zh: '请输入您的密码', en: 'Enter your password' },
  'home.login': { zh: '立即登录', en: 'Connect' },
  'home.connecting': { zh: '正在连接…', en: 'Connecting…' },
  'home.remember': { zh: '记住我的账号', en: 'Remember me' },
  'home.forgot': { zh: '找回密码', en: 'Forgot password' },
  'home.register': { zh: '立即注册', en: 'Sign up' },

  // ── 控制中心 ───────────────────────────────────────────
  'cc.connected': { zh: '已连接', en: 'Connected' },
  'cc.disconnected': { zh: '已断开', en: 'Disconnected' },
  'cc.session': { zh: '本次游戏在线时长', en: 'Session Time' },
  'cc.pause': { zh: '暂停计时', en: 'Pause timer' },
  'cc.resume': { zh: '继续计时', en: 'Resume timer' },
  'cc.paused': { zh: '计时已暂停', en: 'Timer paused' },
  'cc.tapPause': { zh: '点击核心暂停', en: 'Tap core to pause' },
  'cc.tapResume': { zh: '已暂停 · 点击继续', en: 'Paused · tap to resume' },
  'cc.today': { zh: '今日累计在线', en: 'Online today' },
  'cc.hour': { zh: '小时', en: 'h' },
  'cc.minute': { zh: '分钟', en: 'min' },
  'cc.delay': { zh: '网络延迟', en: 'Latency' },
  'cc.memory': { zh: '内存占用', en: 'Memory' },
  'cc.speed': { zh: '实时网速', en: 'Throughput' },
  'cc.up': { zh: '上行', en: 'Up' },
  'cc.down': { zh: '下行', en: 'Down' },
  'cc.offline': { zh: '不在线', en: 'Offline' },
  'cc.netOps': { zh: '联网操作', en: 'Connection' },
  'cc.cutDesc': { zh: '断开后将退出当前代理连接，未保存进度可能会丢失，请谨慎操作。', en: 'Disconnecting ends the proxy session; unsaved game progress may be lost.' },
  'cc.cut': { zh: '立即断开连接', en: 'Disconnect' },
  'cc.cutAsk': { zh: '确认断开连接？', en: 'Disconnect now?' },
  'cc.cutOk': { zh: '确认断开', en: 'Disconnect' },
  'cc.secCenter': { zh: '安全中心', en: 'Security' },
  'cc.vfTitle': { zh: '账号安全验证', en: 'Account verification' },
  'cc.vfDesc': { zh: '可验证代理服务器的连接状态，以及输入的账号密码是否正确。', en: 'Checks that the proxy is reachable and that your credentials are correct.' },
  'cc.vf': { zh: '立即安全验证', en: 'Verify now' },

  // ── 订阅设置 ───────────────────────────────────────────
  'sub.title': { zh: '订阅设置', en: 'Subscription' },
  'sub.current': { zh: '当前订阅', en: 'Current' },
  'sub.none': { zh: '未配置订阅地址', en: 'Not configured' },
  'sub.time': { zh: '更新时间', en: 'Updated' },
  'sub.id': { zh: '订阅号', en: 'ID' },
  'sub.never': { zh: '从未更新', en: 'Never' },
  'sub.ph': { zh: '请输入订阅号', en: 'Enter your subscription ID' },
  'sub.update': { zh: '更新订阅', en: 'Update' },
  'sub.updating': { zh: '更新中…', en: 'Updating…' },
  'sub.ok': { zh: '更新订阅成功，已自动保存订阅地址', en: 'Subscription updated and saved' },
  'sub.netErr': { zh: '无法连接订阅服务器', en: 'Cannot reach the subscription server' },
  'sub.invalid': { zh: '订阅号不存在或已过期', en: 'Subscription ID not found or expired' },
  'sub.empty': { zh: '请输入订阅号', en: 'Please enter a subscription ID' },
  'sub.hint': { zh: '订阅号由订阅服务器签发，服务器地址只能通过订阅号获取。', en: 'Subscription IDs are issued by the subscription server; server addresses are only available through an ID.' },
  'sub.local': { zh: '本机调试（WPE x64 与客户端在同一台电脑，且 WPE x64 已开启远程管理，默认端口 88）可用订阅号：', en: 'Local debugging (WPE x64 on this PC with Remote Management on, default port 88) — use ID:' },
  'sub.localFill': { zh: '点击填入', en: 'Click to fill in' },

  // ── 系统日志 ───────────────────────────────────────────
  'log.title': { zh: '系统日志', en: 'System Log' },
  'log.time': { zh: '时间', en: 'Time' },
  'log.module': { zh: '模块', en: 'Module' },
  'log.content': { zh: '日志内容', en: 'Message' },
  'log.apiCheck': { zh: 'API 检测', en: 'Check API' },
  'log.sysCheck': { zh: '系统检测', en: 'Check system' },
  'log.clear': { zh: '清除日志', en: 'Clear' },
  'log.count': { zh: '共 {0} 条', en: '{0} entries' },
  'log.empty': { zh: '暂无日志', en: 'No log entries' },
  'log.kernelOk': { zh: 'API 内核 {0}', en: 'API kernel {0}' },
  'log.kernelBad': { zh: 'API 内核检测失败', en: 'API kernel check failed' },

  // ── 安全验证 ───────────────────────────────────────────
  'vf.running': { zh: '安全验证中…', en: 'Verifying…' },
  'vf.runningDesc': { zh: '正在检测代理服务器可用性', en: 'Checking whether the proxy is reachable' },
  'vf.wait': { zh: '连接测试中，请稍候…', en: 'Testing the connection…' },
  'vf.ok': { zh: '验证通过', en: 'Verified' },
  'vf.okDesc': { zh: '代理服务器正常，账号安全等级已提升', en: 'The proxy is working and your credentials are valid' },
  'vf.bad': { zh: '验证失败', en: 'Verification failed' },
  'vf.badDesc': { zh: '代理服务器不可用，请检查网络后重试', en: 'The proxy is unreachable. Check your network and try again.' },

  // ── 软件设置 ───────────────────────────────────────────
  'set.title': { zh: '软件设置', en: 'Preferences' },
  'set.lang': { zh: '界面语言', en: 'Language' },
  'set.langHint': { zh: '切换后整个界面立即生效，并会记住到下次启动。', en: 'Takes effect immediately and is remembered next time.' },
  'set.theme': { zh: '外观', en: 'Appearance' },
  'set.themeHint': { zh: '深色是这套界面的默认配色；跟随系统时随操作系统的深浅设置一起变。', en: 'Dark is the default for this skin. "System" follows your OS light/dark setting.' },
  'set.dark': { zh: '深色', en: 'Dark' },
  'set.light': { zh: '浅色', en: 'Light' },
  'set.system': { zh: '跟随系统', en: 'System' },
  'set.now': { zh: '当前', en: 'Now' },
  'set.ambience': { zh: '氛围', en: 'Ambience' },
  'set.scan': { zh: '扫描线', en: 'Scan line' },
  'set.scanHint': { zh: '缓慢上下游走的那道亮带。关掉它不影响其余的网格底纹与四角标记。', en: 'The slow sweeping beam. Turning it off leaves the grid and corner marks untouched.' },

  // ── 通用弹窗 ───────────────────────────────────────────
  'dlg.save': { zh: '保存', en: 'Save' },
  'dlg.cancel': { zh: '取消', en: 'Cancel' },
  'dlg.close': { zh: '关闭', en: 'Close' },
  'dlg.ok': { zh: '确定', en: 'OK' },
  'dlg.exit': { zh: '退出', en: 'Exit' },
  'dlg.working': { zh: '处理中…', en: 'Working…' },
  'dlg.dismiss': { zh: '点一下关闭', en: 'Click to dismiss' },

  // ── 公告类型（照 WinForms 的 CellTag 五色）───────────────
  'nt.1': { zh: '活动情报', en: 'Event' },
  'nt.2': { zh: '维护说明', en: 'Maintenance' },
  'nt.3': { zh: '电竞赛事', en: 'Esports' },
  'nt.4': { zh: '限时商城', en: 'Store' },
  'nt.5': { zh: '玩家社区', en: 'Community' },
  'nt.1s': { zh: '活动', en: 'EVT' },
  'nt.2s': { zh: '维护', en: 'OPS' },
  'nt.3s': { zh: '赛事', en: 'CUP' },
  'nt.4s': { zh: '商城', en: 'SHOP' },
  'nt.5s': { zh: '社区', en: 'HUB' },

  // ── 提示 / 错误 ────────────────────────────────────────
  'msg.noServer': { zh: '无法获取服务器地址，请检查订阅设置是否正确', en: 'No server address available. Check your subscription settings.' },
  'msg.loginFail': { zh: '登录失败，请检查订阅设置与账号密码', en: 'Connection failed. Check your subscription, account and password.' },

  // ── 用户协议 / 隐私政策 ────────────────────────────────
  'ag.terms': { zh: 'WPE Proxy Cap 用户协议', en: 'WPE Proxy Cap Terms of Use' },
  'ag.privacy': { zh: 'WPE Proxy Cap 隐私政策', en: 'WPE Proxy Cap Privacy Policy' },
} as const

export type Key = keyof typeof DICT
