<script setup lang="ts">
import type { SessionMetadata } from '~/types/claude'

const props = defineProps<{
  sessions: SessionMetadata[]
  loading: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  loadMore: []
}>()

// Intersection observer for infinite scroll
const loadMoreTrigger = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!loadMoreTrigger.value) return

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && props.hasMore && !props.loading) {
        emit('loadMore')
      }
    },
    { threshold: 0.1 }
  )

  observer.observe(loadMoreTrigger.value)

  onUnmounted(() => {
    observer.disconnect()
  })
})
</script>

<template>
  <div class="space-y-3">
    <SessionCard v-for="session in sessions" :key="session.id" :session="session" />

    <!-- Load more trigger -->
    <div ref="loadMoreTrigger" class="h-10 flex items-center justify-center">
      <span v-if="loading" class="text-gray-500">Loading...</span>
      <span v-else-if="!hasMore && sessions.length > 0" class="text-gray-400 text-sm">
        No more sessions
      </span>
    </div>
  </div>
</template>
