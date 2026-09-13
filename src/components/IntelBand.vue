<script setup lang="ts">
/*
  情报带（方案 A）—— 公告沉到底部一整条：左边列表、右边详情。
  主页与控制中心共用，所以连上之后公告照样看得到。

  ⚠️ 公告类型的映射表<b>必须覆盖 C# 枚举的每一个取值</b>：漏掉的那个查出来是 undefined，
  界面上那一格是空白而且不报错。认不出来的一律当「活动」兜底。
*/
import { computed, ref, watch } from 'vue'
import { api, type NoticeInfo } from '../api'
import { t, type Key } from '../i18n'

const props = defineProps<{ notices: NoticeInfo[] }>()

const TAGS: Record<number, { k: Key; s: Key; c: string }> = {
  1: { k: 'nt.1', s: 'nt.1s', c: 'cyan' },
  2: { k: 'nt.2', s: 'nt.2s', c: 'amber' },
  3: { k: 'nt.3', s: 'nt.3s', c: 'ok' },
  4: { k: 'nt.4', s: 'nt.4s', c: 'violet' },
  5: { k: 'nt.5', s: 'nt.5s', c: 'cyan' },
}

function tag(type: number) { return TAGS[type] ?? TAGS[1] }

const active = ref(0)
watch(() => props.notices, () => { active.value = 0 })

const cur = computed(() => props.notices[active.value] ?? null)

function openMore(url?: string): void {
  if (!url) return
  api.openExternal(/^https?:\/\//i.test(url) ? url : 'http://' + url).catch(() => {})
}
</script>

<template>
  <section class="intel">
    <div class="list">
      <button
        v-for="(n, i) in notices" :key="i"
        class="li" :class="{ on: i === active }"
        @click="active = i"
      >
        <span class="tg" :class="tag(n.noticeType).c">{{ t(tag(n.noticeType).s) }}</span>
        <span class="tt">{{ n.noticeTitle }}</span>
        <time>{{ (n.noticeTime || '').slice(0, 10) }}</time>
      </button>
      <div v-if="!notices.length" class="none">{{ t('home.noNews') }}</div>
    </div>

    <div class="det">
      <div class="dh">
        <span class="code">INTEL // {{ t('home.news') }}</span>
        <span class="cnt">{{ notices.length }}</span>
      </div>

      <template v-if="cur">
        <h4 :title="cur.noticeTitle">
          <span class="tg" :class="tag(cur.noticeType).c">{{ t(tag(cur.noticeType).k) }}</span>
          {{ cur.noticeTitle }}
        </h4>
        <!-- 正文自己滚，C# 那边存的换行要保住 -->
        <p class="tx">{{ cur.noticeContent }}</p>
        <button v-if="cur.noticeMore" class="more" @click="openMore(cur.noticeMore)">
          {{ t('home.more') }}
          <svg class="ico" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
        </button>
      </template>
      <p v-else class="tx dim">{{ t('home.noNews') }}</p>
    </div>
  </section>
</template>

<style scoped>
.intel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  border: 1px solid var(--border);
  background: var(--card);
}

.list { min-height: 0; overflow-y: auto; border-right: 1px solid var(--border); }

.li {
  width: 100%;
  min-height: 34px;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--wpe-rowline);
  box-shadow: inset 2px 0 0 transparent;
  color: var(--soft);
  font-family: inherit;
  font-size: var(--fs-body);
  text-align: left;
  cursor: pointer;
}

.li:hover { background: rgb(var(--tint-rgb) / 4%); }
.li.on { background: rgb(var(--cyan-rgb) / 7%); box-shadow: inset 2px 0 0 var(--cyan); color: var(--gray); }
.li:focus-visible { outline-offset: -2px; outline-color: var(--cyan); }
.li .tg { justify-self: start; }
.tt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
time { font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .08em; color: var(--dim2); }

.none { padding: 14px; font-size: var(--fs-small); color: var(--dim2); }

.det { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding: 10px 18px 12px; }
.dh { display: flex; justify-content: space-between; align-items: center; }
.code { position: relative; top: 1px; font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .18em; text-transform: uppercase; color: var(--green); }   /* 100% 缩放实测偏高 1.4px（2026-09-13） */
.cnt { font-family: var(--share); font-size: var(--fs-caption); color: var(--dim2); }

h4 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: var(--fs-lead);
  font-weight: 600;
  color: var(--gray);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

h4 .tg { flex: none; }

.tx {
  flex: 1;
  min-height: 0;
  margin: 0;
  overflow-y: auto;
  font-size: var(--fs-small);
  line-height: 1.7;
  color: var(--soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}

.tx.dim { color: var(--dim2); }

.more {
  flex: none;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--cyan);
  font-family: var(--share);
  font-size: var(--btn-size);
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
  cursor: pointer;
}

.more:hover { color: var(--green); }
.more .ico { width: 13px; height: 13px; }
</style>
