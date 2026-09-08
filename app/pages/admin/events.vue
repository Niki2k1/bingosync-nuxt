<script setup lang="ts">
import type { FeedEvent } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

type AdminEvent = FeedEvent & { room: { id: string, name: string } }

const route = useRoute()
const router = useRouter()
const type = ref(String(route.query.type ?? ''))
const q = ref(String(route.query.q ?? ''))
const page = computed(() => Number.parseInt(String(route.query.page ?? '1'), 10) || 1)
const debouncedQ = ref(q.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debouncedQ.value = value), 250)
})
watch([type, debouncedQ], () => router.replace({ query: { type: type.value || undefined, q: debouncedQ.value || undefined } }))

const { data, status } = await useFetch<{ events: AdminEvent[], page: number, pages: number, total: number }>('/api/admin/events', {
  query: { type, q: debouncedQ, page },
  key: 'admin-events'
})

const typeItems = [
  { label: 'All types', value: '' },
  ...['chat', 'goal', 'color', 'connection', 'revealed', 'new-card'].map(t => ({ label: t, value: t }))
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Events">
        <template #right>
          <USelect v-model="type" :items="typeItems" value-key="value" class="w-40" />
          <UInput v-model="q" icon="i-lucide-search" placeholder="Search text" class="w-56" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="ring ring-default rounded-lg overflow-hidden" :class="{ 'opacity-60': status === 'pending' }">
        <ul class="divide-y divide-default text-sm">
          <li v-for="e in data?.events ?? []" :key="e.id" class="px-4 py-2 flex gap-3 items-baseline">
            <span class="text-xs text-dimmed tabular-nums shrink-0 w-36">{{ new Date(e.timestamp).toLocaleString() }}</span>
            <NuxtLink :to="`/admin/rooms/${e.room.id}`" class="text-muted shrink-0 w-40 truncate hover:underline">{{ e.room.name }}</NuxtLink>
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
        <UEmpty v-if="data && !data.events.length" icon="i-lucide-activity" title="No events match" class="py-12" />
      </div>
      <div v-if="data && data.pages > 1" class="flex justify-center mt-4">
        <UPagination :page="data.page" :total="data.total" :items-per-page="50" @update:page="p => router.push({ query: { ...route.query, page: String(p) } })" />
      </div>
    </template>
  </UDashboardPanel>
</template>
