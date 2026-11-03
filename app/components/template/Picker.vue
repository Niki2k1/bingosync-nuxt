<script setup lang="ts">
import type { TemplateSummary } from '#shared/types'

// Picks one of the user's templates. `extra` adds a shared template (opened through its link) that isn't theirs.
const model = defineModel<TemplateSummary | undefined>({ required: true })
const props = defineProps<{ extra?: TemplateSummary }>()

const { templates } = useMyTemplates()
const items = computed(() => {
  const mine = templates.value
  const all = props.extra && !mine.some(t => t.id === props.extra!.id) ? [props.extra, ...mine] : mine
  return all.map(t => ({ ...t, label: t.name, description: templateDescription(t) }))
})
const selected = computed({
  get: () => items.value.find(i => i.id === model.value?.id),
  set: (item) => { model.value = item ?? undefined }
})
</script>

<template>
  <USelectMenu
    v-if="items.length"
    v-model="selected"
    :items="items"
    placeholder="None, pick a game below"
    :search-input="items.length > 6 ? { placeholder: 'Search templates' } : false"
    clear
    class="w-full"
  />
</template>
