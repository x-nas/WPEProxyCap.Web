// 支持的界面语言 —— <b>全项目唯一的一份清单</b>。
//
// 与 WPE x64 的 WebUI/src/i18n/langs.ts <b>逐条相同</b>（同一个产品家族，
// 用户在两个程序之间切换时看到的语言名、顺序、回落规则都该一样）。
// C# 侧照抄同一张表：ConfigStore 存的是这里的 culture，
// ShellForm / ProxyService 的 Normalize 按同一条规则解析。
//
// 【为什么是这七种】中（简 / 繁）英是原有的加台港澳；
// 日 / 韩 / 越 / 俄是按实际使用地补的 —— 网游加速器的用户集中在
// 东亚与东南亚，俄语区是第二大来源。

export type Lang = 'zh' | 'tw' | 'en' | 'ja' | 'ko' | 'vi' | 'ru'

export interface LangDef {
  /** 字典里的键，也是前端内部一律用的短码 */
  code: Lang
  /** C# 侧 AppConfig.Language 存的值（BCP-47 文化名） */
  culture: string
  /** 下拉里显示的名字。<b>一律用该语言自己的写法</b> —— 切到看不懂的语言时，
   *  「English」「日本語」这样的自称是唯一还认得出来的东西 */
  label: string
  /**
   * 两个字母的身份标记，显示在下拉每一项的名字前面。
   *
   * 作用有两个：给一列对得齐的视觉锚点，以及让 CyberSelect 的
   * 「敲首字母跳到下一个匹配项」在 CJK 名字上也能用 —— 七个首字母
   * e/j/k/r/v/c/t 各不相同。
   *
   * ⚠️ <b>它不是排序键</b>：CN / TW 是地区码而不是语言码，按它排会把两种中文
   * 拆到列表两头。排序看 culture，见 LANGS 上面那段。
   */
  short: string
  /**
   * 这门语言的字比汉字宽多少。
   *
   * 登录卡的标签、控制中心那几格读数是按中文字数排的；
   * 换成俄语「Подключиться немедленно」就要靠省略号截断。
   * 所以设置弹窗的标签列宽跟着语言走（--setf-kx）。
   *
   * 日 / 韩 / 繁体与简体同为方块字，宽度相当；拉丁与西里尔字母的词长得多。
   */
  wide?: boolean
}

/*
  ⚠️ <b>按 BCP-47 语言标记（culture）的字母序排</b>：
  en-US · ja-JP · ko-KR · ru-RU · vi-VN · zh-CN · zh-TW。

  三条理由：加语言时位置是<b>算出来</b>的（不用每加一种讨论一次）、
  不以某一种语言为中心、同一门语言的变体天然相邻（zh-CN 与 zh-TW 挨着 ——
  按显示名或按 short 排都会把它俩拆散）。

  <b>顺序不是随手排的，别按「看着顺眼」重排。</b>
*/
export const LANGS: LangDef[] = [
  { code: 'en', culture: 'en-US', label: 'English', short: 'EN', wide: true },
  { code: 'ja', culture: 'ja-JP', label: '日本語', short: 'JA' },
  { code: 'ko', culture: 'ko-KR', label: '한국어', short: 'KO' },
  { code: 'ru', culture: 'ru-RU', label: 'Русский', short: 'RU', wide: true },
  { code: 'vi', culture: 'vi-VN', label: 'Tiếng Việt', short: 'VI', wide: true },
  { code: 'zh', culture: 'zh-CN', label: '简体中文', short: 'CN' },
  { code: 'tw', culture: 'zh-TW', label: '繁體中文', short: 'TW' },
]

/**
 * 认不出来时回落到哪一种。
 *
 * <b>不能写成 LANGS[0]</b> —— 那是「列表第一项」，而列表按语言标记排序，
 * 第一项是 English。回落必须钉在<b>简体</b>上：它是产品的默认语言，
 * 也是 base.ts 里 zh 字段的那一份。
 */
const FALLBACK: LangDef = LANGS.find((x) => x.code === 'zh')!

/**
 * C# 给的 "ja-JP" / "en-US" / "zh-TW" → 这里的短码。认不出来的一律回简体。
 *
 * ⚠️ <b>简繁必须先分开判</b>：zh-CN 与 zh-TW 前两位相同，
 * 按前缀一刀切的话繁体会被当成简体，整份译文白做。
 * zh-TW / zh-HK / zh-MO / zh-Hant 都是繁体，其余 zh 开头的是简体。
 */
export function normalize(code: string | undefined | null): Lang {
  const s = (code || '').toLowerCase()

  if (s === 'tw') return 'tw'

  if (s.startsWith('zh')) {
    return /tw|hk|mo|hant/.test(s) ? 'tw' : 'zh'
  }

  for (const l of LANGS) {
    if (l.code === 'zh' || l.code === 'tw') continue
    // 只比前两位：配置里可能存着 "en-GB" 这类值，没必要为此加一张别名表
    if (s.startsWith(l.code)) return l.code
  }

  return 'zh'
}

/** 短码 → C# 要的文化名。 */
export function cultureOf(code: Lang): string {
  const l = LANGS.find((x) => x.code === code)
  return l ? l.culture : 'zh-CN'
}

export function defOf(code: Lang): LangDef {
  return LANGS.find((x) => x.code === code) || FALLBACK
}
