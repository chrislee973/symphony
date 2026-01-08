import type { HistoryEntry, SessionMetadata } from '../../types/claude'
import { getHistoryPath, encodeProjectPath, getSessionFilePath } from './claude-path'
import { streamJsonl, fileExists } from './jsonl-parser'

// Cache for session index
let sessionIndexCache: Map<string, SessionMetadata> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 30000 // 30 seconds

// Build session index from history.jsonl
export async function buildSessionIndex(): Promise<Map<string, SessionMetadata>> {
  const sessions = new Map<string, SessionMetadata>()
  const historyPath = getHistoryPath()

  for await (const entry of streamJsonl<HistoryEntry>(historyPath)) {
    if (!entry.sessionId || !entry.project) continue

    const existing = sessions.get(entry.sessionId)
    if (!existing) {
      sessions.set(entry.sessionId, {
        id: entry.sessionId,
        projectPath: entry.project,
        projectEncoded: encodeProjectPath(entry.project),
        firstMessageTimestamp: entry.timestamp,
        lastMessageTimestamp: entry.timestamp,
        messageCount: 1,
        firstUserMessage: entry.display?.slice(0, 150),
      })
    } else {
      existing.lastMessageTimestamp = Math.max(existing.lastMessageTimestamp, entry.timestamp)
      existing.firstMessageTimestamp = Math.min(existing.firstMessageTimestamp, entry.timestamp)
      existing.messageCount++
    }
  }

  return sessions
}

// Get cached session index
export async function getSessionIndex(): Promise<Map<string, SessionMetadata>> {
  const now = Date.now()

  if (sessionIndexCache && now - cacheTimestamp < CACHE_TTL) {
    return sessionIndexCache
  }

  sessionIndexCache = await buildSessionIndex()
  cacheTimestamp = now
  return sessionIndexCache
}

// Clear the cache (useful when data changes)
export function clearSessionIndexCache(): void {
  sessionIndexCache = null
  cacheTimestamp = 0
}

// Project metadata for sidebar
export interface ProjectMetadata {
  path: string
  displayName: string
  sessionCount: number
  lastActivityTimestamp: number
}

// Get list of all projects with session counts
export async function getProjectList(): Promise<{
  projects: ProjectMetadata[]
  total: number
}> {
  const index = await getSessionIndex()

  // Group sessions by project path
  const projectMap = new Map<string, { count: number; lastActivity: number }>()

  for (const session of index.values()) {
    const filePath = getSessionFilePath(session.projectEncoded, session.id)
    if (!(await fileExists(filePath))) continue

    const existing = projectMap.get(session.projectPath)
    if (existing) {
      existing.count++
      existing.lastActivity = Math.max(existing.lastActivity, session.lastMessageTimestamp)
    } else {
      projectMap.set(session.projectPath, {
        count: 1,
        lastActivity: session.lastMessageTimestamp,
      })
    }
  }

  // Convert to array and extract display names
  const projects: ProjectMetadata[] = []
  for (const [path, data] of projectMap) {
    const segments = path.split('/')
    const displayName = segments[segments.length - 1] || path

    projects.push({
      path,
      displayName,
      sessionCount: data.count,
      lastActivityTimestamp: data.lastActivity,
    })
  }

  // Sort by last activity (most recent first)
  projects.sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp)

  return {
    projects,
    total: projects.length,
  }
}

// Get session list sorted by last message timestamp
export async function getSessionList(options: {
  limit?: number
  cursor?: string // timestamp cursor for pagination
  projectFilter?: string
}): Promise<{
  sessions: SessionMetadata[]
  total: number
  hasMore: boolean
  cursor?: string
}> {
  const { limit = 20, cursor, projectFilter } = options
  const index = await getSessionIndex()

  // Convert to array and filter
  let sessions = Array.from(index.values())

  // Filter by project if specified
  if (projectFilter) {
    sessions = sessions.filter((s) => s.projectPath.includes(projectFilter))
  }

  // Filter out sessions whose files don't exist
  const validSessions: SessionMetadata[] = []
  for (const session of sessions) {
    const filePath = getSessionFilePath(session.projectEncoded, session.id)
    if (await fileExists(filePath)) {
      validSessions.push(session)
    }
  }

  // Sort by last message timestamp descending
  validSessions.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)

  // Apply cursor pagination
  let startIndex = 0
  if (cursor) {
    const cursorTimestamp = parseInt(cursor, 10)
    startIndex = validSessions.findIndex((s) => s.lastMessageTimestamp < cursorTimestamp)
    if (startIndex === -1) startIndex = validSessions.length
  }

  const paginatedSessions = validSessions.slice(startIndex, startIndex + limit)
  const hasMore = startIndex + limit < validSessions.length
  const nextCursor = hasMore ? String(paginatedSessions[paginatedSessions.length - 1]?.lastMessageTimestamp) : undefined

  return {
    sessions: paginatedSessions,
    total: validSessions.length,
    hasMore,
    cursor: nextCursor,
  }
}
