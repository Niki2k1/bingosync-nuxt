import type { EventShapeRow, FeedEvent, GameRow, PlayerJson, PlayerRow, RoomRow, RoomSettings, SquareJson, SquareRow } from '#shared/types'
import type { PlayerColor } from '#shared/utils/colors'

export const LINES: Record<string, number[]> = {
  row1: [1, 2, 3, 4, 5], row2: [6, 7, 8, 9, 10], row3: [11, 12, 13, 14, 15], row4: [16, 17, 18, 19, 20], row5: [21, 22, 23, 24, 25],
  col1: [1, 6, 11, 16, 21], col2: [2, 7, 12, 17, 22], col3: [3, 8, 13, 18, 23], col4: [4, 9, 14, 19, 24], col5: [5, 10, 15, 20, 25],
  tlbr: [1, 7, 13, 19, 25], bltr: [5, 9, 13, 17, 21]
}

// Keep in sync with HEARTBEAT_MS in server/utils/presence.ts.
const HEARTBEAT_MS = 15_000

export interface ChatSettings {
  chat: boolean
  goal: boolean
  color: boolean
  connection: boolean
  timestamps: boolean
}

type Shape<T> = { data: Ref<T[]>, isLive: Ref<boolean>, error: Ref<unknown> }

export interface RoomShapes {
  room: Shape<RoomRow>
  games: Shape<GameRow>
  squares: Shape<SquareRow>
  players: Shape<PlayerRow>
  /** not loaded by overlays */
  events?: Shape<EventShapeRow>
}

/**
 * Live rows of a room: room, games, board squares, players and (for players) the event feed.
 * Overlays pass their key instead of a session and don't get the feed.
 */
export async function useRoomShapes(roomId: string, overlay?: { playerId: string, key: string }): Promise<RoomShapes> {
  const base = `/api/rooms/${roomId}/shapes`
  const query = overlay ? `?overlay=${encodeURIComponent(overlay.playerId)}&key=${encodeURIComponent(overlay.key)}` : ''
  const [room, games, squares, players, events] = await Promise.all([
    useShape<RoomRow>(`${base}/room${query}`),
    useShape<GameRow>(`${base}/games${query}`),
    useShape<SquareRow>(`${base}/squares${query}`),
    useShape<PlayerRow>(`${base}/players${query}`),
    overlay ? undefined : useShape<EventShapeRow>(`${base}/events`)
  ])
  return { room, games, squares, players, events }
}

export interface RoomStoreInit {
  roomId: string
  name: string
  player: PlayerJson
  settings: RoomSettings
  shapes: RoomShapes
  /** overlays only watch: no feed, no actions, and they never count as a player */
  readonly?: boolean
}

export type RoomStore = ReturnType<typeof createRoomStore>

const KEY = Symbol('room-store')

function emptyBoard(): SquareJson[] {
  return Array.from({ length: 25 }, (_, i) => ({ slot: i + 1, name: '', colors: [] }))
}

