import { createOpencodeClient } from '@opencode-ai/sdk'
import type { ChatClient as IChatClient, ChatSession } from './types.js'

export class ChatClient implements IChatClient {
  private client: ReturnType<typeof createOpencodeClient>

  constructor(baseUrl: string) {
    this.client = createOpencodeClient({ baseUrl })
  }

  async createSession(): Promise<ChatSession> {
    const session = await this.client.session.create()
    
    if (!session.data) {
      throw new Error('Failed to create session')
    }
    
    const sessionId = session.data.id
    
    return {
      id: sessionId,
      sendMessage: async (message: string) => {
        const response = await this.client.session.prompt({
          path: { id: sessionId },
          body: {
            parts: [{ type: 'text', text: message }]
          }
        })
        
        if (!response.data) {
          throw new Error('No response data')
        }
        
        const data = response.data as { parts: Array<{ type: string; text?: string }> }
        const parts = data.parts || []
        const textPart = parts.find(p => p.type === 'text')
        return textPart?.text || ''
      },
      close: async () => {
        await this.client.session.delete({ path: { id: sessionId } })
      }
    }
  }

  async quickChat(message: string): Promise<string> {
    const session = await this.createSession()
    try {
      return await session.sendMessage(message)
    } finally {
      await session.close()
    }
  }

  async close(): Promise<void> {
  }
}
