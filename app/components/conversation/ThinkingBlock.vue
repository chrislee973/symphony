<script setup lang="ts">
defineProps<{
  thinking: string
}>()

const expanded = ref(false)
</script>

<template>
  <div class="border border-purple-200 rounded bg-purple-50">
    <button
      class="w-full px-3 py-2 flex items-center gap-2 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
      @click="expanded = !expanded"
    >
      <span class="text-xs">{{ expanded ? '▼' : '▶' }}</span>
      <span class="font-medium">Thinking...</span>
      <span class="text-purple-500 text-xs">({{ thinking.length }} chars)</span>
    </button>
    <div v-if="expanded" class="px-3 pb-3 border-t border-purple-200">
      <pre class="text-xs text-purple-800 whitespace-pre-wrap mt-2 max-h-96 overflow-auto">{{ thinking }}</pre>
    </div>
  </div>
</template>
