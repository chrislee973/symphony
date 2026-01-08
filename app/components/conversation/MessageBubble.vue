<script setup lang="ts">
import type { UserMessage, AssistantMessage, TextContent, ThinkingContent, ToolUseContent } from '~/types/claude'

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
  // Tool result - show brief summary
  return '[Tool result]'
})

// Check if this is a tool result message
const isToolResult = computed(() => {
  if (props.message.type !== 'user') return false
  return Array.isArray(props.message.message.content)
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
  <!-- Skip tool result messages in the UI (they're shown inline with tool calls) -->
  <div v-if="!isToolResult" class="flex gap-3" :class="isUser ? 'justify-end' : 'justify-start'">
    <div
      :class="[
        'max-w-[85%] rounded-lg',
        isUser ? 'bg-blue-600 text-white px-4 py-2' : 'bg-white border border-gray-200 p-4 space-y-3',
      ]"
    >
      <!-- User message -->
      <template v-if="isUser">
        <p class="whitespace-pre-wrap">{{ userText }}</p>
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
