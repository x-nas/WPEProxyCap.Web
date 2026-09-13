<script setup lang="ts">
/*
  软件设置 —— 界面语言 + 深浅色 + 氛围。

  与 WPE x64 的 components/AppSetting.vue <b>同一形制</b>（下拉 + 三张主题卡 +
  一个勾选框，分区卡自动编号），用户在两个程序之间切换时这一屏该长得一样。

  【入口在标题栏的齿轮，不在别处】它管的是<b>这个程序长什么样</b>：
  未登录的主页上就要能改，连上之后的控制中心也共用一份。

  【这一屏是「改草稿 → 按保存才生效」】
  下面三个 draft* 是<b>草稿</b>，不是真值：点卡片 / 选下拉只改草稿，
  onSave 才把改动推给 setLang / setTheme / setScan（它们自己会落盘并同步到 C#）。
  取消、按 Esc、点 × 关掉 —— 都不应用，草稿在下次打开时按当前真值重置。

  ⚠️ 由此带来的一个后果：<b>主题不再有「点了就看见」的即时预览</b>。
  三张卡上的色带预览就是补这个的 —— 没切过的人不知道会变成什么样。
*/
import { computed, ref, watch } from 'vue'
import { LANGS, defOf, lang, setLang, t, type Lang } from '../i18n'
import { scanLine, setScan, setTheme, systemIsDark, theme, type Theme } from '../stores/theme'
import CyberSelect from './CyberSelect.vue'
import CyberModal from './CyberModal.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

/*
  三个主题各画一张小预览：四条色带（底 / 卡片 / 面板 / 强调）。
  只写「深色 / 浅色」几个字的话，没切过的人不知道会变成什么样；色块一眼就说清了。

  ⚠️ 用的是<b>写死的十六进制</b>而不是令牌 —— 这几张图要<b>同时</b>显示两套配色，
  而令牌只能给出当前那一套。值逐条抄自 tokens.css 的 :root 与 [data-theme="light"]。
*/
type ThemeCard = { key: Theme; label: 'set.dark' | 'set.light' | 'set.system'; sw: string[] }

const DARK_SW = ['#0a0a0f', '#12121a', '#1c1c2e', '#00ff88']
const LIGHT_SW = ['#eef1f6', '#ffffff', '#e6eaf1', '#00753f']

const THEMES: ThemeCard[] = [
  { key: 'dark', label: 'set.dark', sw: DARK_SW },
  { key: 'light', label: 'set.light', sw: LIGHT_SW },
  // 「跟随系统」那张把两套各取一半拼起来（左深右浅），一眼读出「这一档不固定」
  { key: 'system', label: 'set.system', sw: [DARK_SW[0], DARK_SW[3], LIGHT_SW[3], LIGHT_SW[1]] },
]

/*
  草稿。⚠️ 必须在<b>每次打开时</b>重置，不能只在组件创建时取一次：
  弹窗是 v-model:open 控制显隐、组件一直挂着的，上一次改完没保存就关掉的话，
  草稿会留在那儿，下次打开看到的是上次没保存的选择。
*/
const draftLang = ref<Lang>(lang.value)
const draftTheme = ref<Theme>(theme.value)
const draftScan = ref(scanLine.value)

watch(() => props.open, (on) => {
  if (!on) return
  draftLang.value = lang.value
  draftTheme.value = theme.value
  draftScan.value = scanLine.value
})

const busy = ref(false)

const cur = computed(() => defOf(draftLang.value))

/*
  语言用下拉，不铺成网格 —— 七个已经占掉三行，而这一屏总共才三组设置。
  下拉的高度与语言个数无关。

  【label 为什么带两字母前缀】名字一律用<b>该语言自己的写法</b>（日本語 而不是
  Japanese）—— 切到一种看不懂的语言之后，自称是屏幕上唯一还认得出来的东西；
  但 CJK 的名字没法按首字母跳，而 CyberSelect 支持「敲首字母跳到下一个匹配项」。
  前缀补上之后 c/t/e/j/k/v/r 七个各不相同。等宽字体下这两列自然对齐。
*/
const langOptions = computed(() =>
  LANGS.map((l) => ({ value: l.code, label: l.short + '  ' + l.label })))

/**
 * 保存。只推<b>真的变了</b>的那一项：三个 set* 各带一次桥往返 + 落盘，
 * 没变还推一遍是白费一次写盘。
 */
