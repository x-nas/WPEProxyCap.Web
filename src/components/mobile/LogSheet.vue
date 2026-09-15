<script setup lang="ts">
/*
  手机版的系统日志（2026-09-15 重做，取代手机上的 LogModal 三列表格）。

  表格在三百多像素宽的手机上只能把日志内容截成「Android 9 (…」，而日志恰恰是要看全文的。所以改成一条一张卡片：
    上一行：时间 · 模块 · 等级；下一行：日志全文，自动换行、可以长按选中复制。
  · 最新的在最上面（出问题时先看最后发生的几条）；
  · 顶部按等级筛选（全部 / 错误 / 警告 / 信息 / 调试，只列出有的等级），带条数；
  · 「API 检测 / 系统检测 / 清除日志」放在固定的底栏里；
  · 弹层高度固定（BottomSheet 的 fixed）—— 点检测按钮新增日志时面板不会跟着一跳一跳地变高，只有列表自己滚。
*/
import { computed, ref, watch } from 'vue'
import type { LogItem } from '../../api'
import { t, tf, type Key } from '../../i18n'
import BottomSheet from './BottomSheet.vue'

const props = defineProps<{ open: boolean; logs: LogItem[] }>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'check-api'): void
  (e: 'check-system'): void
  (e: 'clear'): void
}>()

/** LogItem.type：0 Info 1 Warning 2 Error 3 Debug（与原生侧 LogType 同序）。筛选按严重程度排 */
const LEVELS: Array<{ id: number; k: Key; tone: string }> = [
  { id: 2, k: 'mob.logError', tone: 'd' },
  { id: 1, k: 'mob.logWarn', tone: 'a' },
  { id: 0, k: 'mob.logInfo', tone: 'i' },
  { id: 3, k: 'mob.logDebug', tone: 'v' },
]

const levelOf = (type: number) => LEVELS.find((l) => l.id === type) ?? LEVELS[2]

const filter = ref(-1)

watch(() => props.open, (on) => { if (on) filter.value = -1 })

const counts = computed(() => {
  const c: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  props.logs.forEach((l) => { c[l.type] = (c[l.type] ?? 0) + 1 })
  return c
})

const rows = computed(() =>
  props.logs
    .map((l, i) => ({ ...l, key: i }))
    .filter((l) => filter.value < 0 || l.type === filter.value)
    .reverse())

function fmt(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toTimeString().slice(0, 8)
}

function clear(): void {
  filter.value = -1
  emit('clear')
}
</script>

<template>
  <BottomSheet :open="props.open" :title="t('log.title')" fixed @update:open="emit('update:open', $event)">
    <template #action>
      <span class="cnt">{{ tf('log.count', logs.length) }}</span>
    </template>

    <div class="lv">
      <div v-if="logs.length" class="chips">
        <button class="m-chip" :class="{ on: filter < 0 }" type="button" @click="filter = -1">{{ t('mob.all') }} {{ logs.length }}</button>
        <template v-for="l in LEVELS" :key="l.id">
          <button v-if="counts[l.id]" class="m-chip" :class="['c-' + l.tone, { on: filter === l.id }]" type="button" @click="filter = l.id">
            {{ t(l.k) }} {{ counts[l.id] }}
          </button>
        </template>
      </div>

      <ol v-if="rows.length" class="entries">
        <li v-for="r in rows" :key="r.key" class="le" :class="'t-' + levelOf(r.type).tone">
          <div class="meta">
            <time>{{ fmt(r.logTime) }}</time>
            <span class="mod">{{ r.logName }}</span>
            <span class="lvl">{{ t(levelOf(r.type).k) }}</span>
          </div>
          <p class="msg">{{ r.logContent }}</p>
        </li>
      </ol>

      <div v-else class="m-empty">
        <svg class="ico" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
        <span>{{ t('log.empty') }}</span>
      </div>
    </div>

    <template #footer>
      <button class="m-btn act" type="button" @click="emit('check-api')">{{ t('log.apiCheck') }}</button>
      <button class="m-btn act" type="button" @click="emit('check-system')">{{ t('log.sysCheck') }}</button>
      <button class="m-btn act dg" type="button" :disabled="!logs.length" @click="clear">{{ t('log.clear') }}</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.cnt { font-family: var(--mono); font-size: var(--fs-small); color: var(--dim2); white-space: nowrap; }

.lv { display: flex; flex-direction: column; gap: 10px; }

/* 筛选条贴在滚动区顶上，往下翻日志时一直够得着 */
.chips {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -16px;
  padding: 2px 16px 10px;
  background: var(--card);
}
.chips::-webkit-scrollbar { display: none; }
.chips .m-chip { flex: none; }
.chips .m-chip.c-d.on { border-color: var(--danger); color: var(--danger); background: rgb(var(--danger-rgb) / 10%); }
.chips .m-chip.c-a.on { border-color: var(--amber); color: var(--amber); background: rgb(var(--amber-rgb) / 10%); }
.chips .m-chip.c-v.on { border-color: var(--acc-violet); color: var(--acc-violet); background: rgb(var(--violet-rgb) / 10%); }

.entries { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }

.le {
  position: relative;
  padding: 10px 12px 11px 15px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgb(var(--inset-rgb) / 16%);
  overflow: hidden;
}

/* 左边一条等级色：扫一眼就知道哪几条是错误 */
.le::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--border2); }
.le.t-d::before { background: var(--danger); }
.le.t-a::before { background: var(--amber); }
.le.t-i::before { background: var(--cyan); }
.le.t-v::before { background: var(--acc-violet); }

.meta { display: flex; align-items: center; gap: 8px; min-width: 0; }
.meta time { font-family: var(--mono); font-size: var(--fs-caption); color: var(--dim2); }
.mod { min-width: 0; padding: 0 6px; border-radius: 4px; background: rgb(var(--tint-rgb) / 6%); font-family: var(--mono); font-size: var(--fs-caption); color: var(--soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lvl { flex: none; margin-left: auto; font-size: var(--fs-caption); }
.le.t-d .lvl { color: var(--danger); }
.le.t-a .lvl { color: var(--amber); }
.le.t-i .lvl { color: var(--cyan); }
.le.t-v .lvl { color: var(--acc-violet); }

.msg {
  margin: 6px 0 0;
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--gray);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}
.le.t-d .msg { color: var(--danger); }

/* 底栏三颗按钮平分一行：窄屏与英文 / 俄文下收小字号与内边距，不折行 */
.act { padding: 0 6px; font-size: var(--fs-small); }
.act:disabled { opacity: .4; }
</style>
