import type { SearchResult, SearchResponse } from '~/types/claude'

export function useSearch() {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const hasSearched = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function search(searchQuery: string) {
    const trimmed = searchQuery.trim()

    if (trimmed.length < 2) {
      results.value = []
      total.value = 0
      hasSearched.value = false
      return
    }

    loading.value = true
    error.value = null
    hasSearched.value = true

    try {
      const response = await $fetch<SearchResponse>(`/api/search?q=${encodeURIComponent(trimmed)}`)
      results.value = response.results
      total.value = response.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
      results.value = []
    } finally {
      loading.value = false
    }
  }

  function debouncedSearch(searchQuery: string) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    query.value = searchQuery

    if (searchQuery.trim().length < 2) {
      results.value = []
      total.value = 0
      hasSearched.value = false
      return
    }

    debounceTimer = setTimeout(() => {
      search(searchQuery)
    }, 300)
  }

  function clearSearch() {
    query.value = ''
    results.value = []
    total.value = 0
    hasSearched.value = false
    error.value = null
  }

  return {
    query,
    results,
    loading,
    error,
    total,
    hasSearched,
    search,
    debouncedSearch,
    clearSearch,
  }
}
