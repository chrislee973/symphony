# Claude Code Session Data Structure

This document provides a comprehensive overview of how Claude Code stores conversation sessions. Use this as context when implementing features that interact with session data.

## Storage Location

```
~/.claude/projects/[encoded-path]/[session-id].jsonl
```

- **Path encoding**: Forward slashes replaced with dashes. `/Users/foo/bar` → `-Users-foo-bar`
- **Session ID**: UUID format, e.g., `0253aa24-844a-438b-8ce7-b4e5f1573250`
- **File format**: JSONL (JSON Lines) - each line is a separate JSON object
- **Write pattern**: Append-only. New entries are added as the conversation progresses.

### Index File

```
~/.claude/history.jsonl
```

Contains metadata for all sessions (first message preview, timestamps, project path). Used by Symphony for the session list.

---

## Message Types

### 1. `user` - User Messages

**Regular user message (human typed):**
```json
{
  "type": "user",
  "uuid": "021c712f-...",
  "parentUuid": "previous-msg-uuid",
  "timestamp": "2026-01-06T08:43:20.699Z",
  "sessionId": "0253aa24-...",
  "cwd": "/Users/christopherlee/project",
  "version": "2.0.76",
  "userType": "external",
  "message": {
    "role": "user",
    "content": "can you help me with this code?"
  }
}
```

**Tool result message (Claude Code sending tool output back):**
```json
{
  "type": "user",
  "uuid": "e3b8995d-...",
  "parentUuid": "assistant-msg-uuid",
  "timestamp": "2026-01-06T08:44:00.000Z",
  "message": {
    "role": "user",
    "content": [{
      "type": "tool_result",
      "tool_use_id": "toolu_016jnLDof...",
      "content": "command output here..."
    }]
  },
  "toolUseResult": {
    "stdout": "actual stdout",
    "stderr": "any stderr",
    "success": true
  }
}
```

**How to distinguish:** Check if `message.content` is a string (regular) or array (tool result).

### 2. `assistant` - Claude's Responses

```json
{
  "type": "assistant",
  "uuid": "8fd54b85-...",
  "parentUuid": "user-msg-uuid",
  "timestamp": "2026-01-06T10:17:46.199Z",
  "message": {
    "role": "assistant",
    "model": "claude-opus-4-5-20251101",
    "id": "msg_...",
    "content": [
      {"type": "thinking", "thinking": "Let me analyze this..."},
      {"type": "text", "text": "Here's my response..."},
      {"type": "tool_use", "id": "toolu_01...", "name": "Bash", "input": {"command": "ls -la"}}
    ],
    "stop_reason": "end_turn",
    "usage": {
      "input_tokens": 1234,
      "output_tokens": 567,
      "cache_read_input_tokens": 100
    }
  }
}
```

**Content block types:**
- `thinking` - Extended thinking/reasoning (collapsible in UI)
- `text` - Regular text response
- `tool_use` - Tool invocation (Bash, Read, Write, Edit, Task, etc.)

### 3. `system` (subtype: `compact_boundary`) - Compaction Events

Written when Claude Code compacts context (conversation too long):

```json
{
  "type": "system",
  "subtype": "compact_boundary",
  "uuid": "01d8d972-...",
  "parentUuid": null,
  "logicalParentUuid": "58985510-...",
  "timestamp": "2026-01-06T09:39:07.795Z",
  "content": "Conversation compacted",
  "compactMetadata": {
    "trigger": "auto",
    "preTokens": 156194
  }
}
```

**Key field:** `logicalParentUuid` points to the last message BEFORE compaction. Use this to position compaction dividers in the UI.

### 4. `summary` - Compaction Summary Metadata

```json
{
  "type": "summary",
  "summary": "Claude Code Conversation Viewer Web App",
  "leafUuid": "58985510-..."
}
```

**Note:** Multiple summaries may exist per compaction event. These are metadata about what was summarized, NOT the source of truth for when compaction occurred. Use `compact_boundary` system messages instead.

### 5. `file-history-snapshot` - File State Tracking

```json
{
  "type": "file-history-snapshot",
  "messageId": "021c712f-...",
  "snapshot": {
    "trackedFileBackups": {...},
    "timestamp": "2026-01-06T08:45:00.000Z"
  },
  "isSnapshotUpdate": false
}
```

Used internally for file undo/restore. Generally not displayed in UI.

---

## Key Concepts

### Message Chain (Parent-Child Linking)

Messages form a linked list via `uuid` → `parentUuid`:

```
[user] uuid: A, parentUuid: null       ← Root message
   └── [assistant] uuid: B, parentUuid: A
         └── [user] uuid: C, parentUuid: B    ← Tool result
               └── [assistant] uuid: D, parentUuid: C
```

**After compaction**, a `system` message becomes the new root:
```
[system compact_boundary] uuid: X, parentUuid: null, logicalParentUuid: D
   └── [user] uuid: E, parentUuid: X    ← Contains compaction summary text
```

### Streaming Behavior

As Claude generates a response, the **same UUID** is written multiple times with progressively more content:

