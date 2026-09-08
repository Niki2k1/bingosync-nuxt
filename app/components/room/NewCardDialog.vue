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
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField name="lockout" label="Mode">
            <USelect v-model="state.mode" :items="[{ label: 'Non-lockout', value: 'normal' }, { label: 'Lockout', value: 'lockout' }]" value-key="value" class="w-full" />
          </UFormField>
          <UFormField v-if="usesSeed" name="seed" label="Seed" hint="Optional">
            <UInputNumber v-model="state.seed" :min="0" :max="2147483647" placeholder="Random" class="w-full" :format-options="{ useGrouping: false }" />
          </UFormField>
        </div>
        <UCheckbox v-model="state.hideCard" label="Hide the card until someone reveals it" />
      </UForm>
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
      <UButton label="Generate card" type="submit" form="new-card-form" :loading="submitting" />
    </template>
  </UModal>
</template>
