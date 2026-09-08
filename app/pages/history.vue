<script setup lang="ts">
import type { HistoryEntry } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const page = computed(() => Number.parseInt(String(route.query.page ?? '1'), 10) || 1)
const hideSolo = computed({
  get: () => route.query.solo === 'hide',
  set: value => router.push({ query: { ...route.query, solo: value ? 'hide' : undefined, page: undefined } })
})

const { data } = await useFetch<{ rooms: HistoryEntry[], page: number, pages: number }>('/api/history', {
  query: { page, hideSolo },
  key: 'history'
})

function goTo(target: number) {
  router.push({ query: { ...route.query, page: String(target) } })
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div>
        <h1 class="font-display text-3xl font-semibold tracking-tight">Room history</h1>
        <p class="text-muted text-sm mt-1">Public rooms opened here, newest first. Old rooms can still be joined.</p>
      </div>
      <USwitch v-model="hideSolo" label="Hide rooms with one player" />
    </div>

    <UEmpty v-if="!data?.rooms.length" icon="i-lucide-history" title="No rooms yet" description="Rooms show up here once someone creates one." class="py-16 ring ring-default rounded-lg" />
    <template v-else>
      <div class="ring ring-default rounded-lg overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-muted text-left">
            <tr class="border-b border-default">
              <th class="font-medium px-4 py-2.5">Room</th>
              <th class="font-medium px-4 py-2.5">Game</th>
              <th class="font-medium px-4 py-2.5">Opened</th>
              <th class="font-medium px-4 py-2.5 text-right">Seed</th>
              <th class="font-medium px-4 py-2.5 text-right">Players</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="room in data.rooms" :key="room.inviteCode" class="hover:bg-elevated/50">
              <td class="px-4 py-2.5 min-w-48">
                <NuxtLink :to="`/join/${room.inviteCode}`" class="font-medium hover:underline underline-offset-2">{{ room.name }}</NuxtLink>
                <div class="text-xs text-muted">by {{ room.creator }}</div>
              </td>
              <td class="px-4 py-2.5"><SiteGameName :game="room.game" /></td>
              <td class="px-4 py-2.5 text-muted whitespace-nowrap" :title="new Date(room.createdAt).toISOString()">{{ timeSince(room.createdAt) }} ago</td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ room.seed === null ? '—' : room.seed }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ room.players }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex justify-center mt-5">
        <UPagination :page="data.page" :total="data.pages * 10" :items-per-page="10" :sibling-count="1" show-edges @update:page="goTo" />
      </div>
    </template>
  </div>
</template>
