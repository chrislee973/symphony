const STORAGE_KEY = 'symphony:sessionListCollapsed'

export function useSessionListPanel() {
  const isCollapsed = ref(false)

  // Load persisted state on client
  onMounted(() => {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        isCollapsed.value = stored === 'true'
      }
    }
  })

  function toggle() {
    isCollapsed.value = !isCollapsed.value
    persistState()
  }

  function collapse() {
    isCollapsed.value = true
    persistState()
  }

  function expand() {
    isCollapsed.value = false
    persistState()
  }

  function persistState() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed.value))
    }
  }

  return {
    isCollapsed: readonly(isCollapsed),
    toggle,
    collapse,
    expand,
  }
}
