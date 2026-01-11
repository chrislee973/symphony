<script setup lang="ts">
import type {
  ClaudeMessage,
  UserMessage,
  AssistantMessage,
  SummaryMessage,
} from "~/types/claude";

const props = defineProps<{
  messages: ClaudeMessage[];
}>();

// Filter to only user/assistant/summary messages
const conversationMessages = computed(() => {
  return props.messages.filter(
    (m): m is UserMessage | AssistantMessage | SummaryMessage =>
      m.type === "user" || m.type === "assistant" || m.type === "summary"
  );
});

// Build a map of tool_use_id -> result content
const toolResults = computed(() => {
  const results = new Map<string, string>();

  for (const msg of props.messages) {
    if (msg.type === "user" && Array.isArray(msg.message.content)) {
      for (const item of msg.message.content) {
        if (item.type === "tool_result") {
          let content = "";
          if (typeof item.content === "string") {
            content = item.content;
          } else if (Array.isArray(item.content)) {
            content = item.content.map((c) => c.text).join("\n");
          }
          // Also check toolUseResult for stdout/stderr
          if (msg.toolUseResult?.stdout) {
            content = msg.toolUseResult.stdout;
            if (msg.toolUseResult.stderr) {
              content += "\n" + msg.toolUseResult.stderr;
            }
          }
          results.set(item.tool_use_id, content);
        }
      }
    }
  }

  return results;
});

// Check if a message is ONLY tool results (no user text or images)
// These are skipped because tool results are shown inline with tool calls
function isToolResultOnlyMessage(msg: UserMessage | AssistantMessage): boolean {
  if (msg.type !== "user") return false;
  const content = msg.message.content;
  if (!Array.isArray(content)) return false;
  // Skip only if ALL items are tool_result type (no text or images from user)
  return content.every(item => item.type === "tool_result");
}
</script>

<template>
  <div class="space-y-4">
    <template
      v-for="(msg, index) in conversationMessages"
      :key="'uuid' in msg ? msg.uuid : `summary-${index}`"
    >
      <template v-if="msg.type === 'summary'">
        <ContextCompactionDivider />
      </template>
      <template v-else-if="!isToolResultOnlyMessage(msg)">
        <MessageBubble :message="msg" :tool-results="toolResults" />
      </template>
    </template>
  </div>
</template>
