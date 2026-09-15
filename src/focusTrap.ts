/*
  弹窗 / 底部弹层打开时把键盘焦点关在最上面那一层里（2026-09-15）。

  【为什么 inert 不够】外壳在有弹窗时加 inert（useModal 的 anyModalOpen），浏览器本该让后面的控件
  既点不到也 Tab 不进去。但 inert 要 Chromium 102+，Android 的 System WebView 可能更老（我们只要求 90），
  老 WebView 上这个属性被静默忽略 —— 结果是弹窗开着，按 Tab 焦点照样跑到遮罩后面的按钮上，回车就点下去了。
  （Windows 的 WebView2 是常青版不受影响，这里两边都装，行为一致。）

  做法：
    · keydown Tab（捕获阶段）：焦点在最上层之外 → 拉回第一个控件；在首尾 → 绕回另一端；
    · focusin（捕获阶段）：焦点落到了最上层之外（点击、程序调用 focus）→ 拉回去。
  最上层 = 文档里最后一个 .mask / .bs-mask（弹窗都 Teleport 到 body，后开的排在后面）。
*/
const LAYER = '.mask, .bs-mask'
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function topLayer(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(LAYER)
  return all.length ? all[all.length - 1] : null
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)
}

function focusInto(layer: HTMLElement): void {
  const first = focusables(layer)[0] ?? layer.querySelector<HTMLElement>('[tabindex]')
  first?.focus()
}

export function installFocusTrap(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return
    const layer = topLayer()
    if (!layer) return

    const list = focusables(layer)
    if (!list.length) { e.preventDefault(); return }

    const active = document.activeElement as HTMLElement | null
    const first = list[0]
    const last = list[list.length - 1]

    if (!active || !layer.contains(active)) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && (active === first || !list.includes(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }, true)

  document.addEventListener('focusin', (e) => {
    const layer = topLayer()
    if (!layer) return
    if (e.target instanceof Node && layer.contains(e.target)) return
    focusInto(layer)
  }, true)
}
