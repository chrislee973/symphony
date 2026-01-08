<script setup lang="ts">
import type { ToolUseContent } from '~/types/claude'

const props = defineProps<{
  toolUse: ToolUseContent
  result?: string
}>()

const isExpanded = ref(false)

// Determine tool category for coloring
const toolCategory = computed(() => {
  const name = props.toolUse.name.toLowerCase()
  if (name.includes('read') || name.includes('glob') || name.includes('grep')) return 'read'
  if (name.includes('write') || name.includes('edit')) return 'write'
  if (name.includes('bash') || name.includes('shell')) return 'execute'
  if (name.includes('task') || name.includes('agent')) return 'agent'
  return 'other'
})

const categoryColors = {
  read: 'bg-emerald-900/50 border-emerald-700 text-emerald-300',
  write: 'bg-amber-900/50 border-amber-700 text-amber-300',
  execute: 'bg-purple-900/50 border-purple-700 text-purple-300',
  agent: 'bg-cyan-900/50 border-cyan-700 text-cyan-300',
  other: 'bg-gray-700/50 border-gray-600 text-gray-300',
}

const categoryIcons = {
  read: '📖',
  write: '✏️',
  execute: '⚡',
  agent: '🤖',
  other: '🔧',
}

// Format the input for display
const formattedInput = computed(() => {
  try {
    return JSON.stringify(props.toolUse.input, null, 2)
  } catch {
    return String(props.toolUse.input)
  }
})

// Truncate result for preview
const resultPreview = computed(() => {
  if (!props.result) return null
  const maxLength = 200
  if (props.result.length <= maxLength) return props.result
  return props.result.slice(0, maxLength) + '...'
})

// Check if this is still pending (no result yet)
const isPending = computed(() => !props.result)
</script>

<template>
  <div :class="['rounded-lg border overflow-hidden', categoryColors[toolCategory]]">
    <!-- Header -->
    <button
      class="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-white/5 transition-colors"
      @click="isExpanded = !isExpanded"
    >
      <span class="text-base">{{ categoryIcons[toolCategory] }}</span>
      <span class="font-medium text-sm">{{ toolUse.name }}</span>

      <!-- Pending indicator -->
      <span v-if="isPending" class="ml-auto flex items-center gap-1.5 text-xs opacity-75">
        <span class="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
        Running...
      </span>

      <svg
        v-else
        :class="['w-4 h-4 ml-auto transition-transform', isExpanded && 'rotate-180']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Expanded content -->
    <div v-if="isExpanded" class="border-t border-current/20">
      <!-- Input -->
      <div class="p-3 border-b border-current/20">
        <div class="text-xs uppercase tracking-wider opacity-60 mb-1">Input</div>
        <pre class="text-xs font-mono whitespace-pre-wrap break-all bg-black/30 rounded p-2 max-h-64 overflow-auto">{{ formattedInput }}</pre>
      </div>

      <!-- Result -->
      <div v-if="result" class="p-3">
        <div class="text-xs uppercase tracking-wider opacity-60 mb-1">Result</div>
        <pre class="text-xs font-mono whitespace-pre-wrap break-all bg-black/30 rounded p-2 max-h-64 overflow-auto">{{ result }}</pre>
      </div>
      <div v-else class="p-3 text-sm opacity-60 italic">
        Waiting for result...
      </div>
    </div>

    <!-- Collapsed preview -->
    <div v-else-if="resultPreview" class="px-3 py-2 text-xs font-mono opacity-60 truncate border-t border-current/20">
      {{ resultPreview }}
    </div>
  </div>
</template>
