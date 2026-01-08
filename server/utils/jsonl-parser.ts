import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { access } from 'fs/promises'

// Check if a file exists
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

// Stream parse a JSONL file, yielding each parsed line
export async function* streamJsonl<T>(filePath: string): AsyncGenerator<T> {
  if (!(await fileExists(filePath))) {
    return
  }

  const fileStream = createReadStream(filePath)
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue // Skip empty lines

    try {
      yield JSON.parse(trimmed) as T
    } catch (e) {
      // Skip malformed lines
      console.warn('Failed to parse JSONL line:', e)
    }
  }
}

// Parse entire JSONL file into array (for smaller files)
export async function parseJsonlFile<T>(filePath: string): Promise<T[]> {
  const results: T[] = []
  for await (const item of streamJsonl<T>(filePath)) {
    results.push(item)
  }
  return results
}