async function onSave(): Promise<void> {
  busy.value = true

  try {
    if (draftLang.value !== lang.value) { await setLang(draftLang.value) }
    if (draftTheme.value !== theme.value) { await setTheme(draftTheme.value) }
    if (draftScan.value !== scanLine.value) { await setScan(draftScan.value) }

    emit('update:open', false)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <CyberModal
    :open="props.open"
    :title="t('set.title')"
    subtitle="Appearance"
    :busy="busy"
    :width="560"
    @update:open="emit('update:open', $event)"
    @save="onSave"
  >
    <div class="setf">
      <section class="sec">
        <div class="grp">{{ t('set.lang') }}</div>

        <div class="one">
          <CyberSelect
            class="sel"
            :model-value="draftLang"
            :options="langOptions"
            @update:model-value="draftLang = $event as Lang"
          />
          <!-- 文化名：下拉里只有语言的自称，出问题时要看的是它到底切成了哪个 culture -->
          <i class="cult">{{ cur.culture }}</i>
        </div>
        <p class="hint">{{ t('set.langHint') }}</p>
      </section>

      <section class="sec">
        <div class="grp">{{ t('set.theme') }}</div>

        <div class="opts">
          <button
            v-for="x in THEMES"
            :key="x.key"
            class="opt"
            :class="{ on: x.key === draftTheme, sys: x.key === 'system' }"
            :aria-pressed="x.key === draftTheme"
            @click="draftTheme = x.key"
          >
            <span class="prev">
              <i v-for="(c, i) in x.sw" :key="i" class="sw" :style="{ background: c }" />
            </span>
            <span class="nm">{{ t(x.label) }}</span>
            <svg v-if="x.key === draftTheme" class="tick" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </button>
        </div>

        <!--
          选中「跟随系统」时，把<b>系统此刻是深是浅</b>接在提示语后面 ——
          只显示「跟随系统」的话，用户没法确认它到底认出来没有。

          ⚠️ 读的是 systemIsDark 而不是 effective：后者是「现在实际生效的主题」，
          而这里草稿刚选上跟随系统、还没按保存，effective 仍停在旧主题上。
        -->
        <p class="hint">
          {{ t('set.themeHint') }}
          <b v-if="draftTheme === 'system'" class="now">
            {{ t('set.now') }} · {{ t(systemIsDark ? 'set.dark' : 'set.light') }}
          </b>
        </p>
      </section>

      <section class="sec">
        <div class="grp">{{ t('set.ambience') }}</div>

        <!--
          游走亮带的开关。单成一组 —— 它不是「深还是浅」的一部分，
          是「这套皮肤的动效要不要」，与主题正交（浅色下同样有这条带子）。
        -->
        <div class="one">
          <button class="chk" :class="{ on: draftScan }" @click="draftScan = !draftScan">
            <i />{{ t('set.scan') }}
          </button>
        </div>
        <p class="hint">{{ t('set.scanHint') }}</p>
      </section>
    </div>
  </CyberModal>
</template>

<style scoped>
/* 主题三张卡排三列 —— 每张要放得下色带预览 */
.opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 2px 14px 4px; }

/* 单控件那一行：与 .opts 用同一份内边距，控件左沿才和下面的主题卡对齐 */
.one { display: flex; align-items: center; gap: 10px; padding: 2px 14px 4px; }

/*
  语言下拉。定宽 200 —— 最长的是「Tiếng Việt」加两字母前缀，
  给内容宽度会让下拉框随语言变宽，右边那个文化名跟着左右跳。
*/
.sel { width: 200px; }

/* 跟随系统时接在提示语后面的「当前 · 深色」 */
.now { color: var(--cyan); font-weight: 400; white-space: nowrap; }

.opt {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 9px;
  padding: 11px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--gray);
  font-family: inherit;
  font-size: var(--fs-body);
  line-height: 1;
  text-align: left;
  cursor: pointer;
}

.opt:hover { border-color: var(--cyan); color: var(--cyan); }
/* 选中：青边 + 一层极淡的底，与全项目「选中」同一条视觉语言 */
.opt.on { border-color: var(--cyan); background: rgb(var(--cyan-rgb) / 10%); color: var(--cyan); }
.opt:focus-visible { outline: 1px solid var(--cyan); outline-offset: -2px; }

.nm { flex: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tick { position: absolute; right: 9px; bottom: 11px; width: 13px; height: 13px; fill: none; stroke: var(--cyan); stroke-width: 2.4; }

/* 主题预览：四条色带并排，宽度按令牌的层次递减（底色占得最多、强调色只是一道） */
.prev { display: flex; height: 26px; border: 1px solid var(--border); overflow: hidden; }
.sw { flex: 1; }
.sw:first-child { flex: 2; }
.sw:last-child { flex: .5; }

/*
  「跟随系统」那张是<b>两套配色各占一半</b>（深底 + 深色强调 | 浅色强调 + 浅底），
  所以四条要等宽 —— 沿用上面那套递减权重会把右边的浅色压成一道细缝。
*/
.opt.sys .sw:first-child, .opt.sys .sw:last-child { flex: 1; }

.cult { position: relative; top: 1px; font-family: var(--mono); font-size: var(--fs-small); color: var(--dim2); font-style: normal; margin-left: 6px; }   /* 小一号、与下拉排一行，100% / 125% 缩放实测都偏高 1.3~1.4px（2026-09-13） */
</style>
