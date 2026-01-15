import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { streamText } from 'hono/streaming'
import { initDatabase } from './db/client.js'
import { createFundAnalystAgent } from './agents/fund-analyst.js'
import { createSupervisorAgent } from './agents/supervisor.js'
import type { ModelProvider } from './config/models.js'

const app = new Hono()

// Message type for conversation history
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'https://mellivora-mind-studio-web.vercel.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Simple chat endpoint (non-streaming)
app.post('/api/chat', async (c) => {
  const { message, messages, provider = 'deepseek' } = await c.req.json<{
    message?: string
    messages?: ChatMessage[]
    provider?: ModelProvider
  }>()

  // Support both single message and message array
  const input = messages || (message ? [{ role: 'user' as const, content: message }] : null)

  if (!input || input.length === 0) {
    return c.json({ error: 'Message is required' }, 400)
  }

  const agent = createFundAnalystAgent(provider)

  try {
    const response = await agent.generateText(input)
    return c.json({ response: response.text })
  } catch (error) {
    console.error('Chat error:', error)
    return c.json({ error: 'Failed to generate response' }, 500)
  }
})

// Streaming chat endpoint with conversation history
app.post('/api/chat/stream', async (c) => {
  const { message, messages, provider = 'deepseek' } = await c.req.json<{
    message?: string
    messages?: ChatMessage[]
    provider?: ModelProvider
  }>()

  // Support both single message and message array
  const input = messages || (message ? [{ role: 'user' as const, content: message }] : null)

  if (!input || input.length === 0) {
    return c.json({ error: 'Message is required' }, 400)
  }

  console.log('Received messages:', input.length, 'provider:', provider)

  const agent = createFundAnalystAgent(provider)

  return streamText(c, async (stream) => {
    try {
      const response = await agent.streamText(input)

      for await (const chunk of response.textStream) {
        await stream.write(chunk)
      }
    } catch (error) {
      console.error('Stream error:', error)
      await stream.write('Error generating response')
    }
  })
})

// Deep research endpoint (uses supervisor)
app.post('/api/research/chat', async (c) => {
  const { message, messages, provider = 'deepseek', documentIds } = await c.req.json<{
    message?: string
    messages?: ChatMessage[]
    provider?: ModelProvider
    documentIds?: string[]
  }>()

  const input = messages || (message ? [{ role: 'user' as const, content: message }] : null)

  if (!input || input.length === 0) {
    return c.json({ error: 'Message is required' }, 400)
  }

  const supervisor = createSupervisorAgent(provider)

  try {
    const response = await supervisor.generateText(input)

    return c.json({
      response: response.text,
      documentIds,
    })
  } catch (error) {
    console.error('Research error:', error)
    return c.json({ error: 'Failed to generate response' }, 500)
  }
})

// Start server
const port = parseInt(process.env.PORT || '3141', 10)

async function main() {
  try {
    await initDatabase()
    console.log('Database connected')
  } catch (error) {
    console.warn('Database connection failed, running without database:', error)
  }

  serve({
    fetch: app.fetch,
    port,
  }, (info) => {
    console.log(`Server running at http://localhost:${info.port}`)
  })
}

main()
