<script setup lang="ts">
// The 25 squares of a fixed board, editable or read-only.
const goals = defineModel<string[]>({ required: true })
defineProps<{ readonly?: boolean }>()
</script>

<template>
  <div class="grid grid-cols-5 gap-1.5 w-full max-w-[38rem]">
    <div
      v-for="(_, i) in goals"
      :key="i"
      class="aspect-square rounded-md ring ring-default bg-elevated/40 flex"
      :class="{ 'ring-dashed opacity-70': !goals[i] }"
    >
      <span v-if="readonly" class="m-auto p-1.5 text-center text-xs sm:text-sm leading-snug line-clamp-5 break-words">{{ goals[i] }}</span>
      <textarea
        v-else
        v-model="goals[i]"
        maxlength="255"
        :aria-label="`Square ${i + 1}`"
        :placeholder="String(i + 1)"
        class="w-full h-full resize-none bg-transparent p-1.5 text-center text-xs sm:text-sm leading-snug outline-none focus:ring-2 focus:ring-primary rounded-md placeholder:text-dimmed"
      />
    </div>
  </div>
</template>
