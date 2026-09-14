/*
  模态弹窗的登记处 —— 全项目一份（与 WPE x64 的 useModal.ts 逐条一致）。

  【为什么需要它】
  弹窗打开时父窗体必须彻底不可交互：既点不动（标题栏的最小化 / 退出、登录卡上的按钮），
  Tab 也走不进去。不这么做的话焦点能从弹窗跳到标题栏的「退出」上，回车就把程序关了。

  【为什么弹窗要 Teleport 到 body，不能只靠 z-index】
  ⚠️ `.win > .shell` 一旦是层叠上下文（例如给它加了 z-index），弹窗渲染在里面时那层
  遮罩就被<b>关在这个上下文里</b>，标题栏可能画在弹窗<b>之上</b> —— 遮罩既盖不住、
  也挡不住点击。WPE 那边右键菜单与设置弹窗都栽过这个坑。

  ⚠️ 另一半同样重要：弹窗 Teleport 出去之后就<b>不在 .shell 里</b>了，
  这样给 .shell 加 inert 才不会把弹窗自己也禁掉。<b>两件事是配套的，别只做一件。</b>

  【弹窗套弹窗】确认框弹在设置弹窗上面时，下面那层也该 inert
  （它已经不在 .shell 里了，inert 盖不到它）。所以每个弹窗自己也要 `:inert="covered"`。
*/
import { computed, onScopeDispose, ref, watch } from 'vue'

let seq = 0
const stack = ref<number[]>([])

/** 有没有模态弹窗开着。App.vue 用它给 .shell 整块加 inert。 */
export const anyModalOpen = computed(() => stack.value.length > 0)

/* 每个弹窗「怎么关」—— 手机的系统返回键要能关掉最上面那一层（见 closeTopModal） */
const closers = new Map<number, () => void>()

/**
 * 关掉最上面那个弹窗。返回 true 表示关了一个（返回键被弹窗消费掉了），
 * false 表示没有弹窗开着 —— 手机版外壳据此决定要不要把返回键交还给系统（退到后台）。
 * 弹窗正在办事（busy）时它自己的关闭函数会拒绝关闭，这里同样算「消费掉了」，免得一按返回整个应用退了。
 */
export function closeTopModal(): boolean {
  const s = stack.value
  if (!s.length) return false
  closers.get(s[s.length - 1])?.()
  return true
}

/**
 * 把一个弹窗登记进来。
 *
 * @param isOpen 取当前是否显示 —— <b>传取值函数，别传布尔值</b>（那样只会读一次，
 *               弹窗关了栈也清不掉，表现是「关了弹窗父窗体还是点不动」）
 * @returns covered 自己被后开的弹窗盖住了，这时自己也要 inert
 */
export function useModal(isOpen: () => boolean, close?: () => void) {
  const id = ++seq

  const set = (v: boolean) => {
    const has = stack.value.includes(id)
    if (v === has) return
    stack.value = v ? [...stack.value, id] : stack.value.filter((x) => x !== id)
  }

  if (close) closers.set(id, close)

  watch(isOpen, set, { immediate: true })
  onScopeDispose(() => { set(false); closers.delete(id) })

  return {
    covered: computed(() => {
      const s = stack.value
      return s.includes(id) && s[s.length - 1] !== id
    }),
  }
}
