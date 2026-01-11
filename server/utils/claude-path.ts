import { homedir } from 'os'
import { join } from 'path'

// Get the Claude data directory
export function getClaudeDir(): string {
  return join(homedir(), '.claude')
}

// Get the projects directory
export function getProjectsDir(): string {
  return join(getClaudeDir(), 'projects')
}

// Get the history.jsonl path
export function getHistoryPath(): string {
  return join(getClaudeDir(), 'history.jsonl')
}

// Encode a project path to the directory name format
// /Users/foo/bar -> -Users-foo-bar
// Claude CLI also converts underscores to dashes when creating project directories,
// so we must do the same here to correctly locate session files on disk.
// e.g. /path/to/_backup -> -path-to--backup (not -path-to-_backup)
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, '-').replace(/_/g, '-')
}

// Decode a directory name back to project path
// -Users-foo-bar -> /Users/foo/bar
export function decodeProjectPath(encoded: string): string {
  // First char is always '-' representing root '/'
  return encoded.replace(/-/g, '/')
}

// Get the session file path
export function getSessionFilePath(projectEncoded: string, sessionId: string): string {
  return join(getProjectsDir(), projectEncoded, `${sessionId}.jsonl`)
}

// Shorten a project path for display
// /Users/christopherlee/Documents/Github/vue/symphony -> ~/Documents/Github/vue/symphony
export function shortenProjectPath(projectPath: string): string {
  const home = homedir()
  if (projectPath.startsWith(home)) {
    return '~' + projectPath.slice(home.length)
  }
  return projectPath
}

// Format a relative timestamp
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`

  // Format as date
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
