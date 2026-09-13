<script setup lang="ts">
/*
  用户协议 / 隐私政策的全文。

  正文从 App_Data 里的两个 txt 读出来（内嵌进 exe，C# 的 ReadAgreementAsync），
  这里只负责排版：按行拆开，标题行（「一、」「二、」这类中文序号）与版权行单独着色。

  ⚠️ <b>全文要能选中复制</b> —— body 上是 user-select: none，所以这一块显式放开。
  ⚠️ 用 <pre> 保住原文的缩进与空行：协议正文的排版本身是有意义的。
*/
import { computed } from 'vue'
import CyberModal from './CyberModal.vue'

const props = defineProps<{ open: boolean; title: string; text: string }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const lines = computed(() =>
  (props.text || '').split('\n').map((s) => ({
    text: s,
    heading: /^\s*[一二三四五六七八九十百零]+、/.test(s),
    copyright: /^\s*©/.test(s),
  })))
</script>

<template>
  <CyberModal
    :open="props.open"
    :title="props.title"
    subtitle="Legal"
    :width="680"
    :body-height="460"
    readonly
    @update:open="emit('update:open', $event)"
  >
    <div class="ag">
      <p v-for="(l, i) in lines" :key="i" class="ln"
         :class="{ h: l.heading, cp: l.copyright }">{{ l.text || ' ' }}</p>
    </div>
  </CyberModal>
</template>

<style scoped>
.ag { padding: 6px 24px 16px; user-select: text; }

.ln {
  margin: 0;
  min-height: 1.75em;
  font-size: var(--fs-body);
  line-height: 1.75;
  color: var(--soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* 章节标题：青色 —— 与弹窗标题同色，一眼扫得出分节 */
.ln.h { margin-top: 8px; color: var(--cyan); }

/* 版权行：小一号 + 最不显眼的那一档灰 */
.ln.cp { font-size: var(--fs-small); color: var(--dim); }
</style>
