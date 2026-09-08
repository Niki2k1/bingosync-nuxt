<script setup lang="ts">
defineProps<{ compact?: boolean }>()
const store = useRoomStore()
const hoverLine = ref<string | null>(null)
const ROWS = [1, 2, 3, 4, 5]
const COLS = [1, 2, 3, 4, 5]

function slotHovered(slot: number): boolean {
  return hoverLine.value !== null && (LINES[hoverLine.value]?.includes(slot) ?? false)
}
</script>

<template>
  <table class="board" :class="{ compact }">
    <tbody>
      <tr>
        <td class="line-label corner" title="Top-left to bottom-right" @mouseenter="hoverLine = 'tlbr'" @mouseleave="hoverLine = null">TL-BR</td>
        <td v-for="c in COLS" :key="c" class="line-label" @mouseenter="hoverLine = `col${c}`" @mouseleave="hoverLine = null">COL {{ c }}</td>
      </tr>
      <tr v-for="r in ROWS" :key="r">
        <td class="line-label" @mouseenter="hoverLine = `row${r}`" @mouseleave="hoverLine = null">ROW {{ r }}</td>
        <RoomBoardSquare
          v-for="c in COLS"
          :key="c"
          :square="store.squares.value[(r - 1) * 5 + c - 1]!"
          :hovered="slotHovered((r - 1) * 5 + c)"
          :spectator="store.readonly || store.player.value.spectator"
          @select="store.clickSquare((r - 1) * 5 + c)"
        />
      </tr>
      <tr>
        <td class="line-label corner" title="Bottom-left to top-right" @mouseenter="hoverLine = 'bltr'" @mouseleave="hoverLine = null">BL-TR</td>
      </tr>
    </tbody>
  </table>
</template>
