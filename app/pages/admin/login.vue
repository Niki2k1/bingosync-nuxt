<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const state = reactive({ password: '' })
const error = ref<string>()
const busy = ref(false)

async function login() {
  error.value = undefined
  busy.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: state })
    await refreshSession()
    const returnTo = String(route.query.returnTo ?? '/admin')
    await navigateTo(returnTo.startsWith('/admin') ? returnTo : '/admin')
  } catch (e) {
    error.value = extractApiError(e).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="font-display text-lg font-semibold">Admin sign in</h1>
      </template>
      <UForm :state="state" class="space-y-4" @submit="login">
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
        <UFormField name="password" label="Admin password" required>
          <UInput v-model="state.password" type="password" class="w-full" autocomplete="current-password" autofocus />
        </UFormField>
        <UButton type="submit" label="Sign in" block :loading="busy" />
      </UForm>
    </UCard>
  </div>
</template>
