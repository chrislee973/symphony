<script setup lang="ts">
import LiveContextCompactionDivider from '~/components/LiveContextCompactionDivider.vue'

const { sessionId, projectPath, messages, connected, error, connect } = useLiveSession()

// Auto-scroll to bottom when new messages arrive
const messagesContainer = ref<HTMLElement | null>(null)
const shouldAutoScroll = ref(true)

// Track if user has scrolled up
function onScroll() {
  if (!messagesContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  // If within 100px of bottom, enable auto-scroll
  shouldAutoScroll.value = scrollHeight - scrollTop - clientHeight < 100
}

// Scroll to bottom when messages change
watch(
  () => messages.value.length,
  () => {
    if (shouldAutoScroll.value && messagesContainer.value) {
      nextTick(() => {
        messagesContainer.value?.scrollTo({
          top: messagesContainer.value.scrollHeight,
          behavior: 'smooth',
        })
      })
    }
  }
)

// Build tool results map for message display
const toolResults = computed(() => {
  const results = new Map<string, string>()

  for (const msg of messages.value) {
    if (msg.type === 'user' && Array.isArray(msg.message.content)) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_result') {
          const resultContent = Array.isArray(block.content)
            ? block.content.map((c: any) => (c.type === 'text' ? c.text : '')).join('')
            : typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content)
          results.set(block.tool_use_id, resultContent)
        }
      }
    }
  }

  return results
})

// Format project path for display
const displayPath = computed(() => {
  if (!projectPath.value) return ''
  // Decode the path: -Users-foo-bar -> /Users/foo/bar
  return '/' + projectPath.value.slice(1).replace(/-/g, '/')
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col">
    <!-- Header -->
    <div class="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4">
        <NuxtLink to="/" class="text-gray-400 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </NuxtLink>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-semibold">Live Session</h1>
            <span
              v-if="connected"
              class="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full"
            >
              <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </span>
            <span
              v-else
              class="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full"
            >
              <span class="w-2 h-2 bg-red-400 rounded-full" />
              DISCONNECTED
            </span>
          </div>
          <p v-if="displayPath" class="text-sm text-gray-400">{{ displayPath }}</p>
        </div>
      </div>

      <button
        v-if="!connected"
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm font-medium rounded-lg transition-colors"
        @click="connect"
      >
        Reconnect
      </button>
    </div>

    <!-- Error state -->
    <div v-if="error" class="p-4 bg-red-900/50 border-b border-red-800 text-red-200">
      {{ error }}
    </div>

    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
      @scroll="onScroll"
    >
      <div v-if="messages.length === 0 && connected" class="text-center text-gray-500 py-12">
        <div class="animate-pulse mb-2">Watching for messages...</div>
        <p class="text-sm">Start typing in Claude Code to see messages appear here</p>
      </div>

      <template v-for="(msg, index) in messages" :key="'uuid' in msg ? msg.uuid : `summary-${index}`">
        <template v-if="msg.type === 'summary'">
          <LiveContextCompactionDivider />
        </template>
        <template v-else>
          <LiveMessageBubble :message="msg" :tool-results="toolResults" />
        </template>
      </template>

      <!-- Scroll to bottom indicator -->
      <div
        v-if="!shouldAutoScroll && messages.length > 0"
        class="fixed bottom-4 right-4"
      >
        <button
          class="p-2 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg transition-colors"
          @click="messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
