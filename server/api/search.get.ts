import type { HistoryEntry, SessionMetadata, SearchResult } from '../../types/claude'
import { getHistoryPath, encodeProjectPath, getSessionFilePath } from '../utils/claude-path'
import { streamJsonl, fileExists } from '../utils/jsonl-parser'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchTerm = (query.q as string)?.toLowerCase().trim()
  const limit = Math.min(Number(query.limit) || 20, 50)

  if (!searchTerm || searchTerm.length < 2) {
    throw createError({
      statusCode: 400,
      message: 'Search query must be at least 2 characters',
    })
  }

  const historyPath = getHistoryPath()
  const sessionMatches = new Map<string, SearchResult>()

  // Search through history.jsonl for matching entries
  for await (const entry of streamJsonl<HistoryEntry>(historyPath)) {
    if (!entry.sessionId || !entry.project) continue

    const displayLower = entry.display?.toLowerCase() || ''

    if (displayLower.includes(searchTerm)) {
      const existing = sessionMatches.get(entry.sessionId)

      if (!existing) {
        // Check if session file exists
        const projectEncoded = encodeProjectPath(entry.project)
        const filePath = getSessionFilePath(projectEncoded, entry.sessionId)

        if (await fileExists(filePath)) {
          sessionMatches.set(entry.sessionId, {
            session: {
              id: entry.sessionId,
              projectPath: entry.project,
              projectEncoded,
              firstMessageTimestamp: entry.timestamp,
              lastMessageTimestamp: entry.timestamp,
              messageCount: 1,
              firstUserMessage: entry.display?.slice(0, 150),
            },
            matches: [{
              snippet: highlightMatch(entry.display || '', searchTerm),
              timestamp: new Date(entry.timestamp).toISOString(),
            }],
          })
        }
      } else {
        // Update existing session match
        existing.session.lastMessageTimestamp = Math.max(
          existing.session.lastMessageTimestamp,
          entry.timestamp
        )
        existing.session.firstMessageTimestamp = Math.min(
          existing.session.firstMessageTimestamp,
          entry.timestamp
        )
        existing.session.messageCount++

        // Add this match if we don't have too many
        if (existing.matches.length < 3) {
          existing.matches.push({
            snippet: highlightMatch(entry.display || '', searchTerm),
            timestamp: new Date(entry.timestamp).toISOString(),
          })
        }
      }
    }
  }

  // Convert to array and sort by last message timestamp
  const results = Array.from(sessionMatches.values())
    .sort((a, b) => b.session.lastMessageTimestamp - a.session.lastMessageTimestamp)
    .slice(0, limit)

  return {
    results,
    total: sessionMatches.size,
    query: searchTerm,
  }
})

// Highlight the matching term in the snippet
function highlightMatch(text: string, term: string): string {
  const maxLength = 150
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(term)

  if (index === -1) return text.slice(0, maxLength)

  // Get context around the match
  const start = Math.max(0, index - 40)
  const end = Math.min(text.length, index + term.length + 60)

  let snippet = text.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}
