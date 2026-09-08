<script setup lang="ts">
import type { FeedEvent } from '../../../shared/types'

const props = defineProps<{ event: FeedEvent & { system?: boolean } }>()
const store = useRoomStore()
const s = store.chatSettings

const visible = computed(() => {
  switch (props.event.type) {
    case 'chat': return s.chat
    case 'goal':
    case 'edit': return s.goal
    case 'color': return s.color
    case 'connection': return s.connection
    default: return true
  }
})
const time = computed(() => formatClock(props.event.timestamp))
const playerClass = computed(() => `${props.event.playerColor}player`)
const displayName = computed(() => props.event.player.name + (props.event.player.spectator ? ' (spectator)' : ''))
</script>

<template>
  <div v-show="visible" class="flex gap-2 leading-5" :class="event.type === 'chat' ? 'text-default' : 'text-muted'">
    <span v-show="s.timestamps" class="text-[11px] text-dimmed tabular-nums shrink-0 pt-0.5 w-14">{{ time }}</span>
    <span class="min-w-0 break-words">
      <template v-if="event.system"><em>{{ event.player.name }}</em></template>

      <template v-else-if="event.type === 'connection'">
        <em>{{ displayName }} {{ event.status === 'connected' ? 'joined' : 'left' }}</em>
      </template>

      <template v-else-if="event.type === 'color'">
        <span class="font-medium" :class="playerClass">{{ event.player.name }}</span> switched to
        <span class="font-medium" :class="`${event.color}player`">{{ event.color }}</span><template v-if="event.moved"> and moved {{ event.moved }} {{ event.moved === 1 ? 'square' : 'squares' }}</template>
      </template>

      <template v-else-if="event.type === 'edit'">
        <span class="font-medium" :class="playerClass">{{ event.player.name }}</span> set square {{ event.slot }} to
        <span class="text-default font-medium">{{ event.name || 'empty' }}</span>
      </template>

      <template v-else-if="event.type === 'revealed'">
        <span class="font-medium" :class="playerClass">{{ event.player.name }}</span> revealed the card
      </template>

      <template v-else-if="event.type === 'new-card'">
        <span class="font-medium" :class="playerClass">{{ event.player.name }}</span> generated a new card for
        <span class="text-default font-medium">{{ event.game }}</span><template v-if="event.showSeed">, seed
          <span v-if="event.seed === null" class="italic">hidden</span><span v-else class="text-default font-medium tabular-nums">{{ event.seed }}</span></template>
      </template>

      <template v-else-if="event.type === 'chat'">
        <span class="font-semibold" :class="playerClass">{{ displayName }}</span>
        <span class="text-dimmed">: </span>{{ event.text }}
      </template>

      <template v-else-if="event.type === 'goal'">
        <span class="font-medium" :class="playerClass">{{ displayName }}</span>
        {{ event.remove ? 'cleared' : 'marked' }}
        <span class="font-medium" :class="event.remove ? 'blankplayer' : `${event.color}player`">{{ event.square.name }}</span>
      </template>
    </span>
  </div>
</template>
