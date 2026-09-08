<script setup lang="ts">
import type { RoomListEntry, SiteNoticeJson } from '#shared/types'
import { BLANK_ID, CUSTOM_GROUP_ID } from '#shared/utils/games'
import { getVariant } from '#shared/utils/games'

const { data, refresh } = await useAsyncData('home', async () => {
  const [rooms, notices] = await Promise.all([
    $fetch<{ rooms: RoomListEntry[] }>('/api/rooms'),
    $fetch<SiteNoticeJson[]>('/api/notices')
  ])
  return { rooms: rooms.rooms, notices }
})

const rooms = computed(() => data.value?.rooms ?? [])
const notices = computed(() => data.value?.notices ?? [])
const idleCount = computed(() => rooms.value.filter(r => r.idle).length)
const showIdle = ref(false)
const visibleRooms = computed(() => (showIdle.value ? rooms.value : rooms.value.filter(r => !r.idle)))

const NOTICE_COLOR = { notice: 'neutral', announcement: 'info', warning: 'warning', error: 'error' } as const

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => refresh(), 15_000)
  suggestedName.value = generateRoomName()
  if (!state.nickname) state.nickname = loadNickname()
})
onUnmounted(() => clearInterval(timer))

const { user } = useUserSession()
const twitchEnabled = useTwitchEnabled()
const modeItems = [
  { label: 'Non-lockout', value: 'normal', description: 'Several players can own the same square.' },
  { label: 'Lockout', value: 'lockout', description: 'First to mark a square keeps it.' }
]
const visibilityItems = [
  { label: 'Private · invite link only', value: 'private' },
  { label: 'Public · listed on the home page', value: 'public' }
]
const suggestedName = ref('')
const state = reactive({
  name: '',
  nickname: user.value?.twitch?.displayName ?? '',
  group: BLANK_ID as number | undefined,
  variant: BLANK_ID as number | undefined,
  customJson: '',
  mode: 'normal' as 'normal' | 'lockout',
  seed: undefined as number | undefined,
  spectator: false,
  hideCard: false,
  visibility: 'private' as 'private' | 'public',
  twitchOnly: false
})
const usesSeed = computed(() => (state.variant === undefined ? true : (getVariant(state.variant)?.usesSeed ?? true)))
const form = useTemplateRef('form')
const submitting = ref(false)
const formError = ref<string>()

