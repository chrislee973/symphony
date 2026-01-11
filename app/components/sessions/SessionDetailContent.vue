<script setup lang="ts">
import type { ClaudeMessage, SessionMetadata } from '~/types/claude'

const props = defineProps<{
  sessionId: string
  messages: ClaudeMessage[]
  metadata: SessionMetadata
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

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const displayPath = computed(() => shortenPath(props.metadata.projectPath))
const displayDate = computed(() => formatDate(props.metadata.lastMessageTimestamp))

const conversationRef = ref<HTMLElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
    }
  })
}

// Reset scroll position when session changes
watch(() => props.sessionId, () => {
  nextTick(() => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = 0
    }
  })
})

// Terminal launch functionality
const openingTerminal = ref(false)
const terminalFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const resumeCommand = computed(() => {
  return `cd "${props.metadata.projectPath}" && claude --resume ${props.sessionId}`
})

async function openInTerminal() {
  if (openingTerminal.value) return
  openingTerminal.value = true
  terminalFeedback.value = null

  try {
    await $fetch(`/api/sessions/${props.sessionId}/open-terminal`, { method: 'POST' })
    terminalFeedback.value = { type: 'success', message: 'Opened in iTerm!' }
    setTimeout(() => {
      terminalFeedback.value = null
    }, 3000)
  } catch (e) {
    terminalFeedback.value = { type: 'error', message: 'Failed to open terminal' }
  } finally {
    openingTerminal.value = false
  }
}

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(resumeCommand.value)
    terminalFeedback.value = { type: 'success', message: 'Command copied!' }
    setTimeout(() => {
      terminalFeedback.value = null
    }, 3000)
  } catch (e) {
    terminalFeedback.value = { type: 'error', message: 'Failed to copy' }
  }
}
</script>

<template>
  <div ref="scrollContainerRef" class="h-full overflow-y-auto">
    <div class="px-6 py-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="space-y-3">
          <!-- Title row: path + date -->
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-medium text-gray-600">{{ displayPath }}</h2>
            <div class="text-sm text-gray-500 shrink-0">
              {{ displayDate }}
            </div>
          </div>

          <!-- Summary -->
          <p v-if="metadata.summary" class="text-gray-800">{{ metadata.summary }}</p>

          <!-- Action buttons -->
          <div class="flex items-center gap-3 flex-wrap">
            <!-- Resume in iTerm button -->
            <button
              @click="openInTerminal"
              :disabled="openingTerminal"
              class="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ openingTerminal ? 'Opening...' : 'Resume in iTerm' }}</span>
            </button>
            <!-- Copy command to resume in terminal -->
            <button
              @click="copyCommand"
              class="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 flex items-center gap-1.5 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy command</span>
            </button>
            <button
              v-if="messages.length > 0"
              @click="scrollToBottom"
              class="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 flex items-center gap-1 transition-colors"
            >
              <span>Scroll to Bottom</span>
            </button>
          </div>
        </div>

        <!-- Feedback toast -->
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="terminalFeedback"
            :class="[
              'mt-3 px-4 py-2 rounded-md text-sm font-medium inline-block',
              terminalFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            ]"
          >
            {{ terminalFeedback.message }}
          </div>
        </Transition>
      </div>

      <!-- Conversation -->
      <div v-if="messages.length > 0" ref="conversationRef" class="bg-gray-100 rounded-lg p-4">
        <ConversationView :messages="messages" />
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12 text-gray-500">
        No messages found in this session.
      </div>
    </div>
  </div>
</template>
