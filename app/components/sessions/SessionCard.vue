<script setup lang="ts">
import type { SessionMetadata } from '~/types/claude'

const props = defineProps<{
  session: SessionMetadata
}>()

// Shorten project path for display
function shortenPath(path: string): string {
  const home = '/Users/'
  if (path.startsWith(home)) {
    const afterHome = path.slice(home.length)
    const firstSlash = afterHome.indexOf('/')
    if (firstSlash > 0) {
      return '~' + afterHome.slice(firstSlash)
    }
  }
  return path
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const displayPath = computed(() => shortenPath(props.session.projectPath))
const relativeTime = computed(() => formatRelativeTime(props.session.lastMessageTimestamp))
const preview = computed(() => {
  const text = props.session.firstUserMessage || props.session.summary || 'No preview available'
  return text.length > 120 ? text.slice(0, 120) + '...' : text
})
</script>

<template>
  <NuxtLink
    :to="`/sessions/${session.id}`"
    class="block p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-medium text-gray-600 truncate">{{ displayPath }}</span>
        </div>
        <p class="text-gray-800 line-clamp-2">{{ preview }}</p>
      </div>
      <div class="flex flex-col items-end gap-1 text-sm text-gray-500 shrink-0">
        <span>{{ relativeTime }}</span>
        <span>{{ session.messageCount }} msgs</span>
      </div>
    </div>
  </NuxtLink>
</template>
