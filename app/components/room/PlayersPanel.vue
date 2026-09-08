<script setup lang="ts">
const store = useRoomStore()
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0 overflow-y-auto feed-scroll', root: 'flex flex-col min-h-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-display font-semibold">Players</h2>
        <span class="text-xs text-muted tabular-nums">{{ store.sortedPlayers.value.length }} online</span>
      </div>
    </template>
    <ul v-if="store.sortedPlayers.value.length" class="divide-y divide-default">
      <li v-for="p in store.sortedPlayers.value" :key="p.id" class="flex items-center gap-2.5 px-4 py-2">
        <UTooltip text="Squares (completed lines)">
          <span class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums min-w-12 justify-center" :class="`${p.color}square`">
            {{ p.color === 'blank' ? 0 : store.colorCount(p.color) }}
            <span class="opacity-80 font-normal">({{ p.color === 'blank' ? 0 : store.lineCount(p.color) }})</span>
          </span>
        </UTooltip>
        <span class="truncate text-sm" :class="{ 'font-medium': p.id === store.player.value.id }">{{ p.name }}</span>
      </li>
    </ul>
    <p v-else class="px-4 py-6 text-sm text-muted text-center">Nobody else is here yet.</p>
  </UCard>
</template>
