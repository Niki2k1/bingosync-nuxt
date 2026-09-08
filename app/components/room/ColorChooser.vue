<script setup lang="ts">
import { PLAYER_COLORS } from '../../../shared/utils/colors'

const store = useRoomStore()
const spectator = computed(() => store.player.value.spectator)
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap justify-center" role="radiogroup" aria-label="Your color">
    <UTooltip v-for="color in PLAYER_COLORS" :key="color" :text="color">
      <button
        type="button"
        role="radio"
        :aria-checked="store.chosenColor.value === color"
        :disabled="spectator"
        class="size-8 rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40 disabled:cursor-not-allowed"
        :class="[`${color}square`, store.chosenColor.value === color && !spectator ? 'ring-2 ring-offset-2 ring-offset-[var(--ui-bg)] ring-white scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100']"
        @click="store.chooseColor(color)"
      />
    </UTooltip>
    <span v-if="spectator" class="text-xs text-muted ml-2">Spectators can't mark squares</span>
    <UTooltip v-else :text="store.editMode.value ? 'Done editing' : 'Edit the goal text of squares'">
      <UButton
        :icon="store.editMode.value ? 'i-lucide-check' : 'i-lucide-pencil'"
        :label="store.editMode.value ? 'Done' : undefined"
        size="sm"
        color="neutral"
        :variant="store.editMode.value ? 'solid' : 'ghost'"
        class="ml-2"
        aria-label="Edit goals"
        @click="store.editMode.value = !store.editMode.value"
      />
    </UTooltip>
  </div>
</template>
