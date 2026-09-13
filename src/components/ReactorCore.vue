<script setup lang="ts">
/*
  反应堆核心（方案 A · REACTOR）—— 主页与控制中心<b>共用同一枚圆环</b>。

  未连接时它就是连接按钮（外层由 MainView 包一个 <button>），
  连上之后同一个圆环变成在线计时表，圆弧走「今日在线进度」。
  两屏的骨架因此一动不动，只有核心在变 —— 这是方案 A 的全部立意。

  四种状态：
    idle   待命：虚线分段环 + 六边形，绿
    busy   连接中：分段环转快
    off    没有节点：整体压灰（点了也没用，所以不给辉光）
    on     已连接：实心进度弧，绿
    paused 计时暂停：同上，整环转琥珀 —— 一眼看出「这个数现在不动了」

  ⚠️ 颜色一律走 CSS 令牌（stroke: var(--x)），不写进 SVG 属性 ——
  写死十六进制的话浅色皮肤下就是一枚换不掉的霓虹绿。
*/
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  tone: 'idle' | 'busy' | 'off' | 'on' | 'paused'
  /** 0..1，只在 on / paused 时画 */
  progress?: number
}>(), { progress: 0 })

// r = 122 的周长
const C = 2 * Math.PI * 122

const dash = computed(() => {
  const p = Math.max(0, Math.min(1, props.progress))
  return `${(p * C).toFixed(1)} ${C.toFixed(1)}`
})

const live = computed(() => props.tone === 'on' || props.tone === 'paused')
</script>

<template>
  <div class="core" :class="tone">
    <svg viewBox="0 0 300 300" aria-hidden="true">
      <g class="spin"><circle class="ticks" cx="150" cy="150" r="140" /></g>
      <circle class="track" cx="150" cy="150" r="122" />
      <circle v-if="!live" class="segs" cx="150" cy="150" r="122" />
      <circle v-else class="arc" cx="150" cy="150" r="122" :stroke-dasharray="dash" transform="rotate(-90 150 150)" />
      <polygon class="hex" points="150,52 235,101 235,199 150,248 65,199 65,101" />
      <polygon v-if="!live" class="hex2" points="150,72 218,111 218,189 150,228 82,189 82,111" />
    </svg>
    <div class="inner"><slot /></div>
  </div>
</template>

<style scoped>
.core {
  --rc: var(--green);
  --rc-rgb: var(--green-rgb);
  position: relative;
  height: 100%;
  aspect-ratio: 1;
  max-width: 100%;
}

.core.paused { --rc: var(--amber); --rc-rgb: var(--amber-rgb); }
.core.off { --rc: var(--muted); --rc-rgb: var(--border-rgb); }

svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

.spin { transform-origin: 150px 150px; animation: rc-spin 40s linear infinite; }
.core.busy .spin { animation-duration: 3s; }

.ticks { fill: none; stroke: rgb(var(--rc-rgb) / 45%); stroke-width: 1; stroke-dasharray: 2 7; }
.track { fill: none; stroke: var(--border); stroke-width: 10; }
.segs { fill: none; stroke: rgb(var(--rc-rgb) / 28%); stroke-width: 10; stroke-dasharray: 40 24; }
.arc { fill: none; stroke: var(--rc); stroke-width: 10; filter: drop-shadow(0 0 6px rgb(var(--rc-rgb) / 70%)); transition: stroke-dasharray .6s ease; }
.hex { fill: rgb(var(--rc-rgb) / 6%); stroke: var(--rc); stroke-width: 1.5; stroke-opacity: .85; transition: fill .2s; }
.hex2 { fill: none; stroke: rgb(var(--rc-rgb) / 30%); stroke-width: 1; }
.core.off .hex { fill: transparent; stroke-opacity: .5; }

.inner {
  position: absolute;
  inset: 22%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
}

@keyframes rc-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
