<script setup lang="ts">
const store = useRoomStore()
const body = ref<HTMLDivElement>()
const input = ref('')
const s = store.chatSettings

const filters = [
  { key: 'chat', icon: 'i-lucide-message-square', label: 'Chat messages' },
  { key: 'goal', icon: 'i-lucide-square-check', label: 'Goal changes' },
  { key: 'color', icon: 'i-lucide-palette', label: 'Color changes' },
  { key: 'connection', icon: 'i-lucide-plug', label: 'Joins and leaves' },
  { key: 'timestamps', icon: 'i-lucide-clock', label: 'Timestamps' }
] as const

function scrollToBottom() {
  nextTick(() => {
    if (body.value) body.value.scrollTop = body.value.scrollHeight
  })
}
watch(() => store.events.value.length, scrollToBottom)
watch(() => store.feedLoaded.value, scrollToBottom)

async function send() {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  await store.sendChat(text)
}
</script>

<template>
  <UCard :ui="{ root: 'flex flex-col min-h-0', body: 'flex-1 min-h-0 p-0 sm:p-0 flex flex-col', footer: 'p-2 sm:p-2' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-display font-semibold">Feed</h2>
        <div class="flex items-center gap-0.5">
          <UTooltip v-for="f in filters" :key="f.key" :text="f.label">
            <UButton
              :icon="f.icon"
              size="xs"
              color="neutral"
              :variant="s[f.key] ? 'soft' : 'ghost'"
              :class="{ 'opacity-50': !s[f.key] }"
              :aria-pressed="s[f.key]"
              :aria-label="f.label"
              @click="s[f.key] = !s[f.key]"
            />
          </UTooltip>
        </div>
      </div>
    </template>
    <div ref="body" class="flex-1 min-h-0 overflow-y-auto feed-scroll px-4 py-3 text-sm space-y-0.5">
      <p v-if="!store.feedLoaded.value" class="text-muted italic">Loading the feed…</p>
      <template v-else>
        <button
          v-if="!store.allIncluded.value"
          type="button"
          class="w-full text-xs text-muted underline underline-offset-2 hover:text-default py-1"
          @click="store.loadFeed(true)"
        >Only the last 24 hours are shown. Load the full history</button>
        <RoomChatEntry v-for="event in store.events.value" :key="event.id" :event="event" />
      </template>
    </div>
    <template #footer>
      <form class="flex gap-2" @submit.prevent="send">
        <UInput v-model="input" placeholder="Say something" class="flex-1" autocomplete="off" :ui="{ base: 'bg-elevated/60' }" />
        <UButton type="submit" icon="i-lucide-send" aria-label="Send" :disabled="!input.trim()" />
      </form>
    </template>
  </UCard>
</template>
