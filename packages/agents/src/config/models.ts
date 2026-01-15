import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'

export type ModelProvider = 'openai' | 'anthropic' | 'deepseek'

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modelRegistry: Record<ModelProvider, () => any> = {
  openai: () => openai('gpt-4o'),
  anthropic: () => anthropic('claude-3-5-sonnet-20241022'),
  deepseek: () => deepseek('deepseek-chat'),
}

export function getModel(provider: ModelProvider) {
  const factory = modelRegistry[provider]
  if (!factory) {
    throw new Error(`Unknown provider: ${provider}`)
  }
  return factory()
}
