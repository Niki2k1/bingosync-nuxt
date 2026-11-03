import type { TemplateSummary } from '#shared/types'
import { CUSTOM_FIXED_ID, CUSTOM_RANDOMIZED_ID } from '#shared/utils/games'

/** The signed-in user's templates; empty for visitors, who have none. */
export function useMyTemplates() {
  const { user } = useAccount()
  const { data, refresh, status } = useFetch<TemplateSummary[]>('/api/templates', {
    key: 'my-templates',
    immediate: !!user.value,
    default: () => []
  })
  watch(() => user.value?.email, (email) => {
    if (email) refresh()
  })
  return { templates: computed(() => (user.value ? data.value : [])), refresh, status }
}

export const TEMPLATE_MODE_LABEL = { fixed: 'Fixed board', random: 'Randomized' } as const

export function templateDescription(t: TemplateSummary): string {
  return t.mode === 'fixed' ? `${TEMPLATE_MODE_LABEL.fixed} · ${t.goalCount}/25 squares` : `${TEMPLATE_MODE_LABEL.random} · ${t.goalCount} goals`
}

/** Request fields that start a card from the template; the server takes the board from it. */
export function templateCardFields(t: TemplateSummary) {
  return { templateId: t.id, variant: t.mode === 'fixed' ? CUSTOM_FIXED_ID : CUSTOM_RANDOMIZED_ID }
}
