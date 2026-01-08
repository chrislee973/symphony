<script setup lang="ts">
import type { ProjectMetadata } from '~/types/claude'

const props = defineProps<{
  projects: ProjectMetadata[]
  recentProjects: ProjectMetadata[]
  olderProjects: ProjectMetadata[]
  selectedProject: string | null
  filterText: string
  totalSessionCount: number
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'select', path: string | null): void
  (e: 'filter', text: string): void
}>()

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

function handleFilterInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('filter', value)
}

function isSelected(path: string | null): boolean {
  return props.selectedProject === path
}
</script>

<template>
  <aside class="w-72 bg-gray-50 border-r border-gray-200 flex flex-col min-h-screen">
    <!-- Header -->
    <div class="p-4">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Projects</h2>
    </div>

    <!-- Filter Input -->
    <div class="px-3 py-2">
      <div class="relative">
        <input
          type="text"
          :value="filterText"
          placeholder="Filter projects..."
          class="w-full px-3 py-2 pl-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          @input="handleFilterInput"
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
      </div>
    </div>

    <!-- Project List -->
    <div class="flex-1 overflow-y-auto">
      <!-- All Sessions -->
      <button
        class="w-full px-3 py-2 flex items-center justify-between text-left transition-colors"
        :class="[
          isSelected(null)
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        ]"
        @click="emit('select', null)"
      >
        <span class="text-sm">All Sessions</span>
        <span class="text-xs text-gray-500">{{ totalSessionCount }}</span>
      </button>

      <!-- Loading State -->
      <div v-if="loading" class="px-3 py-4 text-sm text-gray-500">
        Loading projects...
      </div>

      <!-- Empty State -->
      <div
        v-else-if="projects.length === 0"
        class="px-3 py-4 text-sm text-gray-500"
      >
        No projects found
      </div>

      <!-- No Filter Results -->
      <div
        v-else-if="filterText && recentProjects.length === 0 && olderProjects.length === 0"
        class="px-3 py-4 text-sm text-gray-500"
      >
        No projects match "{{ filterText }}"
      </div>

      <template v-else>
        <!-- Recent Projects -->
        <div v-if="recentProjects.length > 0" class="mt-2">
          <div class="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Recent
          </div>
          <button
            v-for="project in recentProjects"
            :key="project.path"
            class="w-full px-3 py-2 text-left transition-colors"
            :class="[
              isSelected(project.path)
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
            @click="emit('select', project.path)"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-sm truncate"
                :class="{ 'font-medium': isSelected(project.path) }"
              >
                {{ project.displayName }}
              </span>
              <span class="text-xs text-gray-400 shrink-0 ml-2">
                {{ project.sessionCount }}
              </span>
            </div>
            <div class="text-xs text-gray-400 truncate mt-0.5">
              {{ shortenPath(project.path) }}
            </div>
          </button>
        </div>

        <!-- Older Projects -->
        <div v-if="olderProjects.length > 0" class="mt-2">
          <div class="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Older
          </div>
          <button
            v-for="project in olderProjects"
            :key="project.path"
            class="w-full px-3 py-2 text-left transition-colors"
            :class="[
              isSelected(project.path)
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
            @click="emit('select', project.path)"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-sm truncate"
                :class="{ 'font-medium': isSelected(project.path) }"
              >
                {{ project.displayName }}
              </span>
              <span class="text-xs text-gray-400 shrink-0 ml-2">
                {{ project.sessionCount }}
              </span>
            </div>
            <div class="text-xs text-gray-400 truncate mt-0.5">
              {{ shortenPath(project.path) }}
            </div>
          </button>
        </div>
      </template>
    </div>
  </aside>
</template>
