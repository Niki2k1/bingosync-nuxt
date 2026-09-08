<script setup lang="ts">
import type { InviteView } from '../../../shared/types'

const route = useRoute()
const code = computed(() => String(route.params.code))
const { user } = useUserSession()
const twitchEnabled = useTwitchEnabled()

const { data: invite, error } = await useFetch<InviteView>(() => `/api/join/${code.value}`, { key: `invite-${code.value}` })
if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: error.value.statusCode === 404 ? 'This invite link is not valid anymore' : 'Could not load the room', fatal: true })
}
// Already a member from this browser: straight to the board.
if (invite.value?.playerId) await navigateTo(`/play/${invite.value.playerId}`, { replace: true })

useHead({
  title: computed(() => (invite.value ? `Join ${invite.value.name} · Bingosync` : 'Bingosync')),
  meta: [{ name: 'description', content: computed(() => (invite.value ? `Bingosync room for '${invite.value.game.name}' made by ${invite.value.creator}` : '')) }]
})

const state = reactive({ nickname: user.value?.twitch?.displayName ?? '', spectator: false })
const form = useTemplateRef('form')
const submitting = ref(false)
const formError = ref<string>()
const needsTwitch = computed(() => invite.value?.twitchOnly && !user.value?.twitch)

async function join() {
  formError.value = undefined
  submitting.value = true
  try {
    const { playerId } = await $fetch<{ playerId: string }>(`/api/join/${code.value}`, { method: 'POST', body: { ...state } })
    await navigateTo(`/play/${playerId}`, { replace: true })
  } catch (error) {
    const { message, field } = extractApiError(error)
    if (field) form.value?.setErrors([{ name: field, message }])
    else formError.value = message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="invite" class="max-w-md mx-auto">
    <UButton to="/" label="All rooms" icon="i-lucide-arrow-left" color="neutral" variant="link" size="sm" class="mb-4 -ml-2" />
    <UCard>
      <template #header>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-muted text-xs mb-1">You're invited to</p>
            <h1 class="font-display text-2xl font-semibold tracking-tight truncate">{{ invite.name }}</h1>
            <p class="text-muted text-sm mt-0.5">Opened by {{ invite.creator }}</p>
          </div>
          <SiteGameName :game="invite.game" />
        </div>
      </template>
      <UAlert
        v-if="needsTwitch"
        color="neutral"
        variant="subtle"
        icon="i-lucide-twitch"
        title="This room is for Twitch users only"
        :description="twitchEnabled ? 'Sign in with Twitch to join.' : 'Twitch sign-in is not configured on this server.'"
        :actions="twitchEnabled ? [{ label: 'Sign in with Twitch', to: `/api/auth/twitch-start?returnTo=/join/${code}`, external: true, icon: 'i-lucide-twitch' }] : []"
      />
      <UForm v-else ref="form" :state="state" class="space-y-4" @submit="join">
        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
        <UFormField name="nickname" label="Your nickname" required>
          <UInput v-model="state.nickname" maxlength="50" class="w-full" autocomplete="nickname" autofocus />
        </UFormField>
        <UCheckbox v-model="state.spectator" label="Join as a spectator" description="Watch the board without marking squares." />
        <UButton type="submit" label="Join room" icon="i-lucide-log-in" block :loading="submitting" />
      </UForm>
    </UCard>
  </div>
</template>
