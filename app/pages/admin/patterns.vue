<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: patterns, refresh } = await useFetch<{ id: number, pattern: string }[]>('/api/admin/patterns', { key: 'admin-patterns' })
const draft = ref('')
const error = ref<string>()

async function add() {
  error.value = undefined
  try {
    await $fetch('/api/admin/patterns', { method: 'POST', body: { pattern: draft.value } })
    draft.value = ''
    await refresh()
  } catch (e) {
    error.value = extractApiError(e).message
  }
}
async function remove(id: number) {
  await $fetch(`/api/admin/patterns/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Word filter" />
    </template>
    <template #body>
      <div class="max-w-2xl space-y-5">
        <p class="text-sm text-muted">Case-insensitive regular expressions. Matches in new room and player names are replaced with "bingo". Existing names can be re-filtered from a room's page.</p>
        <form class="flex gap-2" @submit.prevent="add">
          <UInput v-model="draft" placeholder="e.g. bad(word|term)s?" class="flex-1 font-mono" :color="error ? 'error' : undefined" />
          <UButton type="submit" label="Add pattern" icon="i-lucide-plus" :disabled="!draft.trim()" />
        </form>
        <p v-if="error" class="text-sm text-error">{{ error }}</p>
        <UEmpty v-if="!patterns?.length" icon="i-lucide-filter" title="No patterns yet" description="Names are stored exactly as typed until you add one." class="py-10 ring ring-default rounded-lg" />
        <ul v-else class="divide-y divide-default ring ring-default rounded-lg">
          <li v-for="p in patterns" :key="p.id" class="flex items-center justify-between gap-3 px-4 py-2">
            <code class="text-sm">{{ p.pattern }}</code>
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" aria-label="Remove" @click="remove(p.id)" />
          </li>
        </ul>
      </div>
    </template>
  </UDashboardPanel>
</template>
