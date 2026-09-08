<script setup lang="ts">
import type { SquareJson } from '../../../shared/types'
import { sortColors } from '../../../shared/utils/colors'

const props = defineProps<{ square: SquareJson, hovered: boolean, spectator: boolean }>()
const emit = defineEmits<{ select: [] }>()

const starred = ref(false)
const cell = ref<HTMLTableCellElement>()
const text = ref<HTMLDivElement>()

const sorted = computed(() => sortColors(props.square.colors))
// The stacked color layers are painted right-to-left, so the DOM order is reversed.
const layers = computed(() => [...sorted.value].reverse())
const title = computed(() => sorted.value.join(', '))

// Percent offsets per number of colors, kept from the original board so multi-color squares look familiar.
const TRANSLATE: Record<number, string[]> = {
  2: ['0', '0'],
  3: ['0', '36', '-34'],
  4: ['0', '46', '0', '-48'],
  5: ['0', '56', '18', '-18', '-56'],
  6: ['0', '60', '30', '0', '-30', '-60'],
  7: ['0', '64', '38', '13', '-13', '-38', '-64'],
  8: ['0', '64', '41', '20', '0', '-21', '-41', '-64'],
  9: ['0', '66', '45', '27', '9', '-9', '-27', '-45', '-66'],
  10: ['0', '68', '51', '34', '17', '0', '-17', '-34', '-51', '-68']
}

function updateColorOffsets() {
  const els = Array.from(cell.value?.querySelectorAll<HTMLElement>('.bg-color') ?? [])
  if (els.length === 0) return
  const first = els[0]!
  first.style.transform = ''
  first.style.borderRight = ''
  const angle = Math.atan(first.offsetWidth / first.offsetHeight)
  const translations = TRANSLATE[els.length] ?? []
  for (let i = 1; i < els.length; i++) {
    els[i]!.style.transform = `skew(-${angle}rad) translateX(${translations[i] ?? '0'}%)`
    els[i]!.style.borderRight = 'solid 1.5px rgba(0,0,0,0.5)'
  }
}

function refitText() {
  const el = text.value
  const td = cell.value
  if (!el || !td) return
  const maxHeight = td.clientHeight - 6
  let size = 13
  el.style.fontSize = `${size}px`
  while (el.offsetHeight > maxHeight && size > 8) {
    size -= 0.5
    el.style.fontSize = `${size}px`
  }
}

function relayout() {
  updateColorOffsets()
  refitText()
}

watch(() => props.square.colors, () => nextTick(updateColorOffsets), { deep: true })
watch(() => props.square.name, () => nextTick(refitText))

onMounted(() => {
  relayout()
  window.addEventListener('resize', relayout)
})
onBeforeUnmount(() => window.removeEventListener('resize', relayout))
</script>

<template>
  <td
    ref="cell"
    class="square"
    :class="{ hover: hovered, blank: layers.length === 0, spectator }"
    :title="title"
    @click="emit('select')"
    @contextmenu.prevent="starred = !starred"
  >
    <UIcon v-show="starred" name="i-lucide-star" class="star" />
    <div v-for="color in layers" :key="color" class="bg-color" :class="`${color}square`" />
    <div class="square-shadow" />
    <div ref="text" class="goal-text">{{ square.name }}</div>
  </td>
</template>
