<script setup lang="ts">
import type { FeedEvent, GameInfo, PlayerJson, SquareJson } from '../../../../shared/types'
import { PLAYER_COLORS, type PlayerColor } from '../../../../shared/utils/colors'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface AdminRoomDetail {
  id: string
  name: string
  createdAt: number
  lastEventAt: number
  active: boolean
  hideCard: boolean
  listed: boolean
  twitchOnly: boolean
  inviteCode: string
  playerCount: number
  currentGameId: number | null
  games: { id: number, seed: number, lockout: boolean, createdAt: number, revealedAt: number | null, game: GameInfo, squares: SquareJson[] }[]
  players: (PlayerJson & { rawColor: string, twitchLogin: string | null, createdAt: number, connected: boolean })[]
  events: FeedEvent[]
}

const route = useRoute()
const toast = useToast()
const id = String(route.params.id)
const { data: room, refresh } = await useFetch<AdminRoomDetail>(`/api/admin/rooms/${id}`, { key: `admin-room-${id}` })

async function patchRoom(patch: Partial<Pick<AdminRoomDetail, 'name' | 'hideCard' | 'listed' | 'twitchOnly'>>) {
  await $fetch(`/api/admin/rooms/${id}`, { method: 'PATCH', body: patch })
  await refresh()
}

async function filterNames() {
  await $fetch(`/api/admin/rooms/${id}/filter-names`, { method: 'POST' })
  await refresh()
  toast.add({ title: 'Word filter applied to room and player names', color: 'success' })
}

const confirmDelete = ref(false)
async function deleteRoom() {
  await $fetch(`/api/admin/rooms/${id}`, { method: 'DELETE' })
  toast.add({ title: 'Room deleted', color: 'success' })
  await navigateTo('/admin/rooms')
}

async function disconnect(playerId: string) {
  await $fetch(`/api/admin/players/${playerId}/disconnect`, { method: 'POST' })
  toast.add({ title: 'Player disconnected' })
}

async function patchPlayer(playerId: string, patch: Record<string, unknown>) {
  await $fetch(`/api/admin/players/${playerId}`, { method: 'PATCH', body: patch })
  await refresh()
}

const editing = ref<AdminRoomDetail['players'][number] | null>(null)
const editState = reactive<{ name: string, color: PlayerColor, spectator: boolean }>({ name: '', color: 'red', spectator: false })
function openEdit(p: AdminRoomDetail['players'][number]) {
  editing.value = p
  editState.name = p.name
  editState.color = p.rawColor as PlayerColor
  editState.spectator = p.spectator
}
async function saveEdit() {
  if (!editing.value) return
  await patchPlayer(editing.value.id, { ...editState })
  editing.value = null
}

const eventFilter = ref('all')
const shownEvents = computed(() => {
  const list = room.value?.events ?? []
  const filtered = eventFilter.value === 'all' ? list : list.filter(e => e.type === eventFilter.value)
  return [...filtered].reverse()
})
const eventTypes = ['all', 'chat', 'goal', 'color', 'connection', 'revealed', 'new-card']
const cardItems = computed(() => (room.value?.games ?? []).map(g => ({
  label: `${g.game.name} · seed ${g.seed}${g.id === room.value?.currentGameId ? ' · current' : ''}`,
  value: String(g.id),
  game: g
})))
const nameDraft = ref('')
watch(room, r => (nameDraft.value = r?.name ?? ''), { immediate: true })
</script>

