<script setup lang="ts">
import { computed } from 'vue'
import { latencyLevel } from './latency'

const props = defineProps<{ ms: number | undefined }>()
const level = computed(() => latencyLevel(props.ms))
</script>

<template>
  <span class="m-bars" :class="'l' + level" aria-hidden="true"><i /><i /><i /><i /></span>
</template>
