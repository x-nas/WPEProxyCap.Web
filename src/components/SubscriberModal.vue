<script setup lang="ts">
/*
  订阅设置。

  【订阅号的口径，界面上必须说清】
  订阅号<b>只能由订阅服务器签发</b>，客户端与 WPE x64 都无法自行创建；
  而且<b>服务器地址也只能经订阅号取得</b> —— 没有订阅号连不上。
  这两句写在下面那条提示里（`sub.hint`），与官网 wpc.html 是同一套说法。

  ⚠️⚠️ <b>「不用订阅号也能连 —— 手填服务器地址即可」是错的，2026-09-12 已改掉。</b>
  那句话从官网抄过来，而它在<b>这个客户端上从来不成立</b>：
  `AppConfig.SubscriberIP` / `SubscriberPort` 全项目<b>只有一处写入</b>
  （`ProxyService.SetSubscriberAsync`，从订阅服务器的应答里取），界面上没有任何入口能手填；
  没有订阅号时 `GetServerListAsync` 连请求都不发、`_servers` 留空，
  服务器下拉就是「暂无服务器」。账号密码确实是手填的（主页那两个框），
  但那两件事被那句话混成了一件。

  改造前它是 a-modal + a-input，这一轮换成自绘的 CyberModal + .inp ——
  顺带把 ant-design-vue 整个依赖去掉了。
*/
import { ref, watch } from 'vue'
import { api } from '../api'
import { t } from '../i18n'
import { pushToast } from '../stores/toast'
import CyberModal from './CyberModal.vue'

const props = defineProps<{ open: boolean; subscriberName: string | null; subscriberTime: string | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'updated'): void }>()

const input = ref('')
const busy = ref(false)
const err = ref('')

watch(() => props.open, (v) => {
  if (!v) return
  input.value = props.subscriberName ?? ''
  err.value = ''
})

async function update(): Promise<void> {
  const name = input.value.trim()
  err.value = ''

  // ① 订阅号为空 —— 不发请求，直接在页脚说清楚
  if (!name) { err.value = t('sub.empty'); return }

  busy.value = true

  try {
    const r = await api.setSubscriber(name)

    if (r === 'ok') {
      pushToast('success', t('sub.ok'))
      emit('updated')
      emit('update:open', false)
      return
    }

    /*
      ⚠️ 两种失败<b>要分开说</b>，它们的下一步动作不一样：
        network → 网络断了 / 服务器没起来，用户该去查网络；
        invalid → 号不对或过期，用户该去找发号的人。
      混成一句「更新失败」等于什么都没说。
    */
    err.value = r === 'network' ? t('sub.netErr') : t('sub.invalid')
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
    :title="t('sub.title')"
    subtitle="Subscription"
    :busy="busy"
    :error="err"
    :width="520"
    :save-text="busy ? t('sub.updating') : t('sub.update')"
    :cancel-text="t('dlg.exit')"
    @update:open="emit('update:open', $event)"
    @save="update"
  >
    <div class="setf">
      <section class="sec">
        <div class="grp">{{ t('sub.title') }}</div>

        <div class="row">
          <span class="k">{{ t('sub.current') }}</span>
          <b class="v" :class="{ none: !props.subscriberName }">{{ props.subscriberName || t('sub.none') }}</b>
        </div>

        <div class="row">
          <span class="k">{{ t('sub.time') }}</span>
          <b class="v dim">{{ props.subscriberTime || t('sub.never') }}</b>
        </div>

        <div class="row">
          <span class="k">ID</span>
          <input class="inp" v-model="input" :placeholder="t('sub.ph')" :disabled="busy" @keyup.enter="update" />
        </div>

        <p class="hint">{{ t('sub.hint') }}</p>
      </section>
    </div>
  </CyberModal>
</template>

<style scoped>
.v { flex: 1; min-width: 0; font-weight: 400; font-size: var(--fs-body); color: var(--gray); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v.none { color: var(--dim); }
.v.dim { color: var(--dim2); }
</style>
