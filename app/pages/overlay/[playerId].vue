<script setup lang="ts">
import type { OverlayView } from '#shared/types'

definePageMeta({ layout: false })

const route = useRoute()
const playerId = computed(() => String(route.params.playerId))
const key = computed(() => String(route.query.key ?? ''))
const showPlayers = computed(() => route.query.players !== '0')
const scale = computed(() => Number.parseFloat(String(route.query.scale ?? '1')) || 1)

const url = computed(() => `/api/overlay/${playerId.value}?key=${encodeURIComponent(key.value)}`)
const { data: view, error } = await useFetch<OverlayView>(url, { key: `overlay-${playerId.value}` })
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Overlay not found', fatal: true })

useHead({ title: 'Bingosync overlay', bodyAttrs: { class: 'overlay-body' } })

const store = createRoomStore({
  roomId: view.value!.roomId,
  name: view.value!.name,
  player: view.value!.player,
  players: view.value!.players,
  settings: view.value!.settings,
  socketToken: view.value!.socketToken,
  readonly: true,
  refreshToken: async () => (await $fetch<OverlayView>(url.value)).socketToken
})
store.squares.value = view.value!.board
// Overlays always show the card; hiding is a per-player choice in the room.
store.revealed.value = true
provideRoomStore(store)

onMounted(() => store.connect())
onBeforeUnmount(() => store.disconnect())
</script>

<template>
  <div class="inline-flex flex-col gap-2 p-2 origin-top-left" :style="{ transform: `scale(${scale})` }">
    <div v-if="showPlayers && store.sortedPlayers.value.length" class="flex flex-wrap gap-1.5">
      <span
        v-for="p in store.sortedPlayers.value"
        :key="p.id"
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-semibold text-white shadow"
        :class="`${p.color}square`"
      >
        <span class="tabular-nums">{{ p.color === 'blank' ? 0 : store.colorCount(p.color) }}</span>
        <span class="opacity-80 font-normal tabular-nums">({{ p.color === 'blank' ? 0 : store.lineCount(p.color) }})</span>
        <span class="max-w-32 truncate">{{ p.name }}</span>
      </span>
    </div>
    <RoomBoard compact />
  </div>
</template>

<style>
.overlay-body { background: transparent !important; }
</style>
