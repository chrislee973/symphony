import type { ClaudeMessage, SessionMetadata, SessionDetailResponse, SummaryMessage } from '../../../types/claude'
import { getSessionIndex } from '../../utils/session-indexer'
import { getSessionFilePath } from '../../utils/claude-path'
import { streamJsonl, fileExists } from '../../utils/jsonl-parser'

// Raw entry from JSONL that might be a compact_boundary system message
interface RawJsonlEntry {
  type: string
  subtype?: string
  uuid?: string
  timestamp?: string
  logicalParentUuid?: string
  summary?: string
  leafUuid?: string
  [key: string]: unknown
}

export default defineEventHandler(async (event): Promise<SessionDetailResponse> => {
  const sessionId = getRouterParam(event, 'id')

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Session ID is required',
    })
  }

  // Get session metadata from index
  const index = await getSessionIndex()
  const metadata = index.get(sessionId)

  if (!metadata) {
    throw createError({
      statusCode: 404,
      message: 'Session not found',
    })
  }

  // Get the session file path
  const filePath = getSessionFilePath(metadata.projectEncoded, sessionId)

  if (!(await fileExists(filePath))) {
    throw createError({
      statusCode: 404,
      message: 'Session file not found',
    })
  }

  // Parse the session file
  const messages: ClaudeMessage[] = []
  const compactBoundaries: Array<{ logicalParentUuid: string; timestamp: string }> = []
  let summary: string | undefined

  for await (const entry of streamJsonl<RawJsonlEntry>(filePath)) {
    // Detect compact_boundary system messages (actual compaction events)
    if (entry.type === 'system' && entry.subtype === 'compact_boundary' && entry.logicalParentUuid && entry.timestamp) {
      compactBoundaries.push({
        logicalParentUuid: entry.logicalParentUuid,
        timestamp: entry.timestamp,
      })
    }
    
    if (entry.type === 'summary') {
      summary = entry.summary
    }
    
    // Only add user/assistant messages to the messages array
    if (entry.type === 'user' || entry.type === 'assistant') {
      messages.push(entry as ClaudeMessage)
    }
  }

  // Build message tree and flatten to conversation order
  const orderedMessages = orderMessages(messages, compactBoundaries)

  // Update metadata with summary if found
  const enrichedMetadata: SessionMetadata = {
    ...metadata,
    summary,
  }

  return {
    metadata: enrichedMetadata,
    messages: orderedMessages,
  }
})

// Order messages by timestamp and deduplicate by uuid
// Insert compaction dividers based on compact_boundary system messages
function orderMessages(
  messages: ClaudeMessage[],
  compactBoundaries: Array<{ logicalParentUuid: string; timestamp: string }>
): ClaudeMessage[] {
  // Deduplicate by uuid (keep last occurrence for streaming updates)
  const messageMap = new Map<string, ClaudeMessage>()
  for (const msg of messages) {
    if ('uuid' in msg) {
      messageMap.set(msg.uuid, msg)
    }
  }

  // Sort by timestamp
  const ordered = Array.from(messageMap.values()).sort((a, b) => {
    const timeA = 'timestamp' in a ? new Date(a.timestamp).getTime() : 0
    const timeB = 'timestamp' in b ? new Date(b.timestamp).getTime() : 0
    return timeA - timeB
  })

  // Create compaction markers with their timestamps
  // Each compact_boundary's logicalParentUuid points to the last message before compaction
  const compactionMarkers: Array<{ marker: SummaryMessage; timestamp: number }> = []
  
  for (const boundary of compactBoundaries) {
    const parentMsg = messageMap.get(boundary.logicalParentUuid)
    const timestamp = parentMsg && 'timestamp' in parentMsg
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
  const result: ClaudeMessage[] = []
  let markerIndex = 0

  for (const msg of ordered) {
    const msgTime = 'timestamp' in msg ? new Date(msg.timestamp).getTime() : 0

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

  return result
}
