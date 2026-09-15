<script setup lang="ts">
import { t } from '../../i18n'
import { PULL_THRESHOLD } from './usePullRefresh'

defineProps<{ pull: number; refreshing: boolean }>()
</script>

<template>
  <div class="m-pull" :style="{ height: pull + 'px' }" aria-live="polite">
    <span v-if="refreshing" class="loader c"><i /><i /><i /></span>
    <span v-if="pull || refreshing">
      {{ refreshing ? t('mob.refreshing') : pull >= PULL_THRESHOLD ? t('mob.release') : t('mob.pull') }}
    </span>
  </div>
</template>
