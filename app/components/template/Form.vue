<script setup lang="ts">
import type { TemplateJson, TemplateMode } from '#shared/types'
import { BOARD_SIZE, TEMPLATE_NAME_MAX } from '#shared/utils/schemas'

const props = defineProps<{ template?: TemplateJson }>()
const emit = defineEmits<{ saved: [TemplateJson] }>()

const blankBoard = () => Array.from({ length: BOARD_SIZE }, () => '')
const state = reactive({
  name: props.template?.name ?? '',
  mode: (props.template?.mode ?? 'fixed') as TemplateMode,
  board: props.template?.mode === 'fixed' ? [...props.template.goals] : blankBoard(),
  pool: props.template?.mode === 'random' ? props.template.goals.join('\n') : ''
})

const modeItems = [
  { label: 'Fixed board', value: 'fixed', description: 'The 25 squares exactly as you place them.' },
  { label: 'Randomized', value: 'random', description: 'A pool of 25+ goals, shuffled for every card.' }
]

const poolGoals = computed(() => state.pool.split('\n').map(g => g.trim()).filter(Boolean))
const filledSquares = computed(() => state.board.filter(g => g.trim()).length)

// Switching keeps what was typed: the board's goals become the pool and the pool fills the board.
watch(() => state.mode, (mode) => {
  if (mode === 'random' && !poolGoals.value.length) state.pool = state.board.map(g => g.trim()).filter(Boolean).join('\n')
  if (mode === 'fixed' && !filledSquares.value) {
    const goals = poolGoals.value.slice(0, BOARD_SIZE)
    state.board = [...goals, ...blankBoard()].slice(0, BOARD_SIZE)
  }
})

function shuffleBoard() {
  const board = [...state.board]
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[board[i], board[j]] = [board[j]!, board[i]!]
  }
  state.board = board
}

const form = useTemplateRef('form')
const saving = ref(false)
const formError = ref<string>()

async function save() {
  formError.value = undefined
  saving.value = true
  try {
    const body = { name: state.name, mode: state.mode, goals: state.mode === 'fixed' ? state.board : poolGoals.value }
    const saved = props.template
      ? await $fetch<TemplateJson>(`/api/templates/${props.template.id}`, { method: 'PUT', body })
      : await $fetch<TemplateJson>('/api/templates', { method: 'POST', body })
    emit('saved', saved)
  } catch (error) {
    const { message, field } = extractApiError(error)
    if (field) form.value?.setErrors([{ name: field.split('.')[0]!, message }])
    else formError.value = message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UForm ref="form" :state="state" class="space-y-5" @submit="save">
    <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
    <UFormField name="name" label="Name" required>
      <UInput v-model="state.name" :maxlength="TEMPLATE_NAME_MAX" class="w-full max-w-md" placeholder="Friday night race" autocomplete="off" />
    </UFormField>
    <UFormField name="mode" label="Type">
      <URadioGroup v-model="state.mode" :items="modeItems" variant="card" orientation="horizontal" indicator="hidden" :ui="{ fieldset: 'w-full max-w-xl gap-2', item: 'flex-1' }" />
    </UFormField>

    <UFormField
      v-if="state.mode === 'fixed'"
      name="goals"
      label="Board"
      :description="`Click a square and type its goal. Empty squares can still be filled in during the race.`"
      :hint="`${filledSquares}/25`"
      :ui="{ container: 'mt-2 space-y-2' }"
    >
      <TemplateBoardGrid v-model="state.board" />
      <UButton label="Shuffle squares" icon="i-lucide-shuffle" color="neutral" variant="ghost" size="sm" :disabled="filledSquares < 2" @click="shuffleBoard" />
    </UFormField>
    <UFormField
      v-else
      name="goals"
      label="Goals"
      description="One goal per line. Every new card draws 25 of them."
      :hint="`${poolGoals.length} goals`"
    >
      <UTextarea v-model="state.pool" :rows="14" autoresize :maxrows="30" class="w-full max-w-xl" placeholder="Collect 3 keys&#10;Beat the first boss&#10;…" />
    </UFormField>

    <div class="flex items-center gap-2">
      <UButton type="submit" :label="template ? 'Save changes' : 'Create template'" icon="i-lucide-save" :loading="saving" />
      <slot name="actions" />
    </div>
  </UForm>
</template>
