<script setup lang="ts">
/*
  迷你速率曲线（方案 A 的遥测舱）。

  数据由 ControlCenter 自己攒（每次 stats 事件推一个点、封顶 60 个），
  <b>不需要新的桥方法</b>。纵轴按窗口内最大值自适应，末端描一个点。
*/
import { computed } from 'vue'

const props = defineProps<{ values: number[]; tone: 'green' | 'cyan' }>()

const W = 240
const H = 46

const pts = computed(() => {
  const v = props.values
  if (v.length < 2) return ''
  const max = Math.max(1, ...v)
  const step = W / (v.length - 1)
  return v.map((x, i) => `${(i * step).toFixed(1)},${(H - 3 - (x / max) * (H - 8)).toFixed(1)}`).join(' ')
})

const last = computed(() => {
  const p = pts.value.split(' ').pop()
  return p ? p.split(',').map(Number) : null
})
</script>

<template>
  <svg class="spark" :class="tone" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
    <line class="base" x1="0" :y1="H - 0.5" :x2="W" :y2="H - 0.5" />
    <template v-if="pts">
      <polygon class="fill" :points="`0,${H} ${pts} ${W},${H}`" />
      <polyline class="line" :points="pts" />
      <circle v-if="last" class="end" :cx="last[0]" :cy="last[1]" r="2.5" />
    </template>
  </svg>
</template>

<style scoped>
.spark { display: block; width: 100%; height: 46px; overflow: visible; --sc: var(--green); --sc-rgb: var(--green-rgb); }
.spark.cyan { --sc: var(--cyan); --sc-rgb: var(--cyan-rgb); }
.base { stroke: var(--border); stroke-width: 1; }
.fill { fill: rgb(var(--sc-rgb) / 12%); }
.line { fill: none; stroke: var(--sc); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.end { fill: var(--sc); }
</style>
