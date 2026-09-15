import { onScopeDispose, ref, type Ref } from 'vue'

/** 媒体查询是否命中，窗口尺寸 / 平板旋转时跟着变。 */
export function useMedia(query: string): Ref<boolean> {
  const mql = window.matchMedia(query)
  const on = ref(mql.matches)
  const onChange = (e: MediaQueryListEvent) => { on.value = e.matches }
  mql.addEventListener('change', onChange)
  onScopeDispose(() => mql.removeEventListener('change', onChange))
  return on
}
