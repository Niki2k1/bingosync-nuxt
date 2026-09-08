<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { GameInfo } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface AdminRoom {
  id: string
  name: string
  creator: string
  createdAt: number
  active: boolean
  hideCard: boolean
  listed: boolean
  playerCount: number
  connected: number
  games: number
  game: GameInfo | null
  seed: number | null
}

const route = useRoute()
const router = useRouter()
const q = ref(String(route.query.q ?? ''))
const page = computed(() => Number.parseInt(String(route.query.page ?? '1'), 10) || 1)
const debouncedQ = ref(q.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedQ.value = value
    router.replace({ query: { q: value || undefined } })
  }, 250)
})

const { data, status } = await useFetch<{ rooms: AdminRoom[], page: number, pages: number, total: number }>('/api/admin/rooms', {
  query: { q: debouncedQ, page },
  key: 'admin-rooms'
})

const columns: TableColumn<AdminRoom>[] = [
  { accessorKey: 'name', header: 'Room' },
  { accessorKey: 'game', header: 'Game' },
  { accessorKey: 'createdAt', header: 'Created' },
  { accessorKey: 'playerCount', header: 'Players' },
  { accessorKey: 'games', header: 'Cards' },
  { accessorKey: 'active', header: 'Status' }
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Rooms">
        <template #right>
          <UInput v-model="q" icon="i-lucide-search" placeholder="Search by name or id" class="w-64" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UTable :data="data?.rooms ?? []" :columns="columns" :loading="status === 'pending'" class="ring ring-default rounded-lg">
        <template #name-cell="{ row }">
          <NuxtLink :to="`/admin/rooms/${row.original.id}`" class="font-medium hover:underline">{{ row.original.name }}</NuxtLink>
          <div class="text-xs text-muted">by {{ row.original.creator }} · <span class="font-mono">{{ row.original.id }}</span></div>
        </template>
        <template #game-cell="{ row }">
          <SiteGameName v-if="row.original.game" :game="row.original.game" />
        </template>
        <template #createdAt-cell="{ row }">
          <span :title="new Date(row.original.createdAt).toISOString()">{{ timeSince(row.original.createdAt) }} ago</span>
        </template>
        <template #playerCell="{ row }">{{ row.original.playerCount }}</template>
        <template #active-cell="{ row }">
          <div class="flex gap-1">
            <UBadge v-if="row.original.active" color="success" variant="subtle">{{ row.original.connected }} online</UBadge>
            <UBadge v-else color="neutral" variant="subtle">closed</UBadge>
            <UBadge v-if="!row.original.listed" color="neutral" variant="outline">unlisted</UBadge>
            <UBadge v-if="row.original.hideCard" color="neutral" variant="outline">hidden card</UBadge>
          </div>
        </template>
      </UTable>
      <div v-if="data && data.pages > 1" class="flex justify-center mt-4">
        <UPagination :page="data.page" :total="data.total" :items-per-page="25" @update:page="p => router.push({ query: { ...route.query, page: String(p) } })" />
      </div>
    </template>
  </UDashboardPanel>
</template>
