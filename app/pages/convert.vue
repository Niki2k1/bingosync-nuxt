<script setup lang="ts">
const DEFAULT_URL = 'https://docs.google.com/spreadsheet/ccc?key=1dRpwfIV2vDRL_Hq-pBj3U7wq7XwZ9JPW9Ac8hK5qbgc&output=csv'
const state = reactive({ url: DEFAULT_URL })
const error = ref<string>()
const busy = ref(false)

async function convert() {
  error.value = undefined
  busy.value = true
  try {
    const js = await $fetch<string>('/api/convert', { method: 'POST', body: { url: state.url }, responseType: 'text' })
    const href = URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
    const a = document.createElement('a')
    a.href = href
    a.download = 'goal-list.js'
    a.click()
    URL.revokeObjectURL(href)
  } catch (e) {
    error.value = extractApiError(e).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto">
    <h1 class="font-display text-3xl font-semibold tracking-tight">Goal list converter</h1>
    <p class="text-muted text-sm mt-1 mb-6">
      Downloads a goal spreadsheet as CSV and turns it into a v9-style goal list file for a generator.
      The default is the Ocarina of Time bingo sheet.
    </p>
    <UCard>
      <UForm :state="state" class="space-y-4" @submit="convert">
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
        <UFormField name="url" label="Spreadsheet CSV URL" required>
          <UInput v-model="state.url" type="url" class="w-full" />
        </UFormField>
        <UButton type="submit" label="Convert and download" icon="i-lucide-download" :loading="busy" />
      </UForm>
    </UCard>
  </div>
</template>
