<script setup lang="ts">
/*
  弹窗的共用外壳 —— 全项目的弹窗都套它（订阅设置 / 系统日志 / 软件设置 / 协议全文）。

  对应 WPE x64 的 components/proxy/SettingsModal.vue，<b>形制逐条一致</b>：
  标题栏（Orbitron 青色标题 + Share Tech Mono 副标题 + 关闭 ×）· 四角标记 ·
  内容区 · 页脚（错误文字 + 撑杆 + 取消 / 保存）。

  【为什么不用 ant-design-vue 的 a-modal】它自带一整套圆角 + 亮色边框的观感，
  在这套赛博皮肤里像是从别的程序飞过来的；覆盖它要跟 :deep + 内部类名较劲，
  还得盯着版本升级。自己画一个反而更短 —— 顺带把 antd 依赖整个去掉了。

  【焦点】打开时把焦点移进弹窗，并经 useModal 让父窗体整块 inert；
  不这么做的话 Tab 能走到标题栏的「退出」上，回车就把程序关了。
*/
import { computed, nextTick, ref, useSlots, watch } from 'vue'
import { t } from '../i18n'
import { isAndroid } from '../platform'
import { useModal } from '../useModal'

const props = defineProps<{
  open: boolean
  title: string
  /** 副标题：一句拉丁代号，与 WPE 的弹窗同一条口径（Appearance / Subscription …） */
  subtitle?: string
  busy?: boolean
  /** 校验失败时由父组件填，显示在页脚左侧 */
  error?: string
  /** 只读弹窗：藏掉「保存」，把「取消」改成「关闭」 */
  readonly?: boolean
  /** 弹窗宽度（px）。默认 620；装着表格的那几个要宽一些 */
  width?: number
  /** 内容区最大高度（px）。日志那种「行数多少都该一样高」的弹窗要定死它 */
  bodyHeight?: number
  /** 「保存」那颗按钮的文案。默认「保存」 */
  saveText?: string
  /** 「保存」点不点得动。⚠️ 与 busy 分开：busy 是「正在办」，这个是「还没得办」 */
  saveDisabled?: boolean
  /** 「取消」那颗按钮的文案。默认「取消」 */
  cancelText?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'save'): void
}>()

const box = ref<HTMLElement | null>(null)

/*
  打开时把焦点移进弹窗。

  不这样做的话焦点还留在触发它的那个按钮上，Tab 的第一下会跳到弹窗外面 ——
  而外面此刻是 inert 的，于是焦点无处可去。

  ⚠️ <b>先在内容区里找，找不到才退回整个弹窗。</b>
  直接按 DOM 顺序取第一个可聚焦元素的话，拿到的永远是标题栏那颗<b>关闭 ×</b> ——
  弹窗一开，焦点就落在「取消」性质的按钮上，回车即关掉；而用户想输入的那个框
  还得自己去点一下。订阅设置那一屏尤其明显（它就一个输入框）。
*/
watch(() => props.open, async (on) => {
  if (!on) return
  await nextTick()

  const pick = (root: HTMLElement | null | undefined) =>
    root?.querySelector<HTMLElement>('input:not([disabled]), select, textarea, button:not([disabled]), [tabindex]')

  const el = pick(box.value?.querySelector<HTMLElement>('.bd')) ?? pick(box.value)
  el?.focus()
})

function close(): void {
  if (props.busy) return
  emit('update:open', false)
}

/*
  手机上的只读弹窗（协议 / 安全验证，2026-09-15 用户要求）：不要页脚那颗「关闭」，
  手机用户习惯点右上角 × 或点遮罩关。页脚里还有错误文字或额外按钮时照常显示。
  有表单的弹窗不变 —— 点遮罩丢掉填了一半的东西太容易误触。
*/
const slots = useSlots()
const lightClose = computed(() => isAndroid && !!props.readonly)
const showFoot = computed(() => !lightClose.value || !!props.error || !!slots.actions)

function onMask(): void {
  if (lightClose.value) close()
}

/* 登记进模态栈：父窗体因此变 inert；自己被后开的弹窗盖住时也会 inert。见 useModal.ts */
// 第二个参数：手机的系统返回键关掉最上面那层时走这里（busy 时 close 自己会拒绝）
const { covered } = useModal(() => props.open, close)
</script>

