import type { UserMessage, AssistantMessage, SummaryMessage } from '~/types/claude'

type LiveMessage = UserMessage | AssistantMessage | SummaryMessage

interface CompactBoundary {
  logicalParentUuid: string
  timestamp: string
}

interface LiveSessionState {
  sessionId: string | null
  projectPath: string | null
  messages: LiveMessage[]
  connected: boolean
  error: string | null
}

export function useLiveSession() {
  const state = reactive<LiveSessionState>({
    sessionId: null,
    projectPath: null,
    messages: [],
    connected: false,
    error: null,
  })

  let eventSource: EventSource | null = null
  const messageMap = new Map<string, UserMessage | AssistantMessage>()
  const compactBoundaries: CompactBoundary[] = []

  function connect() {
    if (eventSource) {
      eventSource.close()
    }

    state.error = null
    state.messages = []
    messageMap.clear()
    compactBoundaries.length = 0

    eventSource = new EventSource('/api/sessions/live')

    eventSource.addEventListener('init', (event) => {
      const data = JSON.parse(event.data)
      state.sessionId = data.sessionId
      state.projectPath = data.projectPath
      state.connected = true
    })

    eventSource.addEventListener('history', (event) => {
      const data = JSON.parse(event.data)
      processMessages(data.messages)
    })

    eventSource.addEventListener('history_batch', (event) => {
      const data = JSON.parse(event.data)
      processMessages(data.messages)
      // Could show loading progress: data.loaded / data.total
    })

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      processMessages([data])
    })

    eventSource.addEventListener('session_switch', (event) => {
      const data = JSON.parse(event.data)
      console.log('Session switched:', data)
      state.sessionId = data.newSessionId
      state.projectPath = data.projectPath
      // Don't clear messages - keep them for continuity after context compaction
    })

    eventSource.addEventListener('error', (event) => {
      // Check if it's a custom error event with data
      if (event instanceof MessageEvent && event.data) {
        const data = JSON.parse(event.data)
        state.error = data.error
      } else {
        state.error = 'Connection lost'
      }
      state.connected = false
    })

    eventSource.onerror = () => {
      state.connected = false
    }
  }

  function processMessages(rawMessages: any[]) {
    for (const raw of rawMessages) {
      // Skip file-history-snapshot and summary messages
      if (raw.type === 'file-history-snapshot' || raw.type === 'summary') continue

      // Detect compact_boundary system messages (actual compaction events)
      if (raw.type === 'system' && raw.subtype === 'compact_boundary' && raw.logicalParentUuid && raw.timestamp) {
        // Avoid duplicates
        if (!compactBoundaries.some((b) => b.logicalParentUuid === raw.logicalParentUuid)) {
          compactBoundaries.push({
            logicalParentUuid: raw.logicalParentUuid,
            timestamp: raw.timestamp,
          })
        }
        continue
      }

      const id = raw.uuid || raw.message?.id

      if (raw.type === 'user') {
        const msg: UserMessage = {
          type: 'user',
          uuid: raw.uuid,
          parentUuid: raw.parentUuid,
          timestamp: raw.timestamp,
          message: raw.message,
        }
        messageMap.set(id, msg)
      } else if (raw.type === 'assistant') {
        const msg: AssistantMessage = {
          type: 'assistant',
          uuid: raw.uuid,
          parentUuid: raw.parentUuid,
          timestamp: raw.timestamp,
          message: raw.message,
        }
        messageMap.set(id, msg)
      }
    }

    // Rebuild ordered message list
    rebuildMessageList()
  }

  function rebuildMessageList() {
    const messages = Array.from(messageMap.values())

    // Simple timestamp-based ordering for live view
    messages.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime()
      const timeB = new Date(b.timestamp || 0).getTime()
      return timeA - timeB
    })

    // Create compaction markers with timestamps based on logicalParentUuid
    const compactionMarkers: Array<{ marker: SummaryMessage; timestamp: number }> = []
    
    for (const boundary of compactBoundaries) {
      const parentMsg = messageMap.get(boundary.logicalParentUuid)
      const timestamp = parentMsg && parentMsg.timestamp
        ? new Date(parentMsg.timestamp).getTime() + 1  // Place just after parent
        : new Date(boundary.timestamp).getTime()       // Fallback to boundary timestamp
      
      compactionMarkers.push({
        marker: {
          type: 'summary',
          summary: 'Context Compacted',
          leafUuid: boundary.logicalParentUuid,
        },
        timestamp,
      })
    }

    // Sort markers by timestamp
    compactionMarkers.sort((a, b) => a.timestamp - b.timestamp)

    // Insert compaction markers at correct positions
    const result: LiveMessage[] = []
    let markerIndex = 0

    for (const msg of messages) {
      const msgTime = new Date(msg.timestamp || 0).getTime()

      // Insert any markers that should come before this message
      while (
        markerIndex < compactionMarkers.length &&
        compactionMarkers[markerIndex].timestamp <= msgTime
      ) {
        result.push(compactionMarkers[markerIndex].marker)
        markerIndex++
      }

      result.push(msg)
    }

    // Add any remaining markers at the end
    while (markerIndex < compactionMarkers.length) {
      result.push(compactionMarkers[markerIndex].marker)
      markerIndex++
    }

    state.messages = result
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    state.connected = false
  }

  // Auto-reconnect on mount
  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    ...toRefs(state),
    connect,
    disconnect,
  }
}
