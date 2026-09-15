/*
  节点延迟的分档 —— 颜色与 useControlPanel 的 delayTone 同一套阈值（≤80 绿、≤160 琥珀、其余红），
  信号格多分一档（≤300 两格），让「慢但能用」和「基本不能用」看得出区别。
  undefined = 还没测；-1 = 测过但不通。
*/
export function latencyTone(ms: number | undefined): 'g' | 'a' | 'd' | '' {
  if (ms === undefined) return ''
  if (ms < 0) return 'd'
  if (ms <= 80) return 'g'
  if (ms <= 160) return 'a'
  return 'd'
}

export function latencyLevel(ms: number | undefined): 0 | 1 | 2 | 3 | 4 {
  if (ms === undefined || ms < 0) return 0
  if (ms <= 80) return 4
  if (ms <= 160) return 3
  if (ms <= 300) return 2
  return 1
}
