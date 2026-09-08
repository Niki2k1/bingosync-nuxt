<script setup lang="ts">
import { getVariant } from '#shared/utils/games'

const store = useRoomStore()
const usesSeed = computed(() => getVariant(store.settings.value.game.variant)?.usesSeed ?? true)
const seedText = computed(() => {
  if (store.coverVisible.value || store.settings.value.seed === null) return null
  return String(store.settings.value.seed)
})
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-display font-semibold">This card</h2>
    </template>
    <dl class="text-sm space-y-2">
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Game</dt>
        <dd class="text-right truncate" :title="store.settings.value.game.name">{{ store.settings.value.game.name }}</dd>
      </div>
      <div v-if="usesSeed" class="flex justify-between gap-3">
        <dt class="text-muted">Seed</dt>
        <dd class="tabular-nums">
          <span v-if="seedText === null" class="text-muted italic">hidden</span>
          <template v-else>{{ seedText }}</template>
        </dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Mode</dt>
        <dd>{{ store.settings.value.lockout ? 'Lockout' : 'Non-lockout' }}</dd>
      </div>
    </dl>
    <UButton label="New card" icon="i-lucide-refresh-cw" color="neutral" variant="subtle" block class="mt-4" @click="store.newCardOpen.value = true" />
  </UCard>
</template>
