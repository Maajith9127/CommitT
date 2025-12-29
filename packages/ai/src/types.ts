export interface ChatConfig {
  provider?: string
  model?: string
  apiKey?: string
  port?: number
  hostname?: string
  agent?: string
}

export interface ChatSession {
  id: string
  sendMessage(message: string): Promise<string>
  close(): Promise<void>
}

export interface ChatClient {
  createSession(): Promise<ChatSession>
  quickChat(message: string): Promise<string>
  close(): Promise<void>
}

export interface ServerHandle {
  url: string
  close(): void
}

export interface AI {
  client: ChatClient
  server: ServerHandle | null
  config: ChatConfig
  close(): Promise<void>
}
