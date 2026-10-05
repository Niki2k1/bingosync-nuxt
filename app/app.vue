<script setup lang="ts">
const { admin } = useAccount()
const { data } = await useFetch<{ admin: boolean }>('/api/me', { key: 'me' })
admin.value = data.value?.admin ?? false
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
