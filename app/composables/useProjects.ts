import type { ProjectMetadata, ProjectListResponse } from '~/types/claude'

export function useProjects() {
  const projects = ref<ProjectMetadata[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)

  // Selected project path (null = all sessions)
  const selectedProject = ref<string | null>(null)

  // Filter text for filtering projects in sidebar
  const filterText = ref('')

  // 7 days in milliseconds for "recent" threshold
  const RECENT_THRESHOLD = 7 * 24 * 60 * 60 * 1000

  async function fetchProjects() {
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<ProjectListResponse>('/api/projects')
      projects.value = response.projects
      total.value = response.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch projects'
    } finally {
      loading.value = false
    }
  }

  // Filtered projects based on filterText
  const filteredProjects = computed(() => {
    if (!filterText.value) return projects.value

    const query = filterText.value.toLowerCase()
    return projects.value.filter(
      (p) =>
        p.displayName.toLowerCase().includes(query) || p.path.toLowerCase().includes(query)
    )
  })

  // Split projects into recent and older
  const recentProjects = computed(() => {
    const now = Date.now()
    return filteredProjects.value.filter(
      (p) => now - p.lastActivityTimestamp < RECENT_THRESHOLD
    )
  })

  const olderProjects = computed(() => {
    const now = Date.now()
    return filteredProjects.value.filter(
      (p) => now - p.lastActivityTimestamp >= RECENT_THRESHOLD
    )
  })

  // Total session count across all projects
  const totalSessionCount = computed(() => {
    return projects.value.reduce((sum, p) => sum + p.sessionCount, 0)
  })

  // Shorten path for display (removes home directory prefix)
  function shortenPath(path: string): string {
    const home = '/Users/'
    if (path.startsWith(home)) {
      const afterHome = path.slice(home.length)
      const firstSlash = afterHome.indexOf('/')
      if (firstSlash > 0) {
        return '~' + afterHome.slice(firstSlash)
      }
    }
    return path
  }

  function selectProject(path: string | null) {
    selectedProject.value = path
  }

  function clearFilter() {
    filterText.value = ''
  }

  return {
    projects,
    loading,
    error,
    total,
    selectedProject,
    filterText,
    filteredProjects,
    recentProjects,
    olderProjects,
    totalSessionCount,
    fetchProjects,
    selectProject,
    clearFilter,
    shortenPath,
  }
}
