<script setup lang="ts">
import type { PlayView } from '#shared/types'

definePageMeta({ layout: false })

const route = useRoute()
const playerId = computed(() => String(route.params.playerId))

const { data: view, error } = await useFetch<PlayView>(() => `/api/play/${playerId.value}`, { key: `play-${playerId.value}` })
if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'This room is not open in this browser. Ask for the invite link to join it.', fatal: true })
}

useHead({ title: computed(() => (view.value ? `${view.value.name} · Bingosync` : 'Bingosync')) })
</script>

<template>
  <RoomView v-if="view" :key="view.player.id" :view="view" />
</template>
