<script setup lang="ts">
const store = useRoomStore()
const open = computed({
  get: () => store.editingSlot.value !== null,
  set: (v) => { if (!v) store.editingSlot.value = null }
})
const text = ref('')
const input = useTemplateRef('input')

watch(() => store.editingSlot.value, (slot) => {
  if (slot === null) return
  text.value = store.squares.value[slot - 1]?.name ?? ''
  nextTick(() => input.value?.inputRef?.select())
})

async function save(next: boolean) {
  const slot = store.editingSlot.value
  if (slot === null) return
  await store.saveGoal(slot, text.value.trim())
  store.editingSlot.value = next && slot < 25 ? slot + 1 : null
  if (next && slot < 25) text.value = store.squares.value[slot]?.name ?? ''
}
</script>

<template>
  <UModal v-model:open="open" :title="`Square ${store.editingSlot.value}`" description="Enter saves and moves to the next square." :ui="{ content: 'max-w-md' }">
    <template #body>
      <UInput ref="input" v-model="text" maxlength="255" placeholder="Goal text" class="w-full" size="lg" autofocus @keydown.enter.prevent="save(true)" />
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
      <UButton label="Save" color="neutral" variant="subtle" @click="save(false)" />
      <UButton label="Save and next" icon="i-lucide-arrow-right" trailing @click="save(true)" />
    </template>
  </UModal>
</template>
