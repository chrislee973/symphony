<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// Projects state
const {
  projects,
  loading: projectsLoading,
  recentProjects,
  olderProjects,
  selectedProject,
  filterText,
  totalSessionCount,
  fetchProjects,
  selectProject,
  shortenPath,
} = useProjects()

// Sessions state - pass selected project for filtering
const { sessions, loading, error, hasMore, total, fetchSessions, loadMore } = useSessionIndex(selectedProject)

// Search state
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

// Selected session state
const {
  selectedSessionId,
  messages,
  metadata: sessionMetadata,
  loading: sessionLoading,
  error: sessionError,
  selectSession,
  clearSelection,
  initFromUrl,
} = useSelectedSession()

// Session list panel state
const { isCollapsed, toggle: toggleListPanel } = useSessionListPanel()

// Initialize from URL query params
onMounted(() => {
  const projectParam = route.query.project as string | undefined
  if (projectParam) {
    selectedProject.value = projectParam
  }
  fetchProjects()
  fetchSessions(true)
  initFromUrl()
})

// Track if we should auto-select first session after fetch
const shouldAutoSelectFirst = ref(false)

// Watch for project selection changes and update URL
watch(selectedProject, (newProject, oldProject) => {
  // Clear current session when switching projects
  if (oldProject !== newProject) {
    clearSelection()
    shouldAutoSelectFirst.value = true
  }

  // Update URL (session param removed since we cleared it)
  const query: Record<string, string> = {}
  if (newProject) {
    query.project = newProject
  }
  router.replace({ query })
  // Re-fetch sessions with new filter
  fetchSessions(true)
})

// Auto-select first session when sessions load after project change
watch(sessions, (newSessions) => {
  if (shouldAutoSelectFirst.value && newSessions.length > 0 && !loading.value) {
    selectSession(newSessions[0].id)
    shouldAutoSelectFirst.value = false
  }
})

function handleProjectSelect(path: string | null) {
  selectProject(path)
}

function handleFilterChange(text: string) {
  filterText.value = text
}

function handleSessionSelect(sessionId: string) {
  selectSession(sessionId)
}

function handleClearProject() {
  handleProjectSelect(null)
}

// Computed to determine what to show
const isSearching = computed(() => searchQuery.value.length >= 2)
const showSearchResults = computed(() => isSearching.value && hasSearched.value)

// Get selected project display info
const selectedProjectInfo = computed(() => {
  if (!selectedProject.value) return null
  return projects.value.find((p) => p.path === selectedProject.value)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Left: Project Sidebar (288px) -->
    <ProjectSidebar
      :projects="projects"
      :recent-projects="recentProjects"
      :older-projects="olderProjects"
      :selected-project="selectedProject"
      :filter-text="filterText"
      :total-session-count="totalSessionCount"
      :loading="projectsLoading"
      @select="handleProjectSelect"
      @filter="handleFilterChange"
    />

    <!-- Middle: Session List Panel (~320px, collapsible) -->
    <SessionListPanel
      :sessions="sessions"
      :selected-session-id="selectedSessionId"
      :loading="loading"
      :has-more="hasMore"
      :total="total"
      :search-query="searchQuery"
      :show-search-results="showSearchResults"
      :search-results="searchResults"
      :search-loading="searchLoading"
      :search-total="searchTotal"
      :selected-project-info="selectedProjectInfo"
      :is-collapsed="isCollapsed"
      @select="handleSessionSelect"
      @load-more="loadMore"
      @search="debouncedSearch"
      @clear-search="clearSearch"
      @clear-project="handleClearProject"
      @toggle-collapse="toggleListPanel"
    />

    <!-- Right: Session Detail Panel (flex-1) -->
    <SessionDetailPanel
      :session-id="selectedSessionId"
      :messages="messages"
      :metadata="sessionMetadata"
      :loading="sessionLoading"
      :error="sessionError"
      :total-sessions="total"
      @close="clearSelection"
    />
  </div>
</template>
