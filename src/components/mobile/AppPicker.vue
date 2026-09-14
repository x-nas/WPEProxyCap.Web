<script setup lang="ts">
/*
  分应用代理（只有手机版）。

  两档：
    全部应用   —— 除本应用外所有应用的流量都进 VPN（与 Windows 版「全局接管」同义）
    仅选中应用 —— 只有勾上的应用进 VPN，其余直连（微信、支付之类不进代理）

  实现在原生侧：建隧道时 VpnService.Builder 按这份名单 addAllowedApplication / addDisallowedApplication。
  VPN 的应用范围只能在建隧道那一刻定，所以<b>连接中改了要到下一次连接才生效</b>，提示里说清楚。

  列表取的是「有启动图标的应用」（原生侧用 <queries> 声明 LAUNCHER 意图，不需要 QUERY_ALL_PACKAGES 权限），
  系统应用默认藏起来。选中的排在最前，其余按名字排。
*/
import { computed, ref, watch } from 'vue'
import { api, type AppEntry } from '../../api'
import { t, tf } from '../../i18n'
import CyberModal from '../CyberModal.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()

const mode = ref<'all' | 'selected'>('all')
const picked = ref(new Set<string>())
const apps = ref<AppEntry[]>([])
const loading = ref(false)
const busy = ref(false)
const err = ref('')
const q = ref('')
const showSys = ref(false)

watch(() => props.open, async (on) => {
  if (!on) return
  err.value = ''
  q.value = ''
  loading.value = true
  try {
    const cur = await api.getAppProxy()
    mode.value = cur.mode
    picked.value = new Set(cur.packages)
    apps.value = await api.getApps()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})

const rows = computed(() => {
  const key = q.value.trim().toLowerCase()
  const sel = picked.value
  return apps.value
    .filter((a) => showSys.value || !a.system || sel.has(a.pkg))
    .filter((a) => !key || a.label.toLowerCase().includes(key) || a.pkg.toLowerCase().includes(key))
    .sort((a, b) => Number(sel.has(b.pkg)) - Number(sel.has(a.pkg)) || a.label.localeCompare(b.label))
})

function toggle(pkg: string): void {
  const next = new Set(picked.value)
  if (next.has(pkg)) next.delete(pkg)
  else next.add(pkg)
  picked.value = next
}

async function save(): Promise<void> {
  err.value = ''
  if (mode.value === 'selected' && picked.value.size === 0) { err.value = t('mob.appsNone'); return }
  busy.value = true
  try {
    await api.setAppProxy(mode.value, [...picked.value])
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <CyberModal
    :open="props.open"
    :title="t('mob.apps')"
    subtitle="Per-app"
    :busy="busy"
    :error="err"
    :width="560"
    @update:open="emit('update:open', $event)"
    @save="save"
  >
    <div class="ap">
      <div class="modes" role="radiogroup" :aria-label="t('mob.apps')">
        <button class="rd" :class="{ on: mode === 'all' }" role="radio" :aria-checked="mode === 'all'" @click="mode = 'all'">
          <i />{{ t('mob.appsModeAll') }}
        </button>
        <button class="rd" :class="{ on: mode === 'selected' }" role="radio" :aria-checked="mode === 'selected'" @click="mode = 'selected'">
          <i />{{ t('mob.appsModeSel') }}
        </button>
      </div>

      <p class="ds">{{ t('mob.appsDesc') }}</p>

      <template v-if="mode === 'selected'">
        <div class="tools">
          <input id="ap-q" v-model="q" class="inp" type="search" autocapitalize="off" :placeholder="t('mob.appsSearch')" />
          <button class="chk" :class="{ on: showSys }" @click="showSys = !showSys"><i />{{ t('mob.appsSystem') }}</button>
        </div>

        <div class="cnt">{{ tf('mob.appsCount', picked.size) }}</div>

        <div class="list">
          <div v-if="loading" class="empty">{{ t('mob.appsLoading') }}</div>
          <div v-else-if="!rows.length" class="empty">{{ t('mob.appsEmpty') }}</div>
          <button v-for="a in rows" v-else :key="a.pkg" class="app" :class="{ on: picked.has(a.pkg) }"
                  role="checkbox" :aria-checked="picked.has(a.pkg)" @click="toggle(a.pkg)">
            <img :src="a.icon" alt="" width="32" height="32" loading="lazy" />
            <span class="nm"><b>{{ a.label }}</b><i>{{ a.pkg }}</i></span>
            <span class="box" />
          </button>
        </div>
      </template>
    </div>
  </CyberModal>
</template>

<style scoped>
.ap { display: flex; flex-direction: column; gap: 10px; padding: 12px 16px 10px; }

.modes { display: flex; flex-wrap: wrap; gap: 8px 22px; }
.modes .rd { min-height: 32px; }

.ds { margin: 0; font-size: var(--fs-small); line-height: 1.65; color: var(--dim2); }

.tools { display: flex; align-items: center; gap: 10px 12px; flex-wrap: wrap; }
/* 搜索框独占一行：与「显示系统应用」挤一行时，英文提示语在 390 宽的手机上被截成「Search by name or pa」 */
.tools .inp { flex: 1 1 100%; min-width: 0; height: 38px; }
.tools .chk { min-height: 32px; }

.cnt { font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .14em; text-transform: uppercase; color: var(--cyan); }

.list {
  max-height: 46vh;
  overflow-y: auto;
  border: 1px solid var(--border);
  background: rgb(var(--inset-rgb) / 20%);
}

.app {
  width: 100%;
  min-height: 52px;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--wpe-rowline);
  box-shadow: inset 2px 0 0 transparent;
  color: var(--soft);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.app.on { background: rgb(var(--cyan-rgb) / 7%); box-shadow: inset 2px 0 0 var(--cyan); color: var(--gray); }
.app:focus-visible { outline-offset: -2px; outline-color: var(--cyan); }

.app img { width: 32px; height: 32px; object-fit: contain; }

.nm { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nm b { font-weight: 400; font-size: var(--fs-body); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nm i { font-style: normal; font-family: var(--share); font-size: var(--fs-caption); letter-spacing: .04em; color: var(--dim2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 勾选框：盒 16px + inset 4px（4 的倍数，缩放下才居中），与全项目同一条规矩 */
.box { position: relative; width: 16px; height: 16px; border: 1px solid var(--dim); }
.app.on .box { border-color: var(--cyan); }
.app.on .box::after { content: ""; position: absolute; inset: 4px; background: var(--cyan); }

.empty { padding: 36px 16px; text-align: center; font-size: var(--fs-small); color: var(--dim2); }
</style>
