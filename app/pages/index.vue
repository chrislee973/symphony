<script setup lang="ts">
const { sessions, loading, error, hasMore, total, fetchSessions, loadMore } = useSessionIndex()
const {
  query: searchQuery,
  results: searchResults,
  loading: searchLoading,
  error: searchError,
  total: searchTotal,
  hasSearched,
  debouncedSearch,
  clearSearch,
} = useSearch()

// Fetch sessions on mount
onMounted(() => {
  fetchSessions(true)
})

// Computed to determine what to show
const isSearching = computed(() => searchQuery.value.length >= 2)
const showSearchResults = computed(() => isSearching.value && hasSearched.value)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-3xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between gap-4">
          <h1 class="text-2xl font-bold text-gray-900">Symphony</h1>
          <NuxtLink
            to="/live"
            class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </NuxtLink>
        </div>
        <p class="text-gray-600 mt-1">Browse your Claude Code conversations</p>
      </div>

      <!-- Search -->
      <div class="mb-6">
        <div class="relative">
          <input
            type="text"
            :value="searchQuery"
            placeholder="Search conversations..."
            class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="debouncedSearch(($event.target as HTMLInputElement).value)"
          />
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            @click="clearSearch"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Search Results -->
      <template v-if="showSearchResults">
        <div class="mb-4 text-sm text-gray-500">
          <span v-if="searchLoading">Searching...</span>
          <span v-else>{{ searchTotal }} result{{ searchTotal !== 1 ? 's' : '' }} for "{{ searchQuery }}"</span>
        </div>

        <div v-if="searchError" class="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
          {{ searchError }}
        </div>

        <div v-else-if="!searchLoading && searchResults.length === 0" class="text-center py-12 text-gray-500">
          No results found for "{{ searchQuery }}"
        </div>

        <div v-else class="space-y-3">
          <NuxtLink
            v-for="result in searchResults"
            :key="result.session.id"
            :to="`/sessions/${result.session.id}`"
            class="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-600 mb-1">
                  {{ result.session.projectPath.replace('/Users/', '~/').replace(/^~\/[^/]+/, '~') }}
                </div>
                <p class="text-gray-800">{{ result.matches[0]?.snippet }}</p>
              </div>
              <div class="text-sm text-gray-500 shrink-0">
                {{ result.session.messageCount }} msgs
              </div>
            </div>
          </NuxtLink>
        </div>
      </template>

      <!-- Regular Session List -->
      <template v-else>
        <div v-if="total > 0" class="mb-4 text-sm text-gray-500">
          {{ total }} sessions
        </div>

        <div v-if="error" class="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
          {{ error }}
        </div>

        <div v-if="loading && sessions.length === 0" class="text-center py-12 text-gray-500">
          Loading sessions...
        </div>

        <div v-else-if="!loading && sessions.length === 0" class="text-center py-12 text-gray-500">
          No sessions found. Start using Claude Code to see your conversations here.
        </div>

        <SessionList
          v-else
          :sessions="sessions"
          :loading="loading"
          :has-more="hasMore"
          @load-more="loadMore"
        />
      </template>
    </div>
  </div>
</template>
