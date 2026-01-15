const API_BASE = import.meta.env.VITE_API_URL || '/api'

export type ModelProvider = 'openai' | 'anthropic' | 'deepseek'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message?: string
  messages?: ChatMessage[]
  provider?: ModelProvider
}

export interface ChatResponse {
  response: string
}

export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json()
}

export async function* streamMessage(
  request: ChatRequest
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
}

export interface ResearchChatRequest {
  message?: string
  messages?: ChatMessage[]
  provider?: ModelProvider
  documentIds?: string[]
}

export async function sendResearchMessage(
  request: ResearchChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/research/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json()
}
