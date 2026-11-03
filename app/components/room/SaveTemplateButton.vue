<script setup lang="ts">
import type { TemplateJson } from '#shared/types'
import { TEMPLATE_NAME_MAX } from '#shared/utils/schemas'

const store = useRoomStore()
const { user } = useAccount()
const route = useRoute()
const toast = useToast()
const { refresh } = useMyTemplates()
const loginUrl = computed(() => wervtLoginUrl(route.fullPath))

const open = ref(false)
const name = ref('')
const saving = ref(false)
const error = ref<string>()
const boardEmpty = computed(() => store.squares.value.every(s => !s.name.trim()))

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = store.name
  error.value = undefined
})

async function save() {
  saving.value = true
  error.value = undefined
  try {
    const template = await $fetch<TemplateJson>(`/api/rooms/${store.id}/save-template`, { method: 'POST', body: { name: name.value } })
    await refresh()
    open.value = false
    toast.add({
      title: 'Saved as template',
      description: template.name,
      icon: 'i-lucide-check',
      color: 'success',
      actions: [{ label: 'Open', to: `/templates/${template.id}`, target: '_blank' }]
    })
  } catch (e) {
    error.value = extractApiError(e).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UButton
    v-if="!user"
    label="Sign in to save as template"
    icon="i-lucide-layout-template"
    color="neutral"
    variant="ghost"
    block
    :to="loginUrl"
    external
  />
  <UModal v-else v-model:open="open" title="Save as template" description="Keeps the 25 squares as they are now, so you can start new rooms with this board or share it.">
    <UButton
      label="Save as template"
      icon="i-lucide-layout-template"
      color="neutral"
      variant="ghost"
      block
      :disabled="boardEmpty || store.coverVisible.value"
    />
    <template #body>
      <form id="save-template-form" class="space-y-3" @submit.prevent="save">
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
        <UFormField label="Name" required>
          <UInput v-model="name" :maxlength="TEMPLATE_NAME_MAX" class="w-full" autofocus />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
      <UButton label="Save template" type="submit" form="save-template-form" icon="i-lucide-save" :loading="saving" :disabled="!name.trim()" />
    </template>
  </UModal>
</template>
