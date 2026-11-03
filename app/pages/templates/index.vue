<script setup lang="ts">
useHead({ title: 'Templates · Bingosync' })
const { user } = useAccount()
const route = useRoute()
const loginUrl = computed(() => wervtLoginUrl(route.fullPath))
const { templates, status } = useMyTemplates()
</script>

<template>
  <div class="max-w-3xl">
    <div class="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 class="font-display text-3xl font-semibold tracking-tight">Templates</h1>
        <p class="text-muted text-sm mt-1">Prepare a board ahead of the race, start rooms from it and share it with a link.</p>
      </div>
      <UButton v-if="user" label="New template" icon="i-lucide-plus" to="/templates/new" />
    </div>

    <UEmpty
      v-if="!user"
      icon="i-lucide-log-in"
      title="Sign in to keep templates"
      description="Templates belong to your account, so they are there on every device."
      :actions="[{ label: 'Sign in', icon: 'i-lucide-log-in', to: loginUrl, external: true }]"
      class="py-16 ring ring-default rounded-lg"
    />
    <UEmpty
      v-else-if="status === 'success' && !templates.length"
      icon="i-lucide-layout-template"
      title="No templates yet"
      description="Make one here, or use “Save as template” on a board in a room."
      :actions="[{ label: 'New template', icon: 'i-lucide-plus', to: '/templates/new' }]"
      class="py-16 ring ring-default rounded-lg"
    />
    <ul v-else class="divide-y divide-default ring ring-default rounded-lg overflow-hidden">
      <li v-for="t in templates" :key="t.id" class="flex items-center gap-3 px-4 py-3 hover:bg-elevated/60 transition-colors">
        <NuxtLink :to="`/templates/${t.id}`" class="min-w-0 flex-1">
          <div class="font-display font-medium truncate">{{ t.name }}</div>
          <div class="text-muted text-xs mt-0.5">{{ templateDescription(t) }}</div>
        </NuxtLink>
        <UButton label="Create room" icon="i-lucide-play" color="neutral" variant="subtle" size="sm" :to="`/?template=${t.id}`" />
      </li>
    </ul>
  </div>
</template>
