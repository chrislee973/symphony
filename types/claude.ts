// TypeScript interfaces for Claude Code conversation data

// === Content Block Types ===

export interface TextContent {
  type: 'text'
  text: string
}

export interface ThinkingContent {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultItem {
  type: 'tool_result'
  tool_use_id: string
  content: string | Array<{ type: 'text'; text: string }>
  is_error?: boolean
}

export type AssistantContentBlock = TextContent | ThinkingContent | ToolUseContent

// === Message Types ===

export interface BaseMessage {
  uuid: string
  parentUuid: string | null
  timestamp: string
  sessionId: string
  cwd?: string
  version?: string
  gitBranch?: string
  isSidechain?: boolean
}

export interface UserMessage extends BaseMessage {
  type: 'user'
  userType?: 'external'
  message: {
    role: 'user'
    content: string | ToolResultItem[]
  }
  toolUseResult?: {
    stdout?: string
    stderr?: string
    interrupted?: boolean
    isImage?: boolean
    success?: boolean
    commandName?: string
  }
}

export interface AssistantMessage extends BaseMessage {
  type: 'assistant'
  requestId?: string
  message: {
    model: string
    id: string
    role: 'assistant'
    content: AssistantContentBlock[]
    stop_reason: string | null
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
}

export interface SummaryMessage {
  type: 'summary'
  summary: string
  leafUuid: string
}

export interface CompactBoundaryMessage {
  type: 'system'
  subtype: 'compact_boundary'
  uuid: string
  timestamp: string
  logicalParentUuid: string
  content: string
}

export interface FileHistorySnapshot {
  type: 'file-history-snapshot'
  messageId: string
  snapshot: {
    messageId: string
    trackedFileBackups: Record<string, unknown>
    timestamp: string
  }
  isSnapshotUpdate: boolean
}

export type ClaudeMessage = UserMessage | AssistantMessage | SummaryMessage | FileHistorySnapshot

// === History Index Entry ===

export interface HistoryEntry {
  display: string
  timestamp: number
  project: string
  sessionId: string
  pastedContents?: Record<string, unknown>
}

// === Session Metadata ===

export interface SessionMetadata {
  id: string
  projectPath: string
  projectEncoded: string
  firstMessageTimestamp: number
  lastMessageTimestamp: number
  messageCount: number
  summary?: string
  firstUserMessage?: string
  model?: string
}

// === API Response Types ===

export interface SessionListResponse {
  sessions: SessionMetadata[]
  total: number
  hasMore: boolean
  cursor?: string
}

export interface SessionDetailResponse {
  metadata: SessionMetadata
  messages: ClaudeMessage[]
}

export interface SearchResult {
  session: SessionMetadata
  matches: Array<{
    messageUuid?: string
    snippet: string
    timestamp: string
  }>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}
