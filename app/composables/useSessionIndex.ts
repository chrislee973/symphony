import type { SessionMetadata, SessionListResponse } from '~/types/claude'

export function useSessionIndex() {
  const sessions = ref<SessionMetadata[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(true)
  const cursor = ref<string | undefined>(undefined)
  const total = ref(0)

  async function fetchSessions(reset = false) {
    if (loading.value) return
    if (!reset && !hasMore.value) return

    loading.value = true
    error.value = null

    if (reset) {
      sessions.value = []
      cursor.value = undefined
      hasMore.value = true
    }

    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      if (cursor.value) {
        params.set('cursor', cursor.value)
      }

      const response = await $fetch<SessionListResponse>(`/api/sessions?${params.toString()}`)

      sessions.value = reset ? response.sessions : [...sessions.value, ...response.sessions]
      hasMore.value = response.hasMore
      cursor.value = response.cursor
      total.value = response.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch sessions'
    } finally {
      loading.value = false
    }
  }

  function loadMore() {
    if (hasMore.value && !loading.value) {
      fetchSessions(false)
    }
  }

  return {
    sessions,
    loading,
    error,
    hasMore,
    total,
    fetchSessions,
    loadMore,
  }
}
