# @commit/ai

Basic chat interface for OpenCode AI.

## Installation

```bash
cd packages/ai
bun install
```

## Configuration

Create a `.env` file in the package directory:

```env
OPENCODE_PROVIDER=opencode
OPENCODE_MODEL=opencode/glm-4.7-free
OPENCODE_AGENT=openagent
OPENCODE_PORT=4097
```

Optionally add API keys for paid providers:

```env
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```

## Usage

### Quick Chat (one-off message)

```typescript
import { createChat } from '@commit/ai'

const ai = await createChat()
const response = await ai.client.quickChat('What is 2 + 2?')
console.log(response)

await ai.close()
```

### Multi-turn Chat

```typescript
import { createChat } from '@commit/ai'

const ai = await createChat()
const session = await ai.client.createSession()

const r1 = await session.sendMessage('Hello')
const r2 = await session.sendMessage('Tell me a joke')

await session.close()
await ai.close()
```

### Connect to Existing Server

```typescript
import { connectClient } from '@commit/ai'

const ai = await connectClient('http://localhost:4096')
const response = await ai.client.quickChat('Hello')

await ai.close()
```

### Custom Configuration

```typescript
import { createChat } from '@commit/ai'

const ai = await createChat({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  agent: 'opencoder'
})

const response = await ai.client.quickChat('Write a function')
await ai.close()
```

## API

### `createChat(options?)`

Creates a new AI instance with auto-started server.

**Parameters:**
- `options?: Partial<ChatConfig>` - Configuration overrides

**Returns:** `Promise<AI>`

### `connectClient(baseUrl)`

Connects to an existing OpenCode server.

**Parameters:**
- `baseUrl: string` - Server URL

**Returns:** `Promise<AI>`

### `ChatClient`

- `createSession(): Promise<ChatSession>` - Create new session
- `quickChat(message): Promise<string>` - One-off message
- `close(): Promise<void>` - Cleanup

### `ChatSession`

- `id: string` - Session ID
- `sendMessage(message): Promise<string>` - Send message
- `close(): Promise<void>` - Close session

### `AI`

- `client: ChatClient` - Client instance
- `server: ServerHandle | null` - Server handle (null if connected)
- `config: ChatConfig` - Current configuration
- `close(): Promise<void>` - Cleanup client and server
