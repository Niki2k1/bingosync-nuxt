<script setup lang="ts">
import type { TemplateJson } from '#shared/types'

useHead({ title: 'New template · Bingosync' })
const { user } = useAccount()
const route = useRoute()
const loginUrl = computed(() => wervtLoginUrl(route.fullPath))
const { refresh } = useMyTemplates()

async function saved(template: TemplateJson) {
  await refresh()
  await navigateTo(`/templates/${template.id}`)
}
</script>

<template>
  <div>
    <UButton label="Templates" icon="i-lucide-arrow-left" to="/templates" color="neutral" variant="ghost" size="sm" class="-ml-2.5 mb-2" />
    <h1 class="font-display text-3xl font-semibold tracking-tight mb-6">New template</h1>
    <TemplateForm v-if="user" @saved="saved" />
    <UEmpty
      v-else
      icon="i-lucide-log-in"
      title="Sign in to keep templates"
      :actions="[{ label: 'Sign in', icon: 'i-lucide-log-in', to: loginUrl, external: true }]"
      class="py-16 ring ring-default rounded-lg max-w-3xl"
    />
  </div>
</template>
