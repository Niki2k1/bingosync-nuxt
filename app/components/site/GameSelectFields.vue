<script setup lang="ts">
import { CUSTOM_GROUP_ID, GAME_CHOICES, variantsForGroup } from '../../../shared/utils/games'

const CUSTOM_JSON_PLACEHOLDER = `Paste the board as a JSON list of goals, e.g.
[ {"name": "Collect 3 Fire Flowers"},
  {"name": "Defeat Phantom Ganon"},
  {"name": "Catch a Pokemon while Surfing"},
  ... ]`

const group = defineModel<number | undefined>('group', { required: true })
const variant = defineModel<number | undefined>('variant', { required: true })
const customJson = defineModel<string>('customJson', { required: true })

const gameItems = GAME_CHOICES.map(g => ({ label: g.name, value: g.id }))
const variants = computed(() => (group.value === undefined ? [] : variantsForGroup(group.value)))
const variantItems = computed(() => variants.value.map(v => ({ label: v.variantName, value: v.id })))
const showCustomJson = computed(() => group.value === CUSTOM_GROUP_ID)

watch(group, () => {
  if (!variants.value.some(v => v.id === variant.value)) variant.value = variants.value[0]?.id
}, { immediate: true })
</script>

<template>
  <UFormField name="group" label="Game" required>
    <USelectMenu
      v-model="group"
      :items="gameItems"
      value-key="value"
      placeholder="Search for a game"
      :search-input="{ placeholder: 'Type to search 280+ games' }"
      icon="i-lucide-gamepad-2"
      class="w-full"
    />
  </UFormField>
  <UFormField v-if="variants.length > 1" name="variant" label="Variant">
    <USelectMenu v-model="variant" :items="variantItems" value-key="value" :search-input="false" class="w-full" />
  </UFormField>
  <UFormField v-if="showCustomJson" name="customJson" label="Board" description="A JSON list of goals for your card.">
    <UTextarea v-model="customJson" :rows="6" :placeholder="CUSTOM_JSON_PLACEHOLDER" class="w-full font-mono text-xs" />
  </UFormField>
</template>
