<script setup lang="ts">
/*
  系统日志。

  改造前是 a-table + 一堆 wrapClassName 的全局覆盖（固定表体高度、把空状态行的
  分隔线去掉、让 "No data" 垂直居中…）—— 十几条规则都在跟组件内部类名较劲。
  换成自绘的表之后那些全部不需要了：表头一行、行一行、空态一块，共三条规则。

  【为什么不做虚拟滚动】上限 200 条（App.vue 里的环形），200 个 div 对 Chromium
  不算什么；而虚拟滚动会让「选中一段复制」变得别扭 —— 日志恰恰最需要复制。
  （WPE 的系统日志页出于同样的理由也没做。）
*/
import { computed, onBeforeUnmount, ref } from 'vue'
import type { LogItem } from '../api'
import { t, tf } from '../i18n'
import CyberModal from './CyberModal.vue'

const props = defineProps<{ open: boolean; logs: LogItem[] }>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'check-api'): void
  (e: 'check-system'): void
  (e: 'clear'): void
}>()

/** 0 Info 1 Warning 2 Error 3 Debug —— 与 Models.cs 的 LogType 同序 */
const TONE = ['g', 'a', 'd', 'v']

function fmt(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toTimeString().slice(0, 8)
}

/* 倒序显示（最新在上）—— 出问题时先看的是最后发生的那几条 */
const rows = computed(() => props.logs.map((l, i) => ({ ...l, key: i })).reverse())

/*
  「模块」列可拖宽（2026-09-13 按要求）：ConnectWithProxy 这类长模块名在默认宽度下被截。
  表头右边界一条 7px 的手柄，双击恢复默认。表头与行共用同一份列模板，拖的时候两边一起变。
  ⚠️ 鼠标监听挂在 window 上 —— 快拖时鼠标会跑出那条窄条。宽度不持久化，关掉弹窗再开回默认。
*/
const MD_DEFAULT = 112
const MD_MIN = 60
const MD_MAX = 360
const mdW = ref(MD_DEFAULT)
const cols = computed(() => ({ gridTemplateColumns: `78px ${mdW.value}px 1fr` }))

let dragX = 0
let dragW = 0

function onMove(e: MouseEvent): void {
  mdW.value = Math.max(MD_MIN, Math.min(MD_MAX, dragW + e.clientX - dragX))
}

function onUp(): void {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  document.body.style.cursor = ''
}

function startResize(e: MouseEvent): void {
  if (e.button !== 0) return
  e.preventDefault()
  dragX = e.clientX
  dragW = mdW.value
  document.body.style.cursor = 'col-resize'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

onBeforeUnmount(onUp)
</script>

<template>
  <CyberModal
    :open="props.open"
    :title="t('log.title')"
    subtitle="System Log"
    :width="760"
    :body-height="440"
    readonly
    @update:open="emit('update:open', $event)"
  >
    <div class="lg list-page">
      <div class="bar">
        <button class="mini" @click="emit('check-api')">{{ t('log.apiCheck') }}</button>
        <button class="mini" @click="emit('check-system')">{{ t('log.sysCheck') }}</button>
        <button class="mini danger" :disabled="!logs.length" @click="emit('clear')">{{ t('log.clear') }}</button>
        <span class="grow" />
        <span class="cnt">{{ tf('log.count', logs.length) }}</span>
      </div>

      <div class="head" :style="cols">
        <span>{{ t('log.time') }}</span>
        <span class="mdh">{{ t('log.module') }}<i class="rz" @mousedown="startResize" @dblclick="mdW = MD_DEFAULT" /></span>
        <span>{{ t('log.content') }}</span>
      </div>

      <div class="body">
        <div v-for="r in rows" :key="r.key" class="row" :class="TONE[r.type] || 'g'" :style="cols">
          <span class="tm">{{ fmt(r.logTime) }}</span>
          <span class="md" :title="r.logName">{{ r.logName }}</span>
          <span class="ct" :title="r.logContent">{{ r.logContent }}</span>
        </div>

        <div v-if="!rows.length" class="empty">{{ t('log.empty') }}</div>
      </div>
    </div>
  </CyberModal>
</template>

<style scoped>
.lg { height: 100%; padding: 0 20px 8px; }

.bar { border: 0; border-bottom: 1px solid var(--border); background: transparent; padding: 4px 0 8px; }
.cnt { font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .14em; color: var(--dim2); }

/*
  ⚠️ 表头与数据行在<b>同一个容器里</b>用的同一份列模板，但表头在滚动区<b>外面</b>。
  那就必须给表头补一个滚动条的宽度，否则滚动条一出现（日志多半会出现）行就比表头
  窄 10px，后面几列全错开 —— WPE 的客户端列表实测撞到过（逐列偏 -5 / -10）。
    · .body 用 scrollbar-gutter: stable 让槽位一直留着，宽度恒定；
    · .head 吃不到那个槽位，自己补一个等宽的右内边距。
  列模板本身由 :style 给（模块列宽可拖），这里只管间距。
*/
.head,
.row { gap: 10px; padding: 0 0 0 2px; }
.head { padding-right: 10px; background: transparent; border-bottom: 1px solid rgb(var(--border-rgb) / 60%); }

/* 列宽手柄：贴在「模块」表头格的右沿，往外伸半个列缝，鼠标好对准 */
.mdh { position: relative; overflow: visible !important; }
.rz { position: absolute; top: 0; bottom: 0; right: -8px; width: 7px; cursor: col-resize; }
.rz::after { content: ""; position: absolute; top: 25%; bottom: 25%; left: 3px; width: 1px; background: var(--border); }
.rz:hover::after { background: var(--cyan); }

.body { flex: 1; min-height: 0; overflow-y: auto; scrollbar-gutter: stable; }

/* 日志行比列表行矮一档：它是一屏要塞进几十条的东西 */
.row { height: 26px; font-size: var(--fs-small); border-bottom: 1px solid rgb(var(--border-rgb) / 35%); }

.tm { font-family: var(--share); letter-spacing: .06em; color: var(--dim2); }
.md { color: var(--dim3); }
.ct { user-select: text; }

/* 等级色只给「内容」那一列 —— 时间与模块是记账信息，跟着变色只会让整张表花 */
.row.g .ct { color: var(--soft); }
.row.a .ct { color: var(--amber); }
.row.d .ct { color: var(--danger); }
.row.v .ct { color: var(--acc-violet); }

.empty { padding: 60px 20px; }
</style>