async function makeRoom() {
  formError.value = undefined
  if (state.variant === undefined) {
    form.value?.setErrors([{ name: 'group', message: 'Pick a game' }])
    return
  }
  submitting.value = true
  try {
    const { playerId } = await $fetch<{ playerId: string }>('/api/rooms', {
      method: 'POST',
      body: {
        name: state.name.trim() || suggestedName.value,
        nickname: state.nickname,
        variant: state.variant,
        customJson: state.group === CUSTOM_GROUP_ID ? state.customJson : '',
        lockout: state.mode === 'lockout',
        seed: state.seed ?? '',
        spectator: state.spectator,
        hideCard: state.hideCard,
        listed: state.visibility === 'public',
        twitchOnly: state.twitchOnly
      }
    })
    saveNickname(state.nickname)
    await navigateTo(`/play/${playerId}`)
  } catch (error) {
    const { message, field } = extractApiError(error)
    if (field) form.value?.setErrors([{ name: field === 'variant' ? 'group' : field, message }])
    else formError.value = message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="notices.length" class="space-y-3 mb-8">
      <UAlert
        v-for="notice in notices"
        :key="notice.id"
        :color="NOTICE_COLOR[notice.type]"
        variant="subtle"
        :icon="notice.type === 'error' ? 'i-lucide-octagon-alert' : notice.type === 'warning' ? 'i-lucide-triangle-alert' : 'i-lucide-megaphone'"
      >
        <template v-if="notice.header" #title><span v-html="notice.header" /></template>
        <template v-if="notice.body" #description><span v-html="notice.body" /></template>
      </UAlert>
    </div>

    <div class="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start">
      <section>
        <div class="flex items-end justify-between gap-4 mb-4">
          <div>
            <h1 class="font-display text-3xl font-semibold tracking-tight">Active rooms</h1>
            <p class="text-muted text-sm mt-1">Public rooms anyone can join. Unlisted rooms only open with their invite link.</p>
          </div>
          <UButton
            v-if="idleCount"
            :label="showIdle ? `Hide ${idleCount} idle` : `Show ${idleCount} idle`"
            color="neutral"
            variant="ghost"
            size="sm"
            :icon="showIdle ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            @click="showIdle = !showIdle"
          />
        </div>

        <UEmpty
          v-if="!visibleRooms.length"
          icon="i-lucide-layout-grid"
          title="No rooms are open right now"
          description="Make one and share the link with the people you're racing."
          class="py-16 ring ring-default rounded-lg"
        />
        <ul v-else class="divide-y divide-default ring ring-default rounded-lg overflow-hidden">
          <li v-for="room in visibleRooms" :key="room.inviteCode">
            <NuxtLink
              :to="`/join/${room.inviteCode}`"
              class="flex items-center gap-4 px-4 py-3 hover:bg-elevated/60 transition-colors"
              :class="{ 'opacity-60': room.idle }"
            >
              <div class="min-w-0 flex-1">
                <div class="font-display font-medium text-base truncate">{{ room.name }}</div>
                <div class="text-muted text-xs mt-0.5 truncate">by {{ room.creator }}</div>
              </div>
              <SiteGameName :game="room.game" />
              <div class="w-16 shrink-0 text-right text-sm tabular-nums inline-flex items-center justify-end gap-1.5" :class="room.connectedPlayers ? 'text-default' : 'text-muted'">
                <UIcon name="i-lucide-users" class="size-4" />{{ room.connectedPlayers }}
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-display text-lg font-semibold">Create a room</h2>
            <p class="text-muted text-xs">No password needed: the invite link is the key.</p>
          </div>
        </template>
        <UForm ref="form" :state="state" class="space-y-4" @submit="makeRoom">
          <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
          <UFormField name="name" label="Room name" :hint="state.name ? undefined : 'Leave empty to use the suggestion'">
            <UInput v-model="state.name" maxlength="255" class="w-full" autocomplete="off" :placeholder="suggestedName" />
          </UFormField>
          <UFormField name="nickname" label="Your nickname" required>
            <UInput v-model="state.nickname" maxlength="50" class="w-full" autocomplete="nickname" />
          </UFormField>
          <SiteGameSelectFields v-model:group="state.group" v-model:variant="state.variant" v-model:custom-json="state.customJson" />
          <UFormField name="mode" label="Mode">
            <URadioGroup v-model="state.mode" :items="modeItems" variant="card" orientation="horizontal" indicator="hidden" :ui="{ fieldset: 'w-full gap-2', item: 'flex-1' }" />
          </UFormField>
          <div class="grid sm:grid-cols-2 gap-4">
            <UFormField name="visibility" label="Visibility">
              <USelect v-model="state.visibility" :items="visibilityItems" value-key="value" class="w-full" />
            </UFormField>
            <UFormField v-if="usesSeed" name="seed" label="Seed" hint="Optional">
              <UInputNumber v-model="state.seed" :min="0" :max="2147483647" placeholder="Random" class="w-full" :format-options="{ useGrouping: false }" />
            </UFormField>
          </div>
          <div class="space-y-2 pt-1">
            <UCheckbox v-model="state.hideCard" label="Hide the card until someone reveals it" />
            <UCheckbox v-model="state.spectator" label="Join as a spectator" />
            <UCheckbox v-if="twitchEnabled && user?.twitch" v-model="state.twitchOnly" label="Only people signed in with Twitch can join" />
          </div>
          <UButton type="submit" label="Create room" icon="i-lucide-plus" block :loading="submitting" />
        </UForm>
      </UCard>
    </div>
  </div>
</template>
