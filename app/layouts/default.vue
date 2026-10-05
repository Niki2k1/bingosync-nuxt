<script setup lang="ts">
const { user } = useAccount()
const route = useRoute()
const loginUrl = computed(() => wervtLoginUrl(route.fullPath))
const logoutUrl = computed(() => wervtLogoutUrl(route.fullPath))

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
        <!-- Signing in is optional; it prefills your nickname and opens Twitch-only rooms. -->
        <UDropdownMenu v-if="user" :items="[[{ label: 'Sign out', icon: 'i-lucide-log-out', to: logoutUrl, external: true }]]">
          <UButton color="neutral" variant="ghost" size="sm" :label="user.name" :avatar="user.image ? { src: user.image, alt: user.name } : { icon: 'i-lucide-user' }" />
        </UDropdownMenu>
        <UButton v-else label="Sign in" icon="i-lucide-log-in" color="neutral" variant="subtle" size="sm" :to="loginUrl" external />
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
