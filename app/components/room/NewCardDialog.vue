<script setup lang="ts">
import type { RoomSettings } from '#shared/types'
import { CUSTOM_GROUP_ID } from '#shared/utils/games'
import { getVariant } from '#shared/utils/games'

const store = useRoomStore()
const open = store.newCardOpen

const state = reactive({
  group: undefined as number | undefined,
  variant: undefined as number | undefined,
  customJson: '',
  mode: 'normal' as 'normal' | 'lockout',
  seed: undefined as number | undefined,
  hideCard: false
})
const usesSeed = computed(() => (state.variant === undefined ? true : (getVariant(state.variant)?.usesSeed ?? true)))
const modeItems = [
  { label: 'Non-lockout', value: 'normal', description: 'Several players can own the same square.' },
  { label: 'Lockout', value: 'lockout', description: 'First to mark a square keeps it.' }
]
const form = useTemplateRef('form')
const submitting = ref(false)
const formError = ref<string>()

// Every time the dialog opens it mirrors the current room settings, with seed and board left blank.
watch(open, (isOpen) => {
  if (!isOpen) return
  formError.value = undefined
  state.group = store.settings.value.game.group
  state.variant = store.settings.value.game.variant
  state.mode = store.settings.value.lockout ? 'lockout' : 'normal'
  state.hideCard = store.settings.value.hideCard
  state.seed = undefined
  state.customJson = ''
})

async function generate() {
  formError.value = undefined
  if (state.variant === undefined) {
    form.value?.setErrors([{ name: 'group', message: 'Pick a game' }])
    return
  }
  submitting.value = true
  try {
    const settings = await $fetch<RoomSettings>(`/api/rooms/${store.id}/new-card`, {
      method: 'POST',
      body: {
        variant: state.variant,
        customJson: state.group === CUSTOM_GROUP_ID ? state.customJson : '',
        lockout: state.mode === 'lockout',
        seed: state.seed ?? '',
        hideCard: state.hideCard
      }
    })
    store.settings.value = settings
    open.value = false
  } catch (error) {
    const { message, field } = extractApiError(error)
    if (field) form.value?.setErrors([{ name: field === 'variant' ? 'group' : field, message }])
    else formError.value = message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Generate a new card" description="Everyone in the room gets the new card right away.">
    <template #body>
      <UForm id="new-card-form" ref="form" :state="state" class="space-y-4" @submit="generate">
        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
        <SiteGameSelectFields v-model:group="state.group" v-model:variant="state.variant" v-model:custom-json="state.customJson" />
        <UFormField name="mode" label="Mode">
          <URadioGroup v-model="state.mode" :items="modeItems" variant="card" orientation="horizontal" indicator="hidden" :ui="{ fieldset: 'w-full gap-2', item: 'flex-1' }" />
        </UFormField>
        <UFormField v-if="usesSeed" name="seed" label="Seed" hint="Optional">
          <UInputNumber v-model="state.seed" :min="0" :max="2147483647" placeholder="Random" class="w-full" :format-options="{ useGrouping: false }" />
        </UFormField>
        <UCheckbox v-model="state.hideCard" label="Hide the card until someone reveals it" />
      </UForm>
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
      <UButton label="Generate card" type="submit" form="new-card-form" :loading="submitting" />
    </template>
  </UModal>
</template>
