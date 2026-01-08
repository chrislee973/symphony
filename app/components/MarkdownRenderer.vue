<script setup lang="ts">
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedHtml = computed(() => {
  if (!props.content) return ''
  return marked.parse(props.content) as string
})
</script>

<template>
  <div class="markdown-content" v-html="renderedHtml" />
</template>

<style scoped>
.markdown-content {
  @apply text-gray-800 leading-relaxed;
}

.markdown-content :deep(h1) {
  @apply text-xl font-bold mt-4 mb-2;
}

.markdown-content :deep(h2) {
  @apply text-lg font-bold mt-4 mb-2;
}

.markdown-content :deep(h3) {
  @apply text-base font-semibold mt-3 mb-1;
}

.markdown-content :deep(p) {
  @apply my-2;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  @apply my-2 ml-4;
}

.markdown-content :deep(li) {
  @apply my-1;
}

.markdown-content :deep(ul) {
  @apply list-disc;
}

.markdown-content :deep(ol) {
  @apply list-decimal;
}

.markdown-content :deep(pre) {
  @apply bg-gray-900 text-gray-100 p-4 rounded-lg my-3 overflow-x-auto text-sm;
}

.markdown-content :deep(code) {
  @apply font-mono text-sm;
}

.markdown-content :deep(p code),
.markdown-content :deep(li code) {
  @apply bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded;
}

.markdown-content :deep(pre code) {
  @apply bg-transparent text-gray-100 p-0;
}

.markdown-content :deep(table) {
  @apply w-full my-3 border-collapse;
}

.markdown-content :deep(th) {
  @apply bg-gray-100 border border-gray-300 px-3 py-2 text-left font-semibold;
}

.markdown-content :deep(td) {
  @apply border border-gray-300 px-3 py-2;
}

.markdown-content :deep(blockquote) {
  @apply border-l-4 border-gray-300 pl-4 my-3 text-gray-600 italic;
}

.markdown-content :deep(hr) {
  @apply my-4 border-gray-300;
}

.markdown-content :deep(a) {
  @apply text-blue-600 hover:underline;
}

.markdown-content :deep(strong) {
  @apply font-semibold;
}

.markdown-content :deep(em) {
  @apply italic;
}
</style>
