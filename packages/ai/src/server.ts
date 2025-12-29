import { spawn } from 'node:child_process'
import type { ChatConfig, ServerHandle } from './types.js'

export async function startServer(config: ChatConfig): Promise<ServerHandle> {
  const provider = config.provider || 'opencode'
  const model = config.model || 'opencode/glm-4.7-free'
  const agent = config.agent || 'openagent'
  const port = config.port || 4098
  const hostname = config.hostname || '127.0.0.1'

  const opencodeConfig = {
    model: `${provider}/${model}`,
    agent
  }

  const args = [
    'serve',
    `--hostname=${hostname}`,
    `--port=${port}`
  ]

  const env: Record<string, string> = {
    ...process.env,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(opencodeConfig)
  }

  if (config.apiKey) {
    if (provider === 'anthropic') {
      env.ANTHROPIC_API_KEY = config.apiKey
    } else if (provider === 'openai') {
      env.OPENAI_API_KEY = config.apiKey
    } else if (provider === 'google') {
      env.GOOGLE_API_KEY = config.apiKey
    }
  }

  const proc = spawn('opencode', args, { env })

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server startup timeout after 10000ms`))
    }, 10000)

    let output = ''
    proc.stdout?.on('data', (chunk) => {
      output += chunk.toString()
      if (output.includes('opencode server listening')) {
        clearTimeout(timeout)
        resolve()
      }
    })

    proc.on('error', (error) => {
      clearTimeout(timeout)
      reject(new Error(`Failed to start server: ${error.message}`))
    })

    proc.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Server exited with code ${code}`))
    })
  })

  return {
    url: `http://${hostname}:${port}`,
    close: () => proc.kill('SIGTERM')
  }
}