<template>
  <!--
    ⚠️ <b>Teleport 到 body</b> —— 不是为了好看，是必须的（见 useModal.ts）：
    出去了才不会被 .shell 的 inert 一起禁掉，遮罩也才盖得住标题栏。

    ⚠️ <b>点遮罩不关闭弹窗</b>：订阅设置里是填了一半的东西，点空白处就丢掉太容易误操作。
    出口只留「取消 / 关闭」按钮与 Esc。例外是手机上的只读弹窗（见 lightClose）。
  -->
  <Teleport to="body"><div v-if="props.open" class="mask" :inert="covered" @click.self="onMask">
    <div ref="box" class="dlg" :class="{ ro: props.readonly, nofoot: !showFoot }" role="dialog" aria-modal="true"
         :style="props.width ? { width: props.width + 'px' } : undefined" @keydown.esc="close">
      <header class="hd">
        <span class="mk tl" /><span class="mk tr" />
        <div class="tt">
          <span class="zh">{{ props.title }}</span>
          <span v-if="props.subtitle" class="sub">{{ props.subtitle }}</span>
        </div>
        <button class="x" :title="t('dlg.close')" @click="close">
          <svg class="ico" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </header>

      <!--
        ⚠️ 给了 bodyHeight 就必须同时写 <b>flex: none</b>：.bd 默认是 flex: 1，
        而 column flex 容器里 flex-basis: 0% 会<b>盖掉 height</b> ——
        只设 height 的话高度纹丝不动（实测 440 只出来 236），而且不报任何错。
      -->
      <div class="bd" :style="props.bodyHeight ? { height: props.bodyHeight + 'px', flex: 'none' } : undefined">
        <slot />
      </div>

      <footer v-if="showFoot" class="ft">
        <span v-if="props.error" class="err">
          <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          {{ props.error }}
        </span>
        <span class="grow" />
        <slot name="actions" />
        <button class="btn" :class="{ primary: props.readonly }" :disabled="props.busy" @click="close">
          {{ props.cancelText || (props.readonly ? t('dlg.close') : t('dlg.cancel')) }}
        </button>
        <button v-if="!props.readonly" class="btn primary" :disabled="props.busy || props.saveDisabled" @click="emit('save')">
          {{ props.busy ? t('dlg.working') : (props.saveText || t('dlg.save')) }}
        </button>
        <span class="mk bl" /><span class="mk br" />
      </footer>
    </div>
  </div></Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgb(var(--scrim-rgb) / 78%);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dlg {
  position: relative;
  width: 620px;
  max-width: calc(100vw - 64px);
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 18px 60px rgb(var(--shadow-rgb) / 55%);
}

/* 四角标记：让弹窗也属于这套语言 */
.mk { position: absolute; width: 11px; height: 11px; border: 1px solid rgb(var(--cyan-rgb) / 45%); }
.mk.tl { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
.mk.tr { top: 6px; right: 6px; border-left: 0; border-bottom: 0; }
.mk.bl { bottom: 6px; left: 6px; border-right: 0; border-top: 0; }
.mk.br { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

.hd {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 13px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

.tt { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 12px; }

.tt .zh {
  font-family: var(--orbit);
  font-weight: 700;
  font-size: var(--fs-title);
  letter-spacing: .04em;
  color: var(--cyan);
}

.tt .sub {
  font-family: var(--share);
  font-size: var(--fs-caption);
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--muted);
}

.x {
  flex: none;
  width: 26px;
  height: 26px;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/*
  ⚠️ <b>红色只给「点下去会丢东西」的那几个弹窗。</b>

  改之前这里一律 --danger（照抄 WPE 的 SettingsModal）。但红在这套皮肤里是
  「破坏性动作」的信号 —— 标题栏那颗「退出」是红的，因为它真的把程序关了。
  而<b>只读弹窗</b>（用户协议 / 隐私政策 / 系统日志 / 安全验证）的 × 只是收起一块
  文字，什么都不会丢；给它红色是在拿最重的那个信号去标一件无害的事，
  用完几次红就不再有分量了。

  判据直接复用现成的 readonly：它本来就表示「这一屏没有可撤销的改动」
  （页脚的「取消」也是因此变成「关闭」的），不必另造一个概念。
  订阅设置 / 软件设置仍是红 —— 那里 × 等于丢掉填了一半的东西。
*/
.x:hover { color: var(--danger); }
.x .ico { width: 15px; height: 15px; stroke: currentColor; stroke-width: 2; fill: none; }
.x:focus-visible { outline-offset: -2px; outline-color: var(--danger); }

.dlg.ro .x:hover { color: var(--cyan); }
.dlg.ro .x:focus-visible { outline-color: var(--cyan); }

.bd { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 0; }
/* 没有页脚时内容别贴着屏幕底边（手机上弹窗从底部弹出） */
.dlg.nofoot .bd { padding-bottom: 14px; }

.ft {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border-top: 1px solid var(--border);
  background: var(--panel);
}

.ft .grow { flex: 1; }

/*
  ⚠️ 错误文字可以很长，它要<b>自己折行</b>、不能去挤右边的按钮 ——
  按钮没写 flex: none 的话一句长错误就把「取消 / 保存」压成竖排的两个字
  （WPE 那边实测撞到过）。所以这里 min-width: 0 允许收缩、按钮那边 flex: none。
*/
.err {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: 0 1 auto;
  min-width: 0;
  font-size: var(--fs-small);
  line-height: 1.5;
  color: var(--danger);
}

.err .ico { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; fill: none; flex: none; }

.btn {
  flex: none;                /* 页脚的错误文字再长也不许挤压按钮（见 .err） */
  white-space: nowrap;
  padding: 11px 20px 11px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--gray);
  font-family: var(--share);
  font-size: var(--btn-size);
  /* 显式 1：Share Tech Mono 在 normal 行高下会把行距全压在字的下面，字号一大就明显偏上 */
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: .15s;
}

.btn:hover:not(:disabled) { border-color: var(--cyan); color: var(--cyan); }
.btn:disabled { opacity: .4; cursor: default; }
.btn.primary { border-color: rgb(var(--green-rgb) / 45%); color: var(--green); }
.btn.primary:hover:not(:disabled) { background: rgb(var(--green-rgb) / 10%); }
.btn.primary:focus-visible { outline-color: var(--green); }
</style>
