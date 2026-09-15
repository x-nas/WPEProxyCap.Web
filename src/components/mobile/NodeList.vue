<script setup lang="ts">
/*
  节点列表 —— 「节点」页与「加速」页的节点弹层共用。

  按延迟从快到慢排，没测过的排后面，测过不通的排最后；原来的序号（NODE 01…）照留，
  与 WPE 那边下发的顺序对得上。名字<b>整行显示、放不下就换行</b>，不再截成半截。
  节点规则在手机上一条走代理的都没有时挂一个琥珀色标签（连接前就能看出来）。
*/
import { computed } from 'vue'
import type { ServerInfo } from '../../api'
import { t } from '../../i18n'
import LatencyBars from './LatencyBars.vue'
import { latencyTone } from './latency'

const props = defineProps<{
  servers: ServerInfo[]
  selectedId: string | null
  delays: Record<string, number>
  /** 平板宽屏上排成两列（弹层里不要） */
  grid?: boolean
}>()

const emit = defineEmits<{ (e: 'choose', id: string): void }>()

function rank(d: number | undefined): number {
  if (d === undefined) return 1
  return d < 0 ? 2 : 0
}

const rows = computed(() =>
  props.servers
    .map((s, i) => ({ s, i, d: props.delays[s.serverId] as number | undefined }))
    .sort((a, b) => rank(a.d) - rank(b.d) || (a.d ?? 0) - (b.d ?? 0) || a.i - b.i),
)

function latText(d: number | undefined): string {
  if (d === undefined) return '—'
  return d < 0 ? t('mob.timeout') : `${d} ms`
}
</script>

<template>
  <div class="nl" :class="{ grid }" role="radiogroup" :aria-label="t('mob.tabNodes')">
    <button
      v-for="r in rows" :key="r.s.serverId"
      class="nr" :class="{ sel: r.s.serverId === selectedId }"
      role="radio" :aria-checked="r.s.serverId === selectedId"
      @click="emit('choose', r.s.serverId)"
    >
      <span class="nm">
        <b>{{ r.s.serverName }}</b>
        <span class="meta">
          <span class="no">NODE {{ String(r.i + 1).padStart(2, '0') }}</span>
          <LatencyBars :ms="r.d" />
          <span class="lat" :class="'m-' + latencyTone(r.d)">{{ latText(r.d) }}</span>
          <span v-if="r.s.phoneRules && r.s.phoneRules.proxy === 0" class="m-tag warn">{{ t('mob.noProxyTag') }}</span>
        </span>
      </span>
      <svg v-if="r.s.serverId === selectedId" class="ico tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </button>
  </div>
</template>

<style scoped>
.nl { display: grid; gap: 8px; }

.nr {
  width: 100%;
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px 12px 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--m-radius);
  color: var(--gray);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.nr:active { background: rgb(var(--tint-rgb) / 5%); }
.nr.sel { border-color: var(--cyan); background: rgb(var(--cyan-rgb) / 7%); box-shadow: inset 3px 0 0 var(--cyan); }

.nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.nm b { font-weight: 500; font-size: var(--fs-body); line-height: 1.4; overflow-wrap: anywhere; }

.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.no { font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .1em; color: var(--muted); }
.lat { font-family: var(--mono); font-size: var(--fs-small); color: var(--dim2); }

.tick { width: 24px; height: 24px; flex: none; color: var(--cyan); stroke-width: 2.4; }

@media (min-width: 840px) {
  .nl.grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
</style>