```jsonl
{"type":"assistant","uuid":"ABC","message":{"content":[{"type":"text","text":"Let"}]}}
{"type":"assistant","uuid":"ABC","message":{"content":[{"type":"text","text":"Let me"}]}}
{"type":"assistant","uuid":"ABC","message":{"content":[{"type":"text","text":"Let me help"}]}}
```

**Deduplication:** Keep the **last occurrence** of each UUID to get the final version.

### Ordering Messages

**Recommended:** Use `timestamp` field for ordering, not parent-child traversal.

Parent-child traversal can break when:
- `system` messages are filtered out (breaks the chain)
- Streaming creates partial chains
- Context compaction inserts new roots

---

## How Symphony Handles Each Type

| Type | Display | Notes |
|------|---------|-------|
| `user` (string content) | Blue bubble, right-aligned | Regular user message |
| `user` (array content) | **Hidden** | Tool result - content shown inline with tool call |
| `assistant` | White bubble, left-aligned | Shows text, collapsible thinking/tool blocks |
| `system` (compact_boundary) | Divider line | "Context Compacted" visual separator |
| `summary` | **Ignored** | Not used for display |
| `file-history-snapshot` | **Ignored** | Internal use only |

### Tool Results Display Pattern

Tool results are NOT shown as separate messages. Instead:
1. Extract tool results into a `Map<tool_use_id, content>`
2. Pass to `MessageBubble` component
3. Display inline within the collapsible tool call block

---

## Symphony File Reference

### Types
- `types/claude.ts` - TypeScript interfaces for all message types

### Server API
- `server/api/sessions/index.get.ts` - List sessions
- `server/api/sessions/[id].get.ts` - Get session detail (handles ordering, deduplication, compaction markers)
- `server/api/sessions/live.get.ts` - SSE endpoint for live session tailing
- `server/utils/claude-path.ts` - Path encoding/decoding utilities
- `server/utils/jsonl-parser.ts` - Streaming JSONL parser
- `server/utils/session-indexer.ts` - Builds session index from history.jsonl

### Components
- `app/components/conversation/ConversationView.vue` - Main conversation display, handles tool result extraction
- `app/components/conversation/MessageBubble.vue` - Individual message rendering
- `app/components/conversation/ToolCallBlock.vue` - Collapsible tool call with result
- `app/components/conversation/ThinkingBlock.vue` - Collapsible thinking block
- `app/components/ContextCompactionDivider.vue` - Compaction divider (light mode)
- `app/components/LiveContextCompactionDivider.vue` - Compaction divider (dark mode, live view)

### Composables
- `app/composables/useLiveSession.ts` - Live session SSE handling and message processing

---

## Deeper Exploration

If you need to explore the raw session data for a specific feature:

### ⚠️ Large File Warning

Session files may contain **base64-encoded images** that span 1+ MB on a single line. Running `head`, `cat`, or `tail` directly can hang your terminal or Claude Code.

**Safe patterns:**
```bash
# Always truncate lines
head -20 "$SESSION" | cut -c1-500

# Strip base64 data before viewing
sed 's/"data":"[^"]*"/"data":"[TRUNCATED]"/g' "$SESSION" | head -20

# Check max line length first (>50KB = use truncation)
wc -L "$SESSION"

# Use the safe-jsonl helper (if installed at ~/.claude/bin/)
safe-jsonl head "$SESSION" 10
safe-jsonl stats "$SESSION"
```

**Avoid:** `cat`, `head`, `tail`, `grep` without output limiting on raw session files.

### Find Session Files
```bash
# List all project directories
ls ~/.claude/projects/

# List sessions for a specific project
ls ~/.claude/projects/-Users-christopherlee-Documents-Github-vue-symphony/

# Find the most recently modified session
ls -lt ~/.claude/projects/-Users-christopherlee/ | head -5
```

### Examine Message Types
```bash
SESSION=~/.claude/projects/-Users-christopherlee/[session-id].jsonl

# Count message types
jq -r '.type' "$SESSION" | sort | uniq -c

# Find specific message type
grep '"type":"assistant"' "$SESSION" | head -1 | jq .

# Find compact_boundary events
grep '"compact_boundary"' "$SESSION" | jq -c '{uuid: .uuid[0:8], logicalParentUuid: .logicalParentUuid[0:8], timestamp}'

# Check content block types in assistant messages
grep '"type":"assistant"' "$SESSION" | jq -c '[.message.content[].type]' | sort | uniq -c
```

### Examine Specific Messages
```bash
# Get message at specific line
sed -n '100p' "$SESSION" | jq .

# Get context around a line
sed -n '98,102p' "$SESSION" | jq -c '{type, uuid: .uuid[0:8]}'

# Find message by UUID prefix
grep '"uuid":"021c712f' "$SESSION" | jq .
```

### Trace Parent-Child Chain
```bash
# Find a message and its parent
grep '"uuid":"8fd54b85' "$SESSION" | jq '{uuid, parentUuid}'

# Then find the parent
grep '"uuid":"d8d21ec2' "$SESSION" | jq '{uuid, parentUuid, type}'
```

### Check File Statistics
```bash
# Total lines (approximate message count)
wc -l "$SESSION"

# File size
ls -lh "$SESSION"

# Unique UUIDs (actual message count after deduplication)
jq -r '.uuid // empty' "$SESSION" | sort -u | wc -l
```

