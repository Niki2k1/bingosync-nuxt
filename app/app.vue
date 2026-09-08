<script setup lang="ts">
const twitchEnabled = useTwitchEnabled()
const { data } = await useFetch<{ twitchEnabled: boolean }>('/api/auth/config', { key: 'auth-config' })
twitchEnabled.value = data.value?.twitchEnabled ?? false
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
