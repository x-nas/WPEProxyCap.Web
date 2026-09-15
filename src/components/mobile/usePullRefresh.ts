import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/*
  下拉刷新 —— 只在滚动容器已经顶到最上面时才接手。
  手指位移打五折换成下拉距离（拉起来有「阻力」），超过 THRESHOLD 松手就刷新；
  刷新期间指示条停在 THRESHOLD 高度，onRefresh 结束后收回。
  监听器是 passive 的：不拦浏览器自己的滚动，只在顶端多画一条提示。
*/
export const PULL_THRESHOLD = 56

export function usePullRefresh(el: Ref<HTMLElement | null>, onRefresh: () => Promise<unknown>) {
  const pull = ref(0)
  const refreshing = ref(false)
  let startY = -1

  function start(e: TouchEvent): void {
    startY = !refreshing.value && el.value && el.value.scrollTop <= 0 ? e.touches[0].clientY : -1
  }

  function move(e: TouchEvent): void {
    if (startY < 0) return
    const dy = e.touches[0].clientY - startY
    pull.value = dy > 0 ? Math.min(PULL_THRESHOLD * 1.6, dy * 0.5) : 0
  }

  async function end(): Promise<void> {
    if (startY < 0) return
    startY = -1
    if (pull.value < PULL_THRESHOLD) { pull.value = 0; return }
    refreshing.value = true
    pull.value = PULL_THRESHOLD
    try {
      await onRefresh()
    } finally {
      refreshing.value = false
      pull.value = 0
    }
  }

  onMounted(() => {
    const node = el.value
    if (!node) return
    node.addEventListener('touchstart', start, { passive: true })
    node.addEventListener('touchmove', move, { passive: true })
    node.addEventListener('touchend', end)
    node.addEventListener('touchcancel', end)
  })

  onBeforeUnmount(() => {
    const node = el.value
    if (!node) return
    node.removeEventListener('touchstart', start)
    node.removeEventListener('touchmove', move)
    node.removeEventListener('touchend', end)
    node.removeEventListener('touchcancel', end)
  })

  return { pull, refreshing }
}
