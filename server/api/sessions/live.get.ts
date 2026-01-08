import { createReadStream, statSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { createInterface } from 'readline'
import { getProjectsDir } from '../../utils/claude-path'

interface LiveSessionInfo {
  sessionId: string
  projectPath: string
  filePath: string
}

// Find the most recently modified session file
async function findActiveSession(): Promise<LiveSessionInfo | null> {
  const projectsDir = getProjectsDir()

  let mostRecent: LiveSessionInfo | null = null
  let mostRecentTime = 0

  try {
    const projectDirs = await readdir(projectsDir)

    for (const projectDir of projectDirs) {
      const projectPath = join(projectsDir, projectDir)
      const projectStat = await stat(projectPath)

      if (!projectStat.isDirectory()) continue

      const files = await readdir(projectPath)

      for (const file of files) {
        // Skip agent sessions and non-jsonl files
        if (!file.endsWith('.jsonl') || file.startsWith('agent-')) continue

        const filePath = join(projectPath, file)
        const fileStat = await stat(filePath)

        if (fileStat.mtimeMs > mostRecentTime) {
          mostRecentTime = fileStat.mtimeMs
          mostRecent = {
            sessionId: file.replace('.jsonl', ''),
            projectPath: projectDir,
            filePath,
          }
        }
      }
    }
  } catch (e) {
    console.error('Error finding active session:', e)
  }

  return mostRecent
}

// Parse a JSONL line into a message
function parseLine(line: string): any | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

// Read all messages from a session file
async function readSessionMessages(filePath: string): Promise<any[]> {
  const messages: any[] = []

  await new Promise<void>((resolve) => {
    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    })

    rl.on('line', (line) => {
      const parsed = parseLine(line)
      if (parsed) {
        messages.push(parsed)
      }
    })

    rl.on('close', resolve)
    rl.on('error', resolve)
  })

  return messages
}

export default defineEventHandler(async (event) => {
  // Set headers for SSE
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  let activeSession = await findActiveSession()

  if (!activeSession) {
    return `event: error\ndata: ${JSON.stringify({ error: 'No active session found' })}\n\n`
  }

  // Track current session state
  let currentSessionId = activeSession.sessionId
  let currentFilePath = activeSession.filePath
  let lastPosition = 0
  let sentMessageIds = new Set<string>()

  // Read existing content first
  const existingMessages = await readSessionMessages(currentFilePath)
  lastPosition = statSync(currentFilePath).size

  // Deduplicate messages by taking the last occurrence of each ID
  const messageMap = new Map<string, any>()
  for (const msg of existingMessages) {
    const id = msg.uuid || msg.message?.id || `random-${Math.random()}`
    messageMap.set(id, msg)
    sentMessageIds.add(id)
  }

  const initEvent = `event: init\ndata: ${JSON.stringify({
    sessionId: activeSession.sessionId,
    projectPath: activeSession.projectPath,
  })}\n\n`

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(initEvent))

      // Send history messages in batches to avoid overwhelming the client
      const allMessages = Array.from(messageMap.values())
      const BATCH_SIZE = 20

      for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
        const batch = allMessages.slice(i, i + BATCH_SIZE)
        const batchEvent = `event: history_batch\ndata: ${JSON.stringify({
          messages: batch,
          isLast: i + BATCH_SIZE >= allMessages.length,
          total: allMessages.length,
          loaded: Math.min(i + BATCH_SIZE, allMessages.length),
        })}\n\n`
        controller.enqueue(encoder.encode(batchEvent))
      }

      // Poll for new content AND check for session switches
      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval)
          return
        }

        try {
          // Check if active session has changed (context compaction creates new file)
          const newActiveSession = await findActiveSession()

          if (newActiveSession && newActiveSession.sessionId !== currentSessionId) {
            // Session switched! This happens after context compaction
            console.log(`Session switched from ${currentSessionId} to ${newActiveSession.sessionId}`)

            // Send session switch event
            const switchEvent = `event: session_switch\ndata: ${JSON.stringify({
              oldSessionId: currentSessionId,
              newSessionId: newActiveSession.sessionId,
              projectPath: newActiveSession.projectPath,
            })}\n\n`
            controller.enqueue(encoder.encode(switchEvent))

            // Update tracking
            currentSessionId = newActiveSession.sessionId
            currentFilePath = newActiveSession.filePath
            lastPosition = 0

            // Read all messages from new session and send new ones
            const newMessages = await readSessionMessages(currentFilePath)
            lastPosition = statSync(currentFilePath).size

            for (const msg of newMessages) {
              const id = msg.uuid || msg.message?.id || `random-${Math.random()}`
              if (!sentMessageIds.has(id)) {
                sentMessageIds.add(id)
                const msgEvent = `event: message\ndata: ${JSON.stringify(msg)}\n\n`
                controller.enqueue(encoder.encode(msgEvent))
              }
            }
          } else {
            // Same session - check for new content in current file
            const currentStat = statSync(currentFilePath)

            if (currentStat.size > lastPosition) {
              // Read new content
              const newContent = await new Promise<string>((resolve) => {
                const chunks: Buffer[] = []
                const fileStream = createReadStream(currentFilePath, {
                  start: lastPosition,
                  end: currentStat.size - 1,
                })

                fileStream.on('data', (chunk) => chunks.push(chunk as Buffer))
                fileStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
                fileStream.on('error', () => resolve(''))
              })

              lastPosition = currentStat.size

              // Parse and send new messages
              const lines = newContent.split('\n')
              for (const line of lines) {
                const parsed = parseLine(line)
                if (parsed) {
                  const id = parsed.uuid || parsed.message?.id || `random-${Math.random()}`
                  if (!sentMessageIds.has(id)) {
                    sentMessageIds.add(id)
                    const msgEvent = `event: message\ndata: ${JSON.stringify(parsed)}\n\n`
                    controller.enqueue(encoder.encode(msgEvent))
                  }
                }
              }
            }
          }

          // Send heartbeat
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))

        } catch (e) {
          console.error('Error polling file:', e)
        }
      }, 500)

      event.node.req.on('close', () => {
        closed = true
        clearInterval(pollInterval)
        controller.close()
      })
    },
  })

  return sendStream(event, stream)
})
