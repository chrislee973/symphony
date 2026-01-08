<script setup lang="ts">
const props = defineProps<{
  thinking: string
}>()

const isExpanded = ref(false)

const previewText = computed(() => {
  const maxLength = 100
  if (props.thinking.length <= maxLength) return props.thinking
  return props.thinking.slice(0, maxLength) + '...'
})
</script>

<template>
  <div class="rounded-lg bg-pink-900/30 border border-pink-800/50 overflow-hidden">
    <button
      class="w-full px-3 py-2 flex items-center gap-2 text-left text-pink-300 hover:bg-white/5 transition-colors"
      @click="isExpanded = !isExpanded"
    >
      <span>🧠</span>
      <span class="text-sm font-medium">Thinking...</span>
      <span class="text-xs text-pink-400/60 ml-1">({{ thinking.length.toLocaleString() }} chars)</span>
      <svg
        :class="['w-4 h-4 ml-auto transition-transform', isExpanded && 'rotate-180']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="isExpanded" class="px-3 py-2 border-t border-pink-800/50">
      <pre class="text-sm text-pink-200/80 whitespace-pre-wrap font-mono max-h-96 overflow-auto">{{ thinking }}</pre>
    </div>
    <div v-else class="px-3 py-2 text-xs text-pink-300/50 truncate border-t border-pink-800/50">
      {{ previewText }}
    </div>
  </div>
</template>
