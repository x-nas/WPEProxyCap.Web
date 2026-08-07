<script setup lang="ts">
import { computed } from 'vue'
import type { LogItem } from '../api'

const props = defineProps<{ open: boolean; logs: LogItem[] }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'check-api'): void
  (e: 'check-system'): void
  (e: 'clear'): void
}>()

const columns = [
  { title: '时间', dataIndex: 'logTime', key: 'logTime', width: 110, customRender: ({ text }: any) => fmt(text) },
  { title: '模块', dataIndex: 'logName', key: 'logName', width: 90 },
  { title: '日志内容', dataIndex: 'logContent', key: 'logContent', ellipsis: true },
]

function fmt(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toTimeString().slice(0, 8)
}

// 倒序显示（最新在上）
const rows = computed(() => props.logs.map((l, i) => ({ ...l, key: i })).reverse())
const rowClassName = (r: LogItem) => `log-${r.type}` // 0 Info 1 Warning 2 Error 3 Debug
</script>

<template>
  <a-modal :open="open" title="系统日志" :footer="null" centered width="720px"
           wrap-class-name="log-modal-wrap"
           @update:open="emit('update:open', $event)">
    <div class="log-actions">
      <a-button size="small" @click="emit('check-api')">API 检测</a-button>
      <a-button size="small" @click="emit('check-system')">系统检测</a-button>
      <a-button size="small" @click="emit('clear')">清除日志</a-button>
      <span class="log-count">共 {{ logs.length }} 条</span>
    </div>
    <a-table
      class="log-table"
      :columns="columns" :data-source="rows"
      :row-class-name="rowClassName"
      size="small" :pagination="false"
      :scroll="{ y: 400 }" />
  </a-modal>
</template>

<style scoped>
.log-actions { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.log-count { margin-left: auto; font-size: 12px; color: #64748b; }
.log-table :deep(.log-0) td { color: #34d399; }
.log-table :deep(.log-1) td { color: #fbbf24; }
.log-table :deep(.log-2) td { color: #f43f5e; }
.log-table :deep(.log-3) td { color: #c084fc; }
.log-table :deep(td) { font-family: Consolas, monospace; font-size: 12px; }
</style>

<!-- 弹窗 teleport 到 body，scoped 够不到，用 wrapClassName 固定弹窗内容区高度，使其不随日志行数缩放。
     并让表格撑满内容区（flex 填充），避免行数少时下方露出与表格不一致的弹窗背景。 -->
<style>
/* 标题颜色与订阅设置弹窗一致（天蓝 #38bdf8，即主界面左上角软件名同色） */
.log-modal-wrap .ant-modal-title { color: #38bdf8; }
.log-modal-wrap .ant-modal-body { height: 460px; overflow: hidden; display: flex; flex-direction: column; }
.log-modal-wrap .log-table { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.log-modal-wrap .log-table .ant-spin-nested-loading,
.log-modal-wrap .log-table .ant-spin-container,
.log-modal-wrap .log-table .ant-table,
.log-modal-wrap .log-table .ant-table-container { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
/* 表体填满剩余高度：空白区并入表格、背景统一为表格容器背景 */
.log-modal-wrap .log-table .ant-table-body,
.log-modal-wrap .log-table .ant-table-placeholder { flex: 1 1 auto; max-height: none !important; }
.log-modal-wrap .log-table .ant-table-body { background: rgba(2,6,23,.5); }
/* 去掉"No data"空状态行的单元格底部分隔线（撑满高度后它会单独露出成一条横线） */
.log-modal-wrap .log-table .ant-table-placeholder > td,
.log-modal-wrap .log-table .ant-table-placeholder .ant-table-cell { border-bottom: none !important; }
/* 占位行背景透明并禁用 hover 高亮，避免鼠标移到 No data 时该行与下方空白区背景不一致 */
.log-modal-wrap .log-table .ant-table-placeholder > td,
.log-modal-wrap .log-table .ant-table-placeholder:hover > td { background: transparent !important; }
/* "No data" 在表体里垂直居中：仅给空状态占位单元格撑高并垂直居中，
   数据行是另外的 tr、不受影响（仍按固定行高从上往下排列）。高度≈表体可视高。 */
.log-modal-wrap .log-table .ant-table-placeholder > td { height: 380px; vertical-align: middle; }
</style>
