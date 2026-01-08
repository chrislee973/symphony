<script setup lang="ts">
const route = useRoute()
const sessionId = route.params.id as string

const { messages, metadata, loading, error, fetchSession } = useSessionDetail(sessionId)

// Fetch session on mount
onMounted(() => {
  fetchSession()
})

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

const displayPath = computed(() => (metadata.value ? shortenPath(metadata.value.projectPath) : ''))
const displayDate = computed(() => (metadata.value ? formatDate(metadata.value.lastMessageTimestamp) : ''))

const conversationRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (conversationRef.value) {
      const rect = conversationRef.value.getBoundingClientRect()
      window.scrollTo({
        top: window.scrollY + rect.bottom - window.innerHeight,
        behavior: 'smooth'
      })
    }
  })
}

// Terminal launch functionality
const openingTerminal = ref(false)
const terminalFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const resumeCommand = computed(() => {
  if (!metadata.value) return ''
  return `cd "${metadata.value.projectPath}" && claude --resume ${sessionId}`
})

async function openInTerminal() {
  if (openingTerminal.value) return
  openingTerminal.value = true
  terminalFeedback.value = null

  try {
    await $fetch(`/api/sessions/${sessionId}/open-terminal`, { method: 'POST' })
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
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink to="/" class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4">
          <span>&larr;</span>
          <span>Back to sessions</span>
        </NuxtLink>

        <div v-if="metadata" class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-lg font-medium text-gray-600">{{ displayPath }}</h1>
            <p v-if="metadata.summary" class="text-gray-800 mt-1">{{ metadata.summary }}</p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <!-- Continue in Terminal button -->
            <button
              @click="openInTerminal"
              :disabled="openingTerminal"
              class="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ openingTerminal ? 'Opening...' : 'Continue' }}</span>
            </button>
            <!-- Copy command button -->
            <button
              @click="copyCommand"
              class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
              title="Copy resume command"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              v-if="messages.length > 0"
              @click="scrollToBottom"
              class="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 flex items-center gap-1 transition-colors"
            >
              <span>Bottom</span>
              <span>↓</span>
            </button>
            <div class="text-sm text-gray-500">
              {{ displayDate }}
            </div>
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

      <!-- Error state -->
      <div v-if="error" class="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
        {{ error }}
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-12 text-gray-500">Loading conversation...</div>

      <!-- Conversation -->
      <div v-else-if="messages.length > 0" ref="conversationRef" class="bg-gray-100 rounded-lg p-4">
        <ConversationView :messages="messages" />
      </div>

      <!-- Empty state -->
      <div v-else-if="!loading" class="text-center py-12 text-gray-500">No messages found in this session.</div>
    </div>
  </div>
</template>
