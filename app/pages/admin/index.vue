<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: stats, refresh } = await useFetch('/api/admin/stats', { key: 'admin-stats' })

const cards = computed(() => [
  { label: 'Rooms open now', value: stats.value?.activeRooms ?? 0, icon: 'i-lucide-radio' },
  { label: 'Players connected', value: stats.value?.connectedPlayers ?? 0, icon: 'i-lucide-users' },
  { label: 'Rooms in 24h', value: stats.value?.roomsToday ?? 0, icon: 'i-lucide-plus-square' },
  { label: 'Events in 24h', value: stats.value?.eventsToday ?? 0, icon: 'i-lucide-activity' },
  { label: 'Rooms total', value: stats.value?.totalRooms ?? 0, icon: 'i-lucide-layout-grid' },
  { label: 'Players total', value: stats.value?.totalPlayers ?? 0, icon: 'i-lucide-user' },
  { label: 'Cards generated', value: stats.value?.totalGames ?? 0, icon: 'i-lucide-dice-5' },
  { label: 'Events total', value: stats.value?.totalEvents ?? 0, icon: 'i-lucide-database' }
])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Overview">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Refresh" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard v-for="card in cards" :key="card.label">
          <div class="flex items-center gap-3">
            <UIcon :name="card.icon" class="size-5 text-muted" />
            <div>
              <div class="text-2xl font-semibold tabular-nums">{{ card.value.toLocaleString() }}</div>
              <div class="text-xs text-muted">{{ card.label }}</div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
