import { connectClient } from './src/index.js'

async function test() {
  console.log('🔍 Connecting to existing OpenCode server...\n')
  
  try {
    const ai = await connectClient('http://127.0.0.1:4096')
    
    console.log('✅ Connected to server')
    console.log('📡 Server URL:', ai.server?.url || 'http://127.0.0.1:4096')
    
    console.log('\n📨 Sending test message: "Hello, what is your name?"\nAlso whats 30 - 33')
    
    const startTime = Date.now()
    const response = await ai.client.quickChat('Hello, what is your name?, Also whats 30 - 33')
    const duration = Date.now() - startTime
    
    console.log(`✅ Response received (${duration}ms):\n`)
    console.log(response)
    
    await ai.close()
    console.log('\n👋 Test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:')
    console.error(error)
    console.log('\n💡 Make sure OpenCode server is running:')
    console.log('   opencode serve --port=4096')
    process.exit(1)
  }
}

test()
