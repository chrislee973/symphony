<script setup lang="ts">
import type { SessionMetadata, SearchResult, ProjectMetadata } from '~/types/claude'

const props = defineProps<{
  sessions: SessionMetadata[]
  selectedSessionId: string | null
  loading: boolean
  hasMore: boolean
  total: number
  searchQuery: string
  showSearchResults: boolean
  searchResults: SearchResult[]
  searchLoading: boolean
  searchTotal: number
  selectedProjectInfo: ProjectMetadata | null
  isCollapsed: boolean
}>()

const emit = defineEmits<{
  select: [sessionId: string]
  loadMore: []
  search: [query: string]
  clearSearch: []
  clearProject: []
  toggleCollapse: []
}>()

// Search input ref for focus
const searchInputRef = ref<HTMLInputElement | null>(null)
</script>

<template>
  <div
    :class="[
      'shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-200 ease-out',
      isCollapsed ? 'w-12' : 'w-80'
    ]"
  >
    <!-- Collapsed state -->
    <template v-if="isCollapsed">
      <div class="flex flex-col items-center py-4 h-full">
        <button
          @click="emit('toggleCollapse')"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Expand session list"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <div class="mt-2 text-xs text-gray-400 writing-mode-vertical transform rotate-180" style="writing-mode: vertical-rl;">
          {{ total }} sessions
        </div>
      </div>
    </template>

    <!-- Expanded state -->
    <template v-else>
      <!-- Header -->
      <div class="shrink-0 border-b border-gray-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="font-semibold text-gray-900">Sessions</h2>
            <p class="text-xs text-gray-500">{{ total }} total</p>
          </div>
          <button
            @click="emit('toggleCollapse')"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Collapse session list"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <!-- Search input -->
        <div class="relative">
          <input
            ref="searchInputRef"
            type="text"
            :value="searchQuery"
            placeholder="Search sessions..."
            class="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="emit('search', ($event.target as HTMLInputElement).value)"
          />
          <svg
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <button
            v-if="searchQuery"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            @click="emit('clearSearch')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Project filter badge -->
      <div
        v-if="selectedProjectInfo"
        class="shrink-0 mx-4 mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2"
      >
        <div class="min-w-0">
          <span class="text-sm font-medium text-blue-900 truncate block">{{ selectedProjectInfo.displayName }}</span>
        </div>
        <button
          class="shrink-0 ml-2 text-blue-600 hover:text-blue-800 p-0.5"
          title="Clear project filter"
          @click="emit('clearProject')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Search results -->
        <template v-if="showSearchResults">
          <div class="mb-3 text-xs text-gray-500">
            <span v-if="searchLoading">Searching...</span>
            <span v-else>{{ searchTotal }} result{{ searchTotal !== 1 ? 's' : '' }}</span>
          </div>

          <div v-if="!searchLoading && searchResults.length === 0" class="text-center py-8 text-gray-500 text-sm">
            No results found
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="result in searchResults"
              :key="result.session.id"
              @click="emit('select', result.session.id)"
              :class="[
                'w-full text-left p-3 border rounded-lg transition-colors',
                selectedSessionId === result.session.id
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              ]"
            >
              <div class="text-xs font-medium text-gray-600 mb-1 truncate">
                {{ result.session.projectPath.replace('/Users/', '~/').replace(/^~\/[^/]+/, '~') }}
              </div>
              <p class="text-sm text-gray-800 line-clamp-2">{{ result.matches[0]?.snippet }}</p>
            </button>
          </div>
        </template>

        <!-- Regular session list -->
        <template v-else>
          <div v-if="loading && sessions.length === 0" class="text-center py-8 text-gray-500 text-sm">
            Loading sessions...
          </div>

          <div v-else-if="!loading && sessions.length === 0" class="text-center py-8 text-gray-500 text-sm">
            <template v-if="selectedProjectInfo">
              No sessions for this project
            </template>
            <template v-else>
              No sessions found
            </template>
          </div>

          <div v-else class="space-y-2">
            <SessionCard
              v-for="session in sessions"
              :key="session.id"
              :session="session"
              :is-selected="session.id === selectedSessionId"
              @select="emit('select', $event)"
            />

            <!-- Load more trigger -->
            <div v-if="hasMore || loading" class="h-10 flex items-center justify-center">
              <span v-if="loading" class="text-gray-500 text-xs">Loading...</span>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
