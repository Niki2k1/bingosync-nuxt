<script setup lang="ts">
import type { PlayView } from '../../../shared/types'

const props = defineProps<{ view: PlayView }>()
const toast = useToast()

const showScores = ref(true)
const scale = ref(1)
const origin = ref('')
onMounted(() => { origin.value = location.origin })

const overlayUrl = computed(() => {
  const params = new URLSearchParams({ key: props.view.overlayKey })
  if (!showScores.value) params.set('players', '0')
  if (scale.value !== 1) params.set('scale', String(scale.value))
  return `${origin.value}/overlay/${props.view.player.id}?${params}`
})

async function copy() {
  try {
    await navigator.clipboard.writeText(overlayUrl.value)
    toast.add({ title: 'OBS overlay link copied', icon: 'i-lucide-check', color: 'success', duration: 2000 })
  } catch {
    // Clipboard access can be blocked (e.g. inside OBS or over plain http); fall back to a prompt.
    window.prompt('Copy the OBS overlay link:', overlayUrl.value)
  }
}
</script>

<template>
  <UPopover :ui="{ content: 'w-[26rem] max-w-[calc(100vw-2rem)] p-4' }">
    <UButton label="OBS" icon="i-lucide-cast" color="neutral" variant="subtle" size="sm" />
    <template #content>
      <div class="space-y-3">
        <div>
          <p class="text-sm font-medium">OBS browser source</p>
          <p class="text-xs text-muted">A transparent board that follows this room. Add it as a browser source; it only shows the card, never the invite.</p>
        </div>
        <div class="flex gap-2">
          <UInput :model-value="overlayUrl" readonly class="flex-1 font-mono text-xs" :ui="{ base: 'blur-[3px] focus:blur-none hover:blur-none transition' }" />
          <UButton label="Copy" icon="i-lucide-copy" @click="copy" />
        </div>
        <div class="flex items-center justify-between gap-3">
          <USwitch v-model="showScores" label="Show score row" size="sm" />
          <div class="flex items-center gap-2 text-xs text-muted">
            Scale
            <USelect v-model="scale" :items="[{ label: '75%', value: 0.75 }, { label: '100%', value: 1 }, { label: '125%', value: 1.25 }, { label: '150%', value: 1.5 }, { label: '200%', value: 2 }]" value-key="value" size="xs" class="w-24" />
          </div>
        </div>
        <UButton :to="overlayUrl" target="_blank" label="Preview in a new tab" icon="i-lucide-external-link" color="neutral" variant="ghost" size="xs" external />
      </div>
    </template>
  </UPopover>
</template>
