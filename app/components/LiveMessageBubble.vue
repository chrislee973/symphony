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

function getToolResult(toolUseId: string): string | undefined {
  return props.toolResults?.get(toolUseId)
}

// Check if this is a streaming message (has tool calls with no results yet)
const isStreaming = computed(() => {
  if (props.message.type !== 'assistant') return false
  // If there are tool use blocks but no corresponding results, it's likely still streaming
  for (const tool of toolUseBlocks.value) {
    if (!props.toolResults?.has(tool.id)) {
      return true
    }
  }
  return false
})
</script>

<template>
  <div v-if="!isToolResult" class="flex gap-3" :class="isUser ? 'justify-end' : 'justify-start'">
    <div
      :class="[
        'max-w-[85%] rounded-lg relative',
        isUser ? 'bg-blue-600 text-white px-4 py-2' : 'bg-gray-800 border border-gray-700 p-4 space-y-3',
      ]"
    >
      <!-- Streaming indicator -->
      <div v-if="isStreaming" class="absolute -top-1 -right-1">
        <span class="flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
      </div>

      <!-- User message -->
      <template v-if="isUser">
        <p class="whitespace-pre-wrap">{{ userText }}</p>
      </template>

      <!-- Assistant message -->
      <template v-else>
        <!-- Thinking blocks -->
        <LiveThinkingBlock v-for="(block, i) in thinkingBlocks" :key="`thinking-${i}`" :thinking="block.thinking" />

        <!-- Tool use blocks -->
        <LiveToolCallBlock
          v-for="block in toolUseBlocks"
          :key="block.id"
          :tool-use="block"
          :result="getToolResult(block.id)"
        />

        <!-- Text blocks -->
        <LiveMarkdownRenderer v-for="(block, i) in textBlocks" :key="`text-${i}`" :content="block.text" />
      </template>
    </div>
  </div>
</template>
