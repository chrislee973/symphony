<script setup lang="ts">
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

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
  <div class="live-markdown" v-html="renderedHtml" />
</template>

<style scoped>
.live-markdown {
  @apply text-gray-200 leading-relaxed;
}

.live-markdown :deep(h1) {
  @apply text-xl font-bold mt-4 mb-2 text-white;
}

.live-markdown :deep(h2) {
  @apply text-lg font-bold mt-4 mb-2 text-white;
}

.live-markdown :deep(h3) {
  @apply text-base font-semibold mt-3 mb-1 text-white;
}

.live-markdown :deep(p) {
  @apply my-2;
}

.live-markdown :deep(ul),
.live-markdown :deep(ol) {
  @apply my-2 ml-4;
}

.live-markdown :deep(li) {
  @apply my-1;
}

.live-markdown :deep(ul) {
  @apply list-disc;
}

.live-markdown :deep(ol) {
  @apply list-decimal;
}

.live-markdown :deep(pre) {
  @apply bg-black text-gray-100 p-4 rounded-lg my-3 overflow-x-auto text-sm border border-gray-700;
}

.live-markdown :deep(code) {
  @apply font-mono text-sm;
}

.live-markdown :deep(p code),
.live-markdown :deep(li code) {
  @apply bg-gray-700 text-pink-300 px-1.5 py-0.5 rounded;
}

.live-markdown :deep(pre code) {
  @apply bg-transparent text-gray-100 p-0;
}

.live-markdown :deep(table) {
  @apply w-full my-3 border-collapse;
}

.live-markdown :deep(th) {
  @apply bg-gray-700 border border-gray-600 px-3 py-2 text-left font-semibold text-white;
}

.live-markdown :deep(td) {
  @apply border border-gray-600 px-3 py-2;
}

.live-markdown :deep(blockquote) {
  @apply border-l-4 border-gray-600 pl-4 my-3 text-gray-400 italic;
}

.live-markdown :deep(hr) {
  @apply my-4 border-gray-700;
}

.live-markdown :deep(a) {
  @apply text-blue-400 hover:underline;
}

.live-markdown :deep(strong) {
  @apply font-semibold text-white;
}

.live-markdown :deep(em) {
  @apply italic;
}
</style>
