<script setup lang="ts">
import type { GameInfo } from '../../../shared/types'

defineProps<{ game: GameInfo, full?: boolean }>()
</script>

<template>
  <UTooltip :text="game.name" :disabled="full">
    <UBadge color="neutral" variant="subtle" class="font-normal">{{ full ? game.name : game.shortName }}</UBadge>
  </UTooltip>
</template>
