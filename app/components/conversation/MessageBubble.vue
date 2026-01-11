<script setup lang="ts">
import type { UserMessage, AssistantMessage, TextContent, ThinkingContent, ToolUseContent, ImageContent } from '~/types/claude'

const props = defineProps<{
  message: UserMessage | AssistantMessage
  toolResults?: Map<string, string>
}>()

const isUser = computed(() => props.message.type === 'user')

// Extract text content from user message
const userText = computed(() => {
  if (props.message.type !== 'user') return ''
  const content = props.message.message.content
  if (typeof content === 'string') return content
  // Array content - extract text blocks
  const textBlocks = content.filter((item): item is TextContent => item.type === 'text')
  if (textBlocks.length > 0) {
    return textBlocks.map(block => block.text).join('\n')
  }
  return ''
})

// Extract images from user message
const userImages = computed(() => {
  if (props.message.type !== 'user') return []
  const content = props.message.message.content
  if (typeof content === 'string') return []
  return content.filter((item): item is ImageContent => item.type === 'image')
})

// Extract content blocks from assistant message
const textBlocks = computed(() => {
  if (props.message.type !== 'assistant') return []
  return props.message.message.content.filter((c): c is TextContent => c.type === 'text')
})

const thinkingBlocks = computed(() => {
  if (props.message.type !== 'assistant') return []
  return props.message.message.content.filter((c): c is ThinkingContent => c.type === 'thinking')
})

const toolUseBlocks = computed(() => {
  if (props.message.type !== 'assistant') return []
  return props.message.message.content.filter((c): c is ToolUseContent => c.type === 'tool_use')
})

// Get tool result for a tool use
function getToolResult(toolUseId: string): string | undefined {
  return props.toolResults?.get(toolUseId)
}
</script>

<template>
  <div class="flex gap-3" :class="isUser ? 'justify-end' : 'justify-start'">
    <div
      :class="[
        'max-w-[85%] rounded-lg',
        isUser ? 'bg-blue-600 text-white px-4 py-2' : 'bg-white border border-gray-200 p-4 space-y-3',
      ]"
    >
      <!-- User message -->
      <template v-if="isUser">
        <p v-if="userText" class="whitespace-pre-wrap">{{ userText }}</p>
        <!-- User attached images -->
        <div v-if="userImages.length > 0" class="mt-2 space-y-2">
          <img
            v-for="(img, i) in userImages"
            :key="`img-${i}`"
            :src="`data:${img.source.media_type};base64,${img.source.data}`"
            class="max-w-full rounded-md"
            alt="User attached image"
          />
        </div>
      </template>

      <!-- Assistant message -->
      <template v-else>
        <!-- Thinking blocks -->
        <ThinkingBlock v-for="(block, i) in thinkingBlocks" :key="`thinking-${i}`" :thinking="block.thinking" />

        <!-- Tool use blocks -->
        <ToolCallBlock
          v-for="block in toolUseBlocks"
          :key="block.id"
          :tool-use="block"
          :result="getToolResult(block.id)"
        />

        <!-- Text blocks -->
        <MarkdownRenderer v-for="(block, i) in textBlocks" :key="`text-${i}`" :content="block.text" />
      </template>
    </div>
  </div>
</template>
