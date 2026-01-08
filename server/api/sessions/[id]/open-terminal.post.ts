import { exec } from 'child_process'
import { promisify } from 'util'
import { getSessionIndex } from '../../../utils/session-indexer'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
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

  const projectPath = metadata.projectPath
  // Use single quotes for the path in bash command to avoid escaping issues
  const command = `cd '${projectPath}' && claude --resume ${sessionId}`

  // AppleScript to open iTerm2 with the command
  // We use quoted form to properly escape the command for AppleScript
  const appleScript = `
tell application "iTerm"
  activate
  if (count of windows) = 0 then
    create window with default profile
  end if
  tell current window
    create tab with default profile
    tell current session
      write text ${JSON.stringify(command)}
    end tell
  end tell
end tell
`

  try {
    // Write AppleScript to a temp approach using -e with proper escaping
    // Using heredoc style to avoid shell escaping issues
    const result = await execAsync(`osascript <<'EOF'
${appleScript}
EOF`)
    return { success: true, command }
  } catch (error) {
    console.error('Failed to open iTerm:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to open terminal',
    })
  }
})

