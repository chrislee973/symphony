<script setup lang="ts">
import type { ToolUseContent } from '~/types/claude'

const props = defineProps<{
  toolUse: ToolUseContent
  result?: string
}>()

const expanded = ref(false)

// Get a friendly description for the tool
const toolDescription = computed(() => {
  const { name, input } = props.toolUse

  switch (name) {
    case 'Bash':
      return input.description || (input.command as string)?.slice(0, 60) || 'Execute command'
    case 'Read':
      return (input.file_path as string)?.split('/').pop() || 'Read file'
    case 'Write':
      return (input.file_path as string)?.split('/').pop() || 'Write file'
    case 'Edit':
      return (input.file_path as string)?.split('/').pop() || 'Edit file'
    case 'Glob':
      return input.pattern as string || 'Find files'
    case 'Grep':
      return input.pattern as string || 'Search'
    case 'Task':
      return input.description as string || 'Run agent'
    default:
      return name
  }
})

// Get appropriate color for tool type
const toolColor = computed(() => {
  const { name } = props.toolUse

  switch (name) {
    case 'Bash':
      return 'bg-gray-100 border-gray-300 text-gray-700'
    case 'Read':
      return 'bg-blue-50 border-blue-200 text-blue-700'
    case 'Write':
    case 'Edit':
      return 'bg-green-50 border-green-200 text-green-700'
    case 'Task':
      return 'bg-orange-50 border-orange-200 text-orange-700'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700'
  }
})

// Format the input for display
const formattedInput = computed(() => {
  try {
    return JSON.stringify(props.toolUse.input, null, 2)
  } catch {
    return String(props.toolUse.input)
  }
})
</script>

<template>
  <div :class="['border rounded', toolColor]">
    <button
      class="w-full px-3 py-2 flex items-center gap-2 text-sm hover:opacity-80 transition-opacity text-left"
      @click="expanded = !expanded"
    >
      <span class="text-xs">{{ expanded ? '▼' : '▶' }}</span>
      <span class="font-medium">{{ toolUse.name }}</span>
      <span class="opacity-70 truncate flex-1">{{ toolDescription }}</span>
    </button>
    <div v-if="expanded" class="px-3 pb-3 border-t border-inherit">
      <!-- Input -->
      <div class="mt-2">
        <div class="text-xs font-medium opacity-70 mb-1">Input:</div>
        <pre class="text-xs whitespace-pre-wrap bg-white/50 p-2 rounded max-h-48 overflow-auto">{{ formattedInput }}</pre>
      </div>
      <!-- Result -->
      <div v-if="result" class="mt-2">
        <div class="text-xs font-medium opacity-70 mb-1">Output:</div>
        <pre class="text-xs whitespace-pre-wrap bg-white/50 p-2 rounded max-h-48 overflow-auto">{{ result }}</pre>
      </div>
    </div>
  </div>
</template>
