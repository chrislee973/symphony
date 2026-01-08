# Context Compaction Visual Divider - Implementation Spec

## Background

Symphony is a Nuxt 4 web app for browsing Claude Code conversation history. Sessions are stored as JSONL files in `~/.claude/projects/[encoded-path]/[session-id].jsonl`.

When Claude Code compacts context (to fit within context limits), it inserts special messages into the JSONL file:

```jsonl
{"type":"system","uuid":"01d8d972-...","parentUuid":null}
{"type":"summary","summary":"Brief description of compacted content","leafUuid":"..."}
```

- **`system`** - A structural marker with a uuid (becomes new chain root)
- **`summary`** - Contains the summary text, has NO uuid

## Current State

We recently fixed message ordering by switching from parent-child DFS traversal to simple **timestamp-based sorting**. This fixed a bug where 335 messages were orphaned because the `system` message was filtered out.

The fix is in two files:
- `server/api/sessions/[id].get.ts` - Session detail API
- `app/composables/useLiveSession.ts` - Live session composable

Both now use timestamp sorting and filter to only `user` and `assistant` message types.

## Requested Feature

Add a **visual divider** in the message thread where context compaction occurred. No need to show the summary text - just a simple visual indicator.

Example rendering:
```
[User message]
[Assistant message]

─────────── Context Compacted ───────────

[User message after compaction]
[Assistant message]
```

## Implementation Plan

### 1. Update Types (`types/claude.ts`)

The `SummaryMessage` type already exists. Make sure it's included in the `ClaudeMessage` union if not already.

### 2. Update Session Detail API (`server/api/sessions/[id].get.ts`)

In `orderMessages()`, change the filter to INCLUDE `summary` type:

```typescript
const conversationMessages = messages.filter(
  (m): m is ClaudeMessage => m.type === 'user' || m.type === 'assistant' || m.type === 'summary'
)
```

Summary messages don't have `uuid` or `timestamp`, so handle them specially:
- They appear at JSONL line position where compaction happened
- Could assign them a synthetic timestamp based on surrounding messages
- Or track their position and insert at the right spot after sorting

### 3. Update Live Session Composable (`app/composables/useLiveSession.ts`)

Similar change in `processMessages()` - don't skip `summary` type messages.

### 4. Create Divider Component (`app/components/ContextCompactionDivider.vue`)

Simple component:
```vue
<template>
  <div class="flex items-center gap-4 py-4 text-gray-400 text-sm">
    <div class="flex-1 border-t border-gray-300"></div>
    <span>Context Compacted</span>
    <div class="flex-1 border-t border-gray-300"></div>
  </div>
</template>
```

For live view (dark mode), create `LiveContextCompactionDivider.vue` with appropriate dark styling.

### 5. Update Message Bubble Components

In `MessageBubble.vue` and `LiveMessageBubble.vue`, check for `summary` type and render the divider instead:

```vue
<template v-if="message.type === 'summary'">
  <ContextCompactionDivider />
</template>
<template v-else>
  <!-- existing user/assistant rendering -->
</template>
```

### 6. Update ConversationView.vue

The component already iterates over messages. Just ensure it passes `summary` messages through to `MessageBubble`.

## Key Files

- `types/claude.ts` - Type definitions
- `server/api/sessions/[id].get.ts` - Session detail API
- `app/composables/useLiveSession.ts` - Live session state
- `app/components/conversation/MessageBubble.vue` - Light mode message
- `app/components/LiveMessageBubble.vue` - Dark mode message (live view)
- New: `app/components/ContextCompactionDivider.vue`
- New: `app/components/LiveContextCompactionDivider.vue`

## Testing

1. Open a session that has been compacted (current session `0253aa24-844a-438b-8ce7-b4e5f1573250` has 2 compactions)
2. Verify divider appears at the right spot in the conversation
3. Check both session detail view (light) and live view (dark)
