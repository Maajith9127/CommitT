export { startServer } from './server.js'
export { ChatClient } from './client.js'
export { loadConfig } from './config.js'
export type { ChatConfig, ChatSession, ChatClient as IChatClient, ServerHandle, AI } from './types.js'

import { startServer } from './server.js'
import { ChatClient } from './client.js'
import { loadConfig } from './config.js'
import type { ChatConfig, AI } from './types.js'

export async function createChat(options?: Partial<ChatConfig>): Promise<AI> {
  const config = loadConfig(options)
  const server = await startServer(config)
  const client = new ChatClient(server.url)
  
  return {
    client,
    server,
    config,
    close: async () => {
      await client.close()
      server.close()
    }
  }
}

export async function connectClient(baseUrl: string): Promise<AI> {
  const client = new ChatClient(baseUrl)
  
  return {
    client,
    server: null,
    config: loadConfig(),
    close: async () => {
      await client.close()
    }
  }
}
