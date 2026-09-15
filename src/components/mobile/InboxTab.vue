<script setup lang="ts">
/*
  「消息」页：全局公告 + 服务器公告合成一个收件箱。
  手机上点一条进详情（系统返回键退回列表）；平板宽屏（≥ 840px）左列表右详情。
  未读状态存本机（stores/inbox.ts），标签栏角标读同一份。

  ⚠️ 公告类型映射必须覆盖 1..5 每一个取值（与 IntelBand.vue 同一张表），认不出来的当「活动」兜底。
*/
import { computed, ref, watch } from 'vue'
import type { NoticeInfo } from '../../api'
import { t, type Key } from '../../i18n'
import { isRead, markAllRead, markRead, noticeKey, readKeys } from '../../stores/inbox'
import { pushBack } from '../../useBackStack'
import PullHint from './PullHint.vue'
import { useMedia } from './useMedia'
import { usePullRefresh } from './usePullRefresh'

const props = defineProps<{ notices: NoticeInfo[]; visible: boolean; refresh: () => Promise<void> }>()
const emit = defineEmits<{ (e: 'open', url: string): void }>()

const TAGS: Record<number, { k: Key; s: Key }> = {
  1: { k: 'nt.1', s: 'nt.1s' },
  2: { k: 'nt.2', s: 'nt.2s' },
  3: { k: 'nt.3', s: 'nt.3s' },
  4: { k: 'nt.4', s: 'nt.4s' },
  5: { k: 'nt.5', s: 'nt.5s' },
}

const typeOf = (n: NoticeInfo) => (TAGS[n.noticeType] ? n.noticeType : 1)

const wide = useMedia('(min-width: 840px)')
const filter = ref(0)
const activeKey = ref<string | null>(null)

const types = computed(() => [...new Set(props.notices.map(typeOf))].sort((a, b) => a - b))
const list = computed(() => props.notices.filter((n) => !filter.value || typeOf(n) === filter.value))
const active = computed(() => props.notices.find((n) => noticeKey(n) === activeKey.value) ?? null)
const unread = computed(() => {
  void readKeys.value
  return props.notices.filter((n) => !isRead(n)).length
})

let dropBack: (() => void) | null = null

function releaseBack(): void {
  dropBack?.()
  dropBack = null
}

function openNotice(n: NoticeInfo): void {
  markRead(n)
  activeKey.value = noticeKey(n)
  if (!wide.value && !dropBack) dropBack = pushBack(() => { dropBack = null; activeKey.value = null })
}

function closeDetail(): void {
  activeKey.value = null
  releaseBack()
}

// 切到别的标签时，手机上的详情层级收起来（否则返回键会去关一个看不见的详情）
watch(() => props.visible, (v) => { if (!v && !wide.value) closeDetail() })
watch(wide, (w) => {
  if (w) releaseBack()
  else if (activeKey.value) dropBack = pushBack(() => { dropBack = null; activeKey.value = null })
})

const fmtTime = (s: string) => (s || '').replace('T', ' ').slice(0, 16)
const moreUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : 'http://' + u)

const page = ref<HTMLElement | null>(null)
const { pull, refreshing } = usePullRefresh(page, () => props.refresh())
</script>

