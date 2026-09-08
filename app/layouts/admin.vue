<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { fetch: refreshSession } = useUserSession()

const items: NavigationMenuItem[] = [
  { label: 'Overview', icon: 'i-lucide-gauge', to: '/admin', exact: true },
  { label: 'Rooms', icon: 'i-lucide-layout-grid', to: '/admin/rooms' },
  { label: 'Events', icon: 'i-lucide-activity', to: '/admin/events' },
  { label: 'Notices', icon: 'i-lucide-megaphone', to: '/admin/notices' },
  { label: 'Word filter', icon: 'i-lucide-filter', to: '/admin/patterns' }
]

async function signOut() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await refreshSession()
  await navigateTo('/admin/login')
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-grid-3x3" class="size-5 shrink-0" />
          <span v-if="!collapsed" class="font-display font-semibold truncate">Bingosync admin</span>
        </NuxtLink>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu :items="items" orientation="vertical" :collapsed="collapsed" />
      </template>
      <template #footer="{ collapsed }">
        <UButton
          :icon="collapsed ? 'i-lucide-log-out' : undefined"
          :label="collapsed ? undefined : 'Sign out'"
          color="neutral"
          variant="ghost"
          block
          @click="signOut"
        />
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>
