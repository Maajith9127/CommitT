import { z } from 'zod'
import { readFileSync } from 'node:fs'
import type { ChatConfig } from './types.js'

const envVars: Record<string, string | undefined> = { ...process.env }

try {
  const envContent = readFileSync('.env', 'utf-8')
  envContent.split('\n').forEach((line: string) => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...values] = trimmedLine.split('=')
      if (key) {
        envVars[key.trim()] = values.join('=').trim()
      }
    }
  })
} catch {
}

const configSchema = z.object({
  provider: z.string().default('opencode'),
  model: z.string().default('opencode/glm-4.7-free'),
  apiKey: z.string().optional(),
  port: z.coerce.number().default(4098),
  hostname: z.string().default('127.0.0.1'),
  agent: z.string().default('openagent')
})

export type Config = z.infer<typeof configSchema>

export function loadConfig(overrides?: Partial<ChatConfig>): Config {
  const base = {
    provider: process.env.OPENCODE_PROVIDER,
    model: process.env.OPENCODE_MODEL,
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY,
    port: process.env.OPENCODE_PORT,
    hostname: process.env.OPENCODE_HOSTNAME,
    agent: process.env.OPENCODE_AGENT
  }
  
  return configSchema.parse({ ...base, ...overrides })
}