export function createRoomStore(init: RoomStoreInit) {
  const id = init.roomId
  const name = init.name
  const readonly = init.readonly ?? false
  const { shapes } = init

  const room = computed(() => shapes.room.data.value[0])
  const currentGameId = computed(() => room.value?.currentGameId ?? null)
  const game = computed(() => shapes.games.data.value.find(g => g.id === currentGameId.value))

  const player = ref<PlayerJson>(init.player)
  const settings = ref<RoomSettings>(init.settings)
  const squares = ref<SquareJson[]>(emptyBoard())
  const chosenColor = ref<PlayerColor>(init.player.color === 'blank' ? 'red' : init.player.color)
  const revealed = ref(false)
  const chatSettings = reactive<ChatSettings>({ chat: true, goal: true, color: true, connection: true, timestamps: true })
  const newCardOpen = ref(false)
  const editMode = ref(false)
  const editingSlot = ref<number | null>(null)

  // ---- derived from the shapes ----

  // The board is a ref, not a computed, so goal edits show up before the server confirms them.
  watch([() => shapes.squares.data.value, currentGameId], ([rows, gameId]) => {
    const board = emptyBoard()
    for (const row of rows) {
      if (row.gameId === gameId && row.slot >= 1 && row.slot <= 25) {
        board[row.slot - 1] = { slot: row.slot, name: row.goal, colors: maskToColors(row.colorMask) }
      }
    }
    squares.value = board
  }, { immediate: true })

  const allPlayers = computed(() => new Map(shapes.players.data.value.map(p => [p.id, playerToJson(p)])))
  const players = computed(() => new Map(
    shapes.players.data.value.filter(p => p.online && !p.spectator).map(p => [p.id, playerToJson(p)])
  ))
  const sortedPlayers = computed(() => [...players.value.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))

  // This browser's own player row: color changes (also from other tabs) and admin edits.
  watch(() => allPlayers.value.get(init.player.id), (me) => {
    if (!me) return
    player.value = me
    if (me.color !== 'blank') chosenColor.value = me.color
  }, { immediate: true })

  // Room and card settings come with the shapes, except the seed (kept off them for hidden cards).
  watch([room, game], ([r, g]) => {
    if (!r || !g) return
    settings.value = { ...settings.value, hideCard: r.hideCard, lockout: g.lockout, game: gameInfo(g.variant) }
  })
  watch([currentGameId, () => game.value?.revealedAt], async ([gameId], [previousGameId]) => {
    if (gameId !== previousGameId) {
      // Every viewer gets the fresh card; the cover comes back down when the room hides cards.
      revealed.value = false
      newCardOpen.value = false
    }
    await loadSettings()
  })

  const events = computed<FeedEvent[]>(() => {
    const rows = [...(shapes.events?.data.value ?? [])].sort((a, b) => a.id - b.id)
    const latestNewCardId = rows.findLast(e => e.type === 'new-card')?.id
    const ctx = { latestNewCardId, currentSeed: settings.value.seed }
    return rows.flatMap((row) => {
      const author = allPlayers.value.get(row.playerId)
      return author ? [toFeedEvent(row, author, ctx)] : []
    })
  })
  const feedLoaded = computed(() => !shapes.events || shapes.events.data.value.length > 0 || shapes.events.isLive.value)

  const allShapes = computed(() => [shapes.room, shapes.games, shapes.squares, shapes.players, shapes.events].filter(s => !!s))
  const socketState = computed<'connecting' | 'open' | 'closed'>(() => {
    if (allShapes.value.some(s => s.error.value)) return 'closed'
    return allShapes.value.every(s => s.isLive.value) ? 'open' : 'connecting'
  })

  const coverVisible = computed(() => settings.value.hideCard && !revealed.value)

  const api = <T>(path: string, body?: unknown) => $fetch<T>(`/api/rooms/${id}${path}`, body === undefined ? undefined : { method: 'POST', body })

  async function loadSettings() {
    if (readonly) return
    settings.value = await api<RoomSettings>('/settings')
  }

  function colorCount(color: PlayerColor): number {
    return squares.value.filter(s => s.colors.includes(color)).length
  }

  function lineCount(color: PlayerColor): number {
    return Object.values(LINES).filter(line => line.every(slot => squares.value[slot - 1]?.colors.includes(color))).length
  }

  async function clickSquare(slot: number) {
    if (readonly || player.value.spectator) return
    if (editMode.value) {
      editingSlot.value = slot
      return
    }
    const square = squares.value[slot - 1]!
    const color = chosenColor.value
    let remove: boolean
    if (square.colors.length === 0) remove = false
    else if (square.colors.includes(color)) remove = true
    else if (!settings.value.lockout) remove = false
    else return
    await api('/select', { slot, color, remove }).catch(console.error)
  }

  async function chooseColor(color: PlayerColor) {
    if (readonly || player.value.spectator || chosenColor.value === color) return
    chosenColor.value = color
    player.value = { ...player.value, color }
    await api('/color', { color }).catch(console.error)
  }

  async function saveGoal(slot: number, name: string) {
    if (readonly) return
    const square = squares.value[slot - 1]
    if (square) square.name = name
    await api('/goal', { slot, name }).catch(console.error)
  }

  async function sendChat(text: string) {
    if (readonly || !text) return
    await api('/chat', { text }).catch(console.error)
  }

  async function reveal() {
    if (readonly || !coverVisible.value) return
    revealed.value = true
    try {
      const { seed } = await api<{ seed: number }>('/reveal', {})
      settings.value = { ...settings.value, seed }
    } catch (error) {
      console.error(error)
    }
  }

  // ---- presence ----
  // The shapes keep the page live on their own; the heartbeat tells the others we're here.
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined

  function heartbeat() {
    if (readonly) return
    api('/presence', {}).catch(console.error)
  }

  function onVisible() {
    if (document.visibilityState === 'visible') heartbeat()
  }

  function connect() {
    if (readonly || heartbeatTimer) return
    heartbeat()
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', onVisible)
  }

  function disconnect() {
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
    document.removeEventListener('visibilitychange', onVisible)
  }

  return {
    id, name, readonly, player, settings, squares, players, sortedPlayers, events, feedLoaded, chosenColor, revealed, coverVisible,
    chatSettings, newCardOpen, editMode, editingSlot, socketState,
    loadSettings, colorCount, lineCount, clickSquare, chooseColor, saveGoal, sendChat, reveal, connect, disconnect
  }
}

export function provideRoomStore(store: RoomStore) {
  provide(KEY, store)
}

export function useRoomStore(): RoomStore {
  const store = inject<RoomStore>(KEY)
  if (!store) throw new Error('useRoomStore called outside a room')
  return store
}
