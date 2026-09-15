<script setup lang="ts">
/*
  「节点」页：全部节点，按延迟排序；右上角「重新测速」，下拉刷新订阅（顺带重测）。
  已连接时不能换节点（VPN 与控制通道都绑在当前节点上），列表照看、点了提示先断开。
*/
import { inject, ref } from 'vue'
import type { AppState, ServerInfo } from '../../api'
import { t, tf } from '../../i18n'
import NodeList from './NodeList.vue'
import PullHint from './PullHint.vue'
import { LOGIN } from './inject'
import { usePullRefresh } from './usePullRefresh'

const props = defineProps<{
  state: AppState | null
  servers: ServerInfo[]
  delays: Record<string, number>
  testing: boolean
  connected: boolean
  refresh: () => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'retest'): void
  (e: 'subscribe'): void
  (e: 'choose', id: string): void
}>()

const { selectedId } = inject(LOGIN)!

const page = ref<HTMLElement | null>(null)
const { pull, refreshing } = usePullRefresh(page, () => props.refresh())
</script>

<template>
  <div ref="page" class="m-page">
    <PullHint :pull="pull" :refreshing="refreshing" />

    <div class="m-wrap wide">
      <header class="m-hd">
        <h1 class="m-title">{{ t('mob.tabNodes') }}</h1>
        <button v-if="servers.length" class="m-chipbtn" type="button" data-probe="retest" :disabled="testing" @click="emit('retest')">
          <svg class="ico" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.3L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.3 4.3L20 15" /><path d="M20 20v-5h-5" /></svg>
          {{ testing ? t('mob.testing') : t('mob.retest') }}
        </button>
      </header>

      <!--
        订阅号：有节点之后改订阅号的入口（2026-09-15 从「我的」页挪来）。
        ⚠️ 别删：加速页只在没有节点时才有「设置订阅」，有节点之后这一行是唯一入口。
      -->
      <div v-if="servers.length" class="m-card">
        <button class="m-row" type="button" data-probe="sub" @click="emit('subscribe')">
          <span class="k">{{ t('sub.id') }}</span>
          <span class="v mono">{{ state?.subscriberName || t('sub.none') }}</span>
          <svg class="ico chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      <template v-if="servers.length">
        <p class="m-sub">{{ tf('mob.nodesCount', servers.length) }}</p>

        <div v-if="connected" class="m-strip info">
          <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          <span class="tx">{{ t('mob.nodeLocked') }}</span>
        </div>

        <NodeList grid :servers="servers" :selected-id="selectedId" :delays="delays" @choose="emit('choose', $event)" />
      </template>

      <div v-else class="m-empty">
        <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18" /></svg>
        <span>{{ t('mob.noNode') }}</span>
        <button class="m-btn cy grow-0" type="button" @click="emit('subscribe')">{{ t('mob.goSub') }}</button>
      </div>

      <p v-if="state?.subscriberName" class="from">{{ tf('mob.nodesFrom', state.subscriberName, state.subscriberTime || t('sub.never')) }}</p>
    </div>
  </div>
</template>

<style scoped>
.from { margin: 4px 0 0; font-size: var(--fs-small); color: var(--dim2); text-align: center; overflow-wrap: anywhere; }
.grow-0 { flex: none; width: auto; }
</style>
