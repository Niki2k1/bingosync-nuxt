<script setup lang="ts">
const { user, fetch: refreshSession } = useUserSession()
const twitchEnabled = useTwitchEnabled()
const route = useRoute()

async function signOut() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await refreshSession()
}

const items = [
  { label: 'Rooms', to: '/' },
  { label: 'History', to: '/history' },
  { label: 'About', to: '/about' }
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <UHeader :ui="{ root: 'bg-default/80', container: 'max-w-[var(--ui-container)]' }">
      <template #title>
        <span class="font-display text-xl font-semibold tracking-tight">Bingosync</span>
      </template>
      <UNavigationMenu :items="items" />
      <template #right>
        <template v-if="twitchEnabled">
          <UDropdownMenu v-if="user?.twitch" :items="[[{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }]]">
            <UButton color="neutral" variant="ghost" size="sm" :label="user.twitch.displayName" :avatar="{ src: user.twitch.avatar, alt: user.twitch.displayName }" />
          </UDropdownMenu>
          <UButton v-else label="Sign in with Twitch" icon="i-lucide-twitch" color="neutral" variant="subtle" size="sm" :to="`/api/auth/twitch-start?returnTo=${encodeURIComponent(route.fullPath)}`" external />
        </template>
        <UButton icon="i-lucide-github" color="neutral" variant="ghost" to="https://github.com/kbuzsaki/bingosync" target="_blank" aria-label="GitHub" />
      </template>
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>
    <UMain class="flex-1">
      <UContainer class="py-8">
        <slot />
      </UContainer>
    </UMain>
    <UFooter :ui="{ container: 'max-w-[var(--ui-container)]' }">
      <template #left>
        <p class="text-muted text-sm">Shared bingo boards for speedrun races.</p>
      </template>
      <template #right>
        <UButton label="Goal list converter" to="/convert" color="neutral" variant="link" size="sm" />
        <UButton label="Admin" to="/admin" color="neutral" variant="link" size="sm" />
      </template>
    </UFooter>
  </div>
</template>
