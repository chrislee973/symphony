import type { SessionDetailResponse, ClaudeMessage, SessionMetadata } from '~/types/claude'

export function useSessionDetail(sessionId: string) {
  const messages = ref<ClaudeMessage[]>([])
  const metadata = ref<SessionMetadata | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSession() {
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<SessionDetailResponse>(`/api/sessions/${sessionId}`)
      messages.value = response.messages
      metadata.value = response.metadata
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch session'
    } finally {
      loading.value = false
    }
  }

  return {
    messages,
    metadata,
    loading,
    error,
    fetchSession,
  }
}
