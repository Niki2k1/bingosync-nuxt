import type { FeedEvent, PlayerJson, RoomSettings, SocketMessage, SquareJson } from '../../shared/types'
import type { PlayerColor } from '../../shared/utils/colors'

export const LINES: Record<string, number[]> = {
  row1: [1, 2, 3, 4, 5], row2: [6, 7, 8, 9, 10], row3: [11, 12, 13, 14, 15], row4: [16, 17, 18, 19, 20], row5: [21, 22, 23, 24, 25],
  col1: [1, 6, 11, 16, 21], col2: [2, 7, 12, 17, 22], col3: [3, 8, 13, 18, 23], col4: [4, 9, 14, 19, 24], col5: [5, 10, 15, 20, 25],
  tlbr: [1, 7, 13, 19, 25], bltr: [5, 9, 13, 17, 21]
}

export interface ChatSettings {
  chat: boolean
  goal: boolean
  color: boolean
  connection: boolean
  timestamps: boolean
}

export interface RoomStoreInit {
  roomId: string
  name: string
  player: PlayerJson
  players: PlayerJson[]
  settings: RoomSettings
  socketToken: string
  /** overlays only watch: no feed, no actions, and a socket token that never counts as a player */
  readonly?: boolean
  /** how to get a fresh socket token when the connection has to be rebuilt */
  refreshToken: () => Promise<string | undefined>
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
  const player = ref<PlayerJson>(init.player)
  const settings = ref<RoomSettings>(init.settings)
  const squares = ref<SquareJson[]>(emptyBoard())
  const players = ref(new Map<string, PlayerJson>(init.players.map(p => [p.id, p])))
  const events = ref<FeedEvent[]>([])
  const feedLoaded = ref(false)
  const allIncluded = ref(true)
  const chosenColor = ref<PlayerColor>(init.player.color === 'blank' ? 'red' : init.player.color)
  const revealed = ref(false)
  const chatSettings = reactive<ChatSettings>({ chat: true, goal: true, color: true, connection: true, timestamps: true })
  const newCardOpen = ref(false)
  const editMode = ref(false)
  const editingSlot = ref<number | null>(null)
  const socketState = ref<'connecting' | 'open' | 'closed'>('connecting')

  const coverVisible = computed(() => settings.value.hideCard && !revealed.value)
  const sortedPlayers = computed(() => [...players.value.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))

  const api = <T>(path: string, body?: unknown) => $fetch<T>(`/api/rooms/${id}${path}`, body === undefined ? undefined : { method: 'POST', body })

  async function loadBoard() {
    squares.value = await api<SquareJson[]>('/board')
  }

  async function loadFeed(full: boolean) {
    if (readonly) return
    const result = await api<{ events: FeedEvent[], allIncluded: boolean }>(`/feed${full ? '?full=true' : ''}`)
    events.value = result.events
    allIncluded.value = result.allIncluded
    feedLoaded.value = true
  }

  async function loadSettings() {
    if (readonly) return
    settings.value = await api<RoomSettings>('/settings')
    revealSeedInFeed()
  }

  // Once the seed is known, the "hidden" placeholder on the current card's feed entry is replaced.
  function revealSeedInFeed() {
    const seed = settings.value.seed
    if (seed === null) return
    for (const event of events.value) {
      if (event.type === 'new-card' && event.isCurrent && event.seed === null) event.seed = seed
    }
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
      revealSeedInFeed()
    } catch (error) {
      console.error(error)
    }
  }

  function applyEvent(event: FeedEvent) {
    switch (event.type) {
      case 'goal': {
        const square = squares.value[event.square.slot - 1]
        if (square) square.colors = event.square.colors
        break
      }
      case 'color':
        if (!event.player.spectator) players.value.set(event.player.id, event.player)
        if (event.player.id === player.value.id) {
          chosenColor.value = event.color
          player.value = event.player
        }
        break
      case 'connection':
        if (event.status === 'connected' && !event.player.spectator) players.value.set(event.player.id, event.player)
        else if (event.status === 'disconnected') players.value.delete(event.player.id)
        break
      case 'new-card':
        // Every viewer gets the fresh card; the cover comes back down when the room hides cards.
        revealed.value = false
        newCardOpen.value = false
        if (readonly) {
          settings.value = { ...settings.value, hideCard: event.hideCard }
          loadBoard().catch(console.error)
        } else {
          Promise.all([loadSettings(), loadBoard()]).catch(console.error)
        }
        break
    }
    if (!readonly) events.value.push(event)
  }

  // ---- socket ----
  let socket: WebSocket | undefined
  let token: string | undefined = init.socketToken
  let reconnectDelay = 2000
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let closedByUser = false
  let everConnected = false

  function pushSystemMessage(text: string) {
    if (readonly) return
    events.value.push({ id: -Date.now(), timestamp: Date.now(), type: 'connection', status: 'disconnected', player: { id: '', name: text, color: 'blank', spectator: false }, playerColor: 'blank', system: true } as FeedEvent & { system: true })
  }

  function connect() {
    if (!token || closedByUser) return
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    socketState.value = 'connecting'
    socket = new WebSocket(`${protocol}://${location.host}/ws`)
    const current = socket
    current.onopen = () => current.send(JSON.stringify({ type: 'auth', token }))
    current.onmessage = (ev) => {
      let message: SocketMessage
      try {
        message = JSON.parse(ev.data)
      } catch {
        return
      }
      if (message.type === 'joined') {
        socketState.value = 'open'
        token = undefined
        reconnectDelay = 2000
        // Anything that happened while offline is picked up by reloading the room state.
        if (everConnected) Promise.all([loadBoard(), loadFeed(false), loadSettings()]).catch(console.error)
        everConnected = true
      } else if (message.type === 'event') {
        applyEvent(message.event)
      } else if (message.type === 'board') {
        squares.value = message.squares
      } else if (message.type === 'error') {
        // The one-time token was already used (e.g. after a hot reload); fetch a fresh one and retry.
        token = undefined
        current.onclose = null
        current.close()
        socketState.value = 'closed'
        scheduleReconnect()
      }
    }
    current.onclose = () => {
      if (socket !== current) return
      socketState.value = 'closed'
      if (closedByUser) return
      pushSystemMessage('*** Connection lost, reconnecting…')
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (closedByUser) return
    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(async () => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
      try {
        token = await init.refreshToken()
        if (token) connect()
        else scheduleReconnect()
      } catch {
        scheduleReconnect()
      }
    }, reconnectDelay)
  }

  function disconnect() {
    closedByUser = true
    clearTimeout(reconnectTimer)
    socket?.close()
  }

  return {
    id, name, readonly, player, settings, squares, players, sortedPlayers, events, feedLoaded, allIncluded, chosenColor, revealed, coverVisible,
    chatSettings, newCardOpen, editMode, editingSlot, socketState,
    loadBoard, loadFeed, loadSettings, colorCount, lineCount, clickSquare, chooseColor, saveGoal, sendChat, reveal, connect, disconnect
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