<template>
  <UDashboardPanel v-if="room">
    <template #header>
      <UDashboardNavbar :title="room.name">
        <template #leading>
          <UButton to="/admin/rooms" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" aria-label="Back to rooms" />
        </template>
        <template #right>
          <UButton label="Apply word filter" icon="i-lucide-filter" color="neutral" variant="subtle" size="sm" @click="filterNames" />
          <UButton label="Delete room" icon="i-lucide-trash-2" color="error" variant="subtle" size="sm" @click="confirmDelete = true" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div class="space-y-6">
          <UCard>
            <template #header><h2 class="font-semibold">Room</h2></template>
            <div class="space-y-4">
              <UFormField label="Name">
                <div class="flex gap-2">
                  <UInput v-model="nameDraft" class="flex-1" />
                  <UButton label="Save" color="neutral" variant="subtle" :disabled="nameDraft === room.name" @click="patchRoom({ name: nameDraft })" />
                </div>
              </UFormField>
              <dl class="text-sm grid grid-cols-[8rem_1fr] gap-y-1.5">
                <dt class="text-muted">Id</dt><dd class="font-mono text-xs break-all">{{ room.id }}</dd>
                <dt class="text-muted">Invite</dt><dd><NuxtLink :to="`/join/${room.inviteCode}`" class="font-mono text-xs break-all hover:underline">/join/{{ room.inviteCode }}</NuxtLink></dd>
                <dt class="text-muted">Created</dt><dd>{{ new Date(room.createdAt).toLocaleString() }}</dd>
                <dt class="text-muted">Last activity</dt><dd>{{ timeSince(room.lastEventAt) }} ago</dd>
                <dt class="text-muted">Status</dt><dd><UBadge :color="room.active ? 'success' : 'neutral'" variant="subtle">{{ room.active ? 'open' : 'closed' }}</UBadge></dd>
              </dl>
              <div class="space-y-2">
                <USwitch :model-value="room.listed" label="Listed publicly" @update:model-value="v => patchRoom({ listed: v })" />
                <USwitch :model-value="room.hideCard" label="Hide card initially" @update:model-value="v => patchRoom({ hideCard: v })" />
                <USwitch :model-value="room.twitchOnly" label="Twitch users only" @update:model-value="v => patchRoom({ twitchOnly: v })" />
              </div>
            </div>
          </UCard>

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header><h2 class="font-semibold">Players <span class="text-muted font-normal">({{ room.players.length }})</span></h2></template>
            <ul class="divide-y divide-default">
              <li v-for="p in room.players" :key="p.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span class="size-3 rounded-full shrink-0" :class="p.spectator ? 'bg-accented' : `${p.rawColor}square`" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium truncate">{{ p.name }} <span v-if="p.spectator" class="text-muted font-normal">(spectator)</span></div>
                  <div class="text-xs text-muted truncate">
                    <span class="font-mono">{{ p.id }}</span>
                    <template v-if="p.twitchLogin"> · twitch: {{ p.twitchLogin }}</template>
                  </div>
                </div>
                <UBadge v-if="p.connected" color="success" variant="subtle">online</UBadge>
                <UDropdownMenu :items="[
                  { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(p) },
                  { label: 'Apply word filter', icon: 'i-lucide-filter', onSelect: () => patchPlayer(p.id, { filterName: true }) },
                  { label: 'Disconnect', icon: 'i-lucide-plug-zap', disabled: !p.connected, onSelect: () => disconnect(p.id) }
                ]">
                  <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" />
                </UDropdownMenu>
              </li>
            </ul>
          </UCard>

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header><h2 class="font-semibold">Cards <span class="text-muted font-normal">({{ room.games.length }})</span></h2></template>
            <UAccordion :items="cardItems" :ui="{ trigger: 'px-4', body: 'px-4' }">
              <template #body="{ item }">
                <div class="text-xs text-muted mb-2">
                  {{ new Date(item.game.createdAt).toLocaleString() }} · {{ item.game.lockout ? 'lockout' : 'non-lockout' }}
                  <template v-if="item.game.revealedAt"> · revealed</template>
                </div>
                <div class="grid grid-cols-5 gap-1">
                  <div
                    v-for="sq in item.game.squares"
                    :key="sq.slot"
                    class="aspect-[5/4] rounded p-1 text-[10px] leading-tight text-white flex items-center justify-center text-center overflow-hidden"
                    :class="sq.colors[0] ? `${sq.colors[0]}square` : 'bg-elevated'"
                    :title="`${sq.slot}: ${sq.name}${sq.colors.length ? ' · ' + sq.colors.join(', ') : ''}`"
                  >{{ sq.name }}</div>
                </div>
              </template>
            </UAccordion>
          </UCard>
        </div>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold">Events <span class="text-muted font-normal">({{ shownEvents.length }})</span></h2>
              <USelect v-model="eventFilter" :items="eventTypes" size="sm" class="w-36" />
            </div>
          </template>
          <ul class="divide-y divide-default text-sm max-h-[70vh] overflow-y-auto">
            <li v-for="e in shownEvents" :key="e.id" class="px-4 py-2 flex gap-3">
              <span class="text-xs text-dimmed tabular-nums shrink-0 w-32">{{ new Date(e.timestamp).toLocaleString() }}</span>
              <UBadge color="neutral" variant="subtle" size="sm" class="shrink-0 w-20 justify-center">{{ e.type }}</UBadge>
              <span class="min-w-0 break-words">
                <span class="font-medium" :class="`${e.playerColor}player`">{{ e.player.name }}</span>
                <template v-if="e.type === 'chat'">: {{ e.text }}</template>
                <template v-else-if="e.type === 'goal'"> {{ e.remove ? 'cleared' : 'marked' }} {{ e.square.name }}</template>
                <template v-else-if="e.type === 'color'"> switched to {{ e.color }}</template>
                <template v-else-if="e.type === 'connection'"> {{ e.status }}</template>
                <template v-else-if="e.type === 'new-card'"> new card {{ e.game }} seed {{ e.seed }}</template>
                <template v-else-if="e.type === 'revealed'"> revealed the card</template>
                <template v-else-if="e.type === 'edit'"> set square {{ e.slot }} to "{{ e.name }}"</template>
              </span>
            </li>
          </ul>
        </UCard>
      </div>

      <UModal v-model:open="confirmDelete" title="Delete this room?" description="All cards, players and events of this room are removed. Connected players are kicked.">
        <template #footer>
          <UButton label="Cancel" color="neutral" variant="ghost" @click="confirmDelete = false" />
          <UButton label="Delete room" color="error" @click="deleteRoom" />
        </template>
      </UModal>

      <UModal :open="!!editing" title="Edit player" @update:open="v => { if (!v) editing = null }">
        <template #body>
          <div class="space-y-4">
            <UFormField label="Name"><UInput v-model="editState.name" class="w-full" /></UFormField>
            <UFormField label="Color"><USelect v-model="editState.color" :items="[...PLAYER_COLORS]" class="w-full" /></UFormField>
            <UCheckbox v-model="editState.spectator" label="Spectator" />
          </div>
        </template>
        <template #footer>
          <UButton label="Cancel" color="neutral" variant="ghost" @click="editing = null" />
          <UButton label="Save" @click="saveEdit" />
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
