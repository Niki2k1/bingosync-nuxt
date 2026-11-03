<script setup lang="ts">
import type { TemplateJson } from '#shared/types'

const route = useRoute()
const id = route.params.id as string
const { data: template, error } = await useFetch<TemplateJson>(`/api/templates/${id}`, { key: `template-${id}` })
useHead({ title: () => `${template.value?.name ?? 'Template'} · Bingosync` })

const { user } = useAccount()
const loginUrl = computed(() => wervtLoginUrl(route.fullPath))
const { refresh: refreshMine } = useMyTemplates()
const toast = useToast()
// Visitors who open a shared link see the board; the owner edits it right away.
const editing = computed(() => !!template.value?.mine)

async function saved(updated: TemplateJson) {
  template.value = updated
  await refreshMine()
  toast.add({ title: 'Template saved', icon: 'i-lucide-check', color: 'success' })
}

async function copyLink() {
  const url = `${location.origin}/templates/${id}`
  try {
    await navigator.clipboard.writeText(url)
    toast.add({ title: 'Share link copied', description: 'Anyone with it can start a room with this board.', icon: 'i-lucide-link' })
  } catch {
    // Clipboard access can be blocked (e.g. inside OBS or over plain http); fall back to a prompt.
    window.prompt('Share link', url)
  }
}

const copying = ref(false)
async function saveCopy() {
  copying.value = true
  try {
    const copy = await $fetch<TemplateJson>(`/api/templates/${id}/copy`, { method: 'POST' })
    await refreshMine()
    await navigateTo(`/templates/${copy.id}`)
  } catch (e) {
    toast.add({ title: extractApiError(e).message, color: 'error' })
  } finally {
    copying.value = false
  }
}

const confirmDelete = ref(false)
async function remove() {
  await $fetch(`/api/templates/${id}`, { method: 'DELETE' })
  await refreshMine()
  await navigateTo('/templates')
}
</script>

<template>
  <div>
    <UButton v-if="user" label="Templates" icon="i-lucide-arrow-left" to="/templates" color="neutral" variant="ghost" size="sm" class="-ml-2.5 mb-2" />
    <UEmpty
      v-if="error || !template"
      icon="i-lucide-file-question"
      title="Template not found"
      description="The link may be mistyped, or its owner deleted the template."
      :actions="[{ label: 'Back to rooms', to: '/' }]"
      class="py-16 ring ring-default rounded-lg max-w-3xl"
    />
    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div class="min-w-0">
          <h1 class="font-display text-3xl font-semibold tracking-tight truncate">{{ template.name }}</h1>
          <p class="text-muted text-sm mt-1">
            {{ templateDescription(template) }}<template v-if="!template.mine"> · by {{ template.ownerName }}</template>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton label="Create room" icon="i-lucide-play" :to="`/?template=${template.id}`" />
          <UButton label="Copy share link" icon="i-lucide-link" color="neutral" variant="subtle" @click="copyLink" />
          <template v-if="!template.mine">
            <UButton v-if="user" label="Save a copy" icon="i-lucide-copy" color="neutral" variant="subtle" :loading="copying" @click="saveCopy" />
            <UButton v-else label="Sign in to save a copy" icon="i-lucide-log-in" color="neutral" variant="subtle" :to="loginUrl" external />
          </template>
        </div>
      </div>

      <TemplateForm v-if="editing" :key="template.id" :template="template" @saved="saved">
        <template #actions>
          <UButton label="Delete" icon="i-lucide-trash-2" color="error" variant="ghost" class="ml-auto" @click="confirmDelete = true" />
        </template>
      </TemplateForm>
      <template v-else>
        <TemplateBoardGrid v-if="template.mode === 'fixed'" :model-value="template.goals" readonly />
        <ol v-else class="max-w-xl columns-1 sm:columns-2 gap-6 text-sm list-decimal list-inside space-y-1">
          <li v-for="(goal, i) in template.goals" :key="i" class="break-inside-avoid">{{ goal }}</li>
        </ol>
      </template>

      <UModal v-model:open="confirmDelete" title="Delete template?" :description="`“${template.name}” is gone for good, and its share link stops working. Rooms started from it keep their boards.`">
        <template #footer>
          <UButton label="Cancel" color="neutral" variant="ghost" @click="confirmDelete = false" />
          <UButton label="Delete" color="error" icon="i-lucide-trash-2" @click="remove" />
        </template>
      </UModal>
    </template>
  </div>
</template>
