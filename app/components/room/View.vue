<script setup lang="ts">
import type { PlayView } from '../../../shared/types'

const props = defineProps<{ view: PlayView }>()

const store = createRoomStore({
  ...props.view,
  refreshToken: async () => (await $fetch<PlayView>(`/api/play/${props.view.player.id}`)).socketToken
})
provideRoomStore(store)

onMounted(async () => {
  await Promise.all([store.loadBoard(), store.loadFeed(false)])
  store.connect()
})
onBeforeUnmount(() => store.disconnect())

const overlayUrl = ref<string>()
onMounted(() => { overlayUrl.value = `${location.origin}/overlay/${props.view.player.id}?key=${props.view.overlayKey}` })

async function leave() {
  await $fetch(`/api/rooms/${store.id}/leave`, { method: 'POST' })
  store.disconnect()
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default bg-default/80 backdrop-blur sticky top-0 z-20">
      <div class="max-w-[var(--ui-container)] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <UButton to="/" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" aria-label="All rooms" />
        <div class="min-w-0 flex items-center gap-3">
          <h1 class="font-display text-lg font-semibold tracking-tight truncate">{{ store.name }}</h1>
          <div class="hidden sm:flex items-center gap-1.5">
            <SiteGameName :game="store.settings.value.game" />
            <UBadge v-if="store.settings.value.lockout" color="warning" variant="subtle">Lockout</UBadge>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <RoomSharePopover :view="view" />
          <div class="hidden sm:flex items-center gap-2 text-sm text-muted pl-2">
            <span class="size-2.5 rounded-full" :class="store.player.value.spectator ? 'bg-accented' : `${store.chosenColor.value}square`" />
            {{ store.player.value.spectator ? 'Spectating as' : 'Playing as' }}
            <span class="text-default font-medium">{{ store.player.value.name }}</span>
          </div>
          <UButton label="Leave" icon="i-lucide-log-out" color="neutral" variant="subtle" size="sm" @click="leave" />
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-[var(--ui-container)] w-full mx-auto px-4 sm:px-6 py-6">
      <div class="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] items-start">
        <section class="flex flex-col items-center gap-4 mx-auto">
          <RoomColorChooser />
          <div class="relative" :class="{ 'hidden-card': store.coverVisible.value, 'editing': store.editMode.value }">
            <RoomBoard />
            <div v-show="store.coverVisible.value" class="board-cover" @click="store.reveal()">
              <div class="text-center">
                <UIcon name="i-lucide-eye-off" class="size-8 text-muted" />
                <div class="font-display text-lg font-medium mt-2">Card is hidden</div>
                <div class="text-muted text-sm">Click to reveal it for yourself</div>
              </div>
            </div>
          </div>
          <div v-if="store.socketState.value !== 'open'" class="text-xs text-muted inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
            {{ store.socketState.value === 'connecting' ? 'Connecting to the room…' : 'Connection lost, reconnecting…' }}
          </div>
        </section>

        <section class="flex flex-col gap-4 lg:h-[calc(100vh-6.5rem)] min-h-[36rem]">
          <RoomChatPanel class="flex-1 min-h-[22rem]" />
          <div class="grid gap-4 sm:grid-cols-2 shrink-0">
            <RoomPlayersPanel class="min-h-44 max-h-64" />
            <RoomSettingsPanel :overlay-url="overlayUrl" />
          </div>
        </section>
      </div>
    </main>
    <RoomNewCardDialog />
    <RoomGoalEditDialog />
  </div>
</template>