<template>
  <div class="inbox" :class="{ wide }">
    <div v-show="wide || !active" ref="page" class="m-page pane list-pane">
      <PullHint :pull="pull" :refreshing="refreshing" />
      <div class="m-wrap">
        <header class="m-hd">
          <h1 class="m-title">{{ t('mob.tabInbox') }}</h1>
          <button v-if="unread" class="m-link" type="button" @click="markAllRead(notices)">{{ t('mob.readAll') }}</button>
        </header>

        <div v-if="types.length > 1" class="chips">
          <button class="m-chip" :class="{ on: !filter }" type="button" @click="filter = 0">{{ t('mob.all') }} {{ notices.length }}</button>
          <button v-for="ty in types" :key="ty" class="m-chip" :class="{ on: filter === ty }" type="button" @click="filter = ty">{{ t(TAGS[ty].k) }}</button>
        </div>

        <div v-if="list.length" class="m-card">
          <button
            v-for="n in list" :key="noticeKey(n)"
            class="ni" :class="{ on: wide && noticeKey(n) === activeKey }" type="button"
            @click="openNotice(n)"
          >
            <span class="m-tag" :class="'t' + typeOf(n)">{{ t(TAGS[typeOf(n)].s) }}</span>
            <span class="tt">
              <b :class="{ read: isRead(n) }">{{ n.noticeTitle }}</b>
              <time>{{ fmtTime(n.noticeTime) }}</time>
            </span>
            <i v-if="!isRead(n)" class="dot" :aria-label="'unread'" />
          </button>
        </div>

        <div v-else class="m-empty">
          <svg class="ico" viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          <span>{{ t('home.noNews') }}</span>
        </div>
      </div>
    </div>

    <div v-if="active || wide" class="m-page pane det-pane">
      <div class="m-wrap">
        <header v-if="!wide" class="m-hd">
          <button class="back" type="button" @click="closeDetail">
            <svg class="ico" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
            {{ t('mob.back') }}
          </button>
        </header>

        <article v-if="active" class="det">
          <span class="m-tag" :class="'t' + typeOf(active)">{{ t(TAGS[typeOf(active)].k) }}</span>
          <h2>{{ active.noticeTitle }}</h2>
          <time>{{ fmtTime(active.noticeTime) }}</time>
          <p class="tx">{{ active.noticeContent }}</p>
          <button v-if="active.noticeMore" class="m-btn cy more" type="button" @click="emit('open', moreUrl(active.noticeMore))">
            {{ t('home.more') }}
            <svg class="ico" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
          </button>
        </article>

        <div v-else class="m-empty">{{ t('mob.pickNotice') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inbox { height: 100%; }
.inbox.wide { display: grid; grid-template-columns: minmax(300px, 400px) minmax(0, 1fr); }
.inbox.wide .list-pane { border-right: 1px solid var(--border); }
.inbox.wide .det-pane .m-wrap { padding-top: 24px; }

.chips { min-width: 0; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 0 16px; }
.chips .m-chip { flex: none; }
.list-pane .m-wrap { min-width: 0; }
.chips::-webkit-scrollbar { display: none; }

.ni { position: relative; width: 100%; min-height: 64px; display: flex; align-items: flex-start; gap: 10px; padding: 12px 34px 12px 14px; border: 0; background: transparent; color: var(--gray); font: inherit; text-align: left; cursor: pointer; }
.ni + .ni { border-top: 1px solid var(--border); }
.ni:active { background: rgb(var(--tint-rgb) / 5%); }
.ni.on { background: rgb(var(--cyan-rgb) / 7%); box-shadow: inset 3px 0 0 var(--cyan); }
.ni .m-tag { margin-top: 2px; }
.tt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tt b { font-weight: 600; line-height: 1.45; overflow-wrap: anywhere; }
.tt b.read { font-weight: 400; color: var(--soft); }
.tt time, .det time { font-family: var(--mono); font-size: var(--fs-caption); color: var(--dim2); }
.dot { position: absolute; top: 18px; right: 14px; width: 8px; height: 8px; border-radius: 50%; background: var(--danger); }

.back { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; margin-left: -8px; padding: 0 8px; border: 0; background: transparent; color: var(--soft); font: inherit; cursor: pointer; }
.back .ico { width: 20px; height: 20px; }

.det { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.det h2 { margin: 4px 0 0; font-size: var(--fs-title); line-height: 1.4; text-wrap: balance; overflow-wrap: anywhere; }
.tx { margin: 8px 0 0; line-height: 1.8; color: var(--soft); white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
.more { flex: none; width: auto; margin-top: 8px; }
</style>
