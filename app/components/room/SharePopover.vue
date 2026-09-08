<script setup lang="ts">
import type { PlayView } from '../../../shared/types'

const props = defineProps<{ view: PlayView }>()
const store = useRoomStore()
const toast = useToast()

const inviteCode = ref(props.view.inviteCode)
const listed = ref(props.view.listed)
const origin = computed(() => (import.meta.client ? location.origin : ''))
const inviteUrl = computed(() => `${origin.value}/join/${inviteCode.value}`)

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: `${what} copied`, icon: 'i-lucide-check', color: 'success', duration: 2000 })
  } catch {
    // Clipboard access can be blocked (e.g. inside OBS or over plain http); fall back to a prompt.
    window.prompt(`Copy the ${what.toLowerCase()}:`, text)
  }
}

const rotating = ref(false)
async function rotate() {
  rotating.value = true
  try {
    const result = await $fetch<{ inviteCode: string }>(`/api/rooms/${store.id}/rotate-invite`, { method: 'POST' })
    inviteCode.value = result.inviteCode
    toast.add({ title: 'New invite link created', description: 'The old link no longer works. Players already in the room stay.', icon: 'i-lucide-refresh-cw', duration: 4000 })
  } finally {
    rotating.value = false
  }
}

async function toggleListed(value: boolean) {
  listed.value = value
  await $fetch(`/api/rooms/${store.id}/listed`, { method: 'POST', body: { listed: value } })
}
</script>

<template>
  <UPopover :ui="{ content: 'w-[26rem] max-w-[calc(100vw-2rem)] p-4' }">
    <UButton label="Invite" icon="i-lucide-user-plus" size="sm" />
    <template #content>
      <div class="space-y-4">
        <div>
          <p class="text-sm font-medium">Invite link</p>
          <p class="text-xs text-muted mb-2">Anyone with this link can join. Don't show it on stream.</p>
          <div class="flex gap-2">
            <UInput :model-value="inviteUrl" readonly class="flex-1 font-mono text-xs" :ui="{ base: 'blur-[3px] focus:blur-none hover:blur-none transition' }" />
            <UButton label="Copy" icon="i-lucide-copy" @click="copy(inviteUrl, 'Invite link')" />
          </div>
          <div class="flex items-center justify-between mt-2">
            <USwitch :model-value="listed" label="Show in the public room list" size="sm" @update:model-value="toggleListed" />
            <UButton label="New link" icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="xs" :loading="rotating" @click="rotate" />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
