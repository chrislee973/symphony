import type { SessionDetailResponse, ClaudeMessage, SessionMetadata } from '~/types/claude'

export function useSelectedSession() {
  const route = useRoute()
  const router = useRouter()

  const selectedSessionId = ref<string | null>(null)
  const sessionDetail = ref<SessionDetailResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Initialize from URL query param on mount
  function initFromUrl() {
    const sessionParam = route.query.session as string | undefined
    if (sessionParam && sessionParam !== selectedSessionId.value) {
      selectSession(sessionParam)
    }
  }

  async function selectSession(sessionId: string | null) {
    // Clear selection
    if (sessionId === null) {
      selectedSessionId.value = null
      sessionDetail.value = null
      error.value = null
      updateUrl(null)
      return
    }

    // Skip if already selected
    if (sessionId === selectedSessionId.value && sessionDetail.value) {
      return
    }

    selectedSessionId.value = sessionId
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<SessionDetailResponse>(`/api/sessions/${sessionId}`)
      sessionDetail.value = response
      updateUrl(sessionId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch session'
      sessionDetail.value = null
    } finally {
      loading.value = false
    }
  }

  function updateUrl(sessionId: string | null) {
    const currentQuery = { ...route.query }

    if (sessionId) {
      currentQuery.session = sessionId
    } else {
      delete currentQuery.session
    }

    router.replace({ query: currentQuery })
  }

  function clearSelection() {
    selectSession(null)
  }

  // Computed helpers
  const messages = computed<ClaudeMessage[]>(() => sessionDetail.value?.messages ?? [])
  const metadata = computed<SessionMetadata | null>(() => sessionDetail.value?.metadata ?? null)

  return {
    selectedSessionId: readonly(selectedSessionId),
    sessionDetail: readonly(sessionDetail),
    messages,
    metadata,
    loading: readonly(loading),
    error: readonly(error),
    selectSession,
    clearSelection,
    initFromUrl,
  }
}
