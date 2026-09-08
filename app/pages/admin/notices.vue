<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Notice {
  id: number
  type: 'notice' | 'announcement' | 'warning' | 'error'
  header: string
  body: string
  visibleToUsers: boolean
  visibleToAdmins: boolean
}

const { data: notices, refresh } = await useFetch<Notice[]>('/api/admin/notices', { key: 'admin-notices' })
const toast = useToast()

const editing = ref<Partial<Notice> | null>(null)
const types = ['notice', 'announcement', 'warning', 'error']
const TYPE_COLOR = { notice: 'neutral', announcement: 'info', warning: 'warning', error: 'error' } as const

function openNew() {
  editing.value = { type: 'notice', header: '', body: '', visibleToUsers: false, visibleToAdmins: true }
}
function openEdit(n: Notice) {
  editing.value = { ...n }
}
async function save() {
  const n = editing.value
  if (!n) return
  if (n.id) await $fetch(`/api/admin/notices/${n.id}`, { method: 'PATCH', body: n })
  else await $fetch('/api/admin/notices', { method: 'POST', body: n })
  editing.value = null
  await refresh()
  toast.add({ title: 'Notice saved', color: 'success' })
}
async function remove(n: Notice) {
  await $fetch(`/api/admin/notices/${n.id}`, { method: 'DELETE' })
  await refresh()
}
async function setVisibility(n: Notice, visibleToUsers: boolean) {
  await $fetch(`/api/admin/notices/${n.id}`, { method: 'PATCH', body: { visibleToUsers, visibleToAdmins: true } })
  await refresh()
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Site notices">
        <template #right>
          <UButton label="New notice" icon="i-lucide-plus" @click="openNew" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <p class="text-sm text-muted mb-4">Notices show on the home page above the room list. HTML is allowed.</p>
      <UEmpty v-if="!notices?.length" icon="i-lucide-megaphone" title="No notices yet" :actions="[{ label: 'New notice', onClick: openNew }]" class="py-12 ring ring-default rounded-lg" />
      <div v-else class="space-y-3">
        <UCard v-for="n in notices" :key="n.id">
          <div class="flex items-start gap-4">
            <UBadge :color="TYPE_COLOR[n.type]" variant="subtle" class="shrink-0 mt-0.5">{{ n.type }}</UBadge>
            <div class="min-w-0 flex-1">
              <div class="font-medium" v-html="n.header || '<em class=text-muted>no header</em>'" />
              <div class="text-sm text-toned mt-1" v-html="n.body" />
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <USwitch :model-value="n.visibleToUsers" label="Public" size="sm" @update:model-value="v => setVisibility(n, v)" />
              <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" aria-label="Edit" @click="openEdit(n)" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" aria-label="Delete" @click="remove(n)" />
            </div>
          </div>
        </UCard>
      </div>

      <UModal :open="!!editing" :title="editing?.id ? 'Edit notice' : 'New notice'" @update:open="v => { if (!v) editing = null }">
        <template #body>
          <div v-if="editing" class="space-y-4">
            <UFormField label="Type"><USelect v-model="editing.type" :items="types" class="w-full" /></UFormField>
            <UFormField label="Header"><UInput v-model="editing.header" class="w-full" /></UFormField>
            <UFormField label="Body" description="HTML allowed"><UTextarea v-model="editing.body" :rows="5" class="w-full" /></UFormField>
            <USwitch v-model="editing.visibleToUsers" label="Visible to everyone" />
          </div>
        </template>
        <template #footer>
          <UButton label="Cancel" color="neutral" variant="ghost" @click="editing = null" />
          <UButton label="Save" @click="save" />
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
