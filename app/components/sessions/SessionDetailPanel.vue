<script setup lang="ts">
import type { ClaudeMessage, SessionMetadata } from '~/types/claude'

defineProps<{
  sessionId: string | null
  messages: ClaudeMessage[]
  metadata: SessionMetadata | null
  loading: boolean
  error: string | null
  totalSessions?: number
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="flex-1 min-w-0 bg-white border-l border-gray-200 flex flex-col h-screen">
    <!-- Header with close button when session selected -->
    <div v-if="sessionId" class="shrink-0 border-b border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50">
      <span class="text-sm text-gray-500">Session Detail</span>
      <button
        @click="emit('close')"
        class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
        title="Close session"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-gray-500">
      <div class="text-center">
        <svg class="animate-spin h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading session...</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-6">
      <div class="text-center">
        <div class="p-4 bg-red-50 text-red-700 rounded-lg">
          {{ error }}
        </div>
        <button
          @click="emit('close')"
          class="mt-4 text-sm text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Session content -->
    <SessionDetailContent
      v-else-if="sessionId && metadata"
      :session-id="sessionId"
      :messages="messages"
      :metadata="metadata"
      class="flex-1 min-h-0"
    />

    <!-- Empty state - no session selected -->
    <div v-else class="flex-1 flex items-center justify-center text-gray-500">
      <div class="text-center max-w-md px-6">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-700 mb-2">Select a session</h3>
        <p class="text-sm text-gray-500">
          Choose a conversation from the list to view its contents here.
        </p>
        <p v-if="totalSessions" class="text-xs text-gray-400 mt-4">
          {{ totalSessions }} sessions available
        </p>
      </div>
    </div>
  </div>
</template>
