import { createSignal, createEffect } from 'solid-js'
import { type ModelProvider } from '../lib/api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function createChatStore() {
  const [messages, setMessages] = createSignal<Message[]>([])
  const [isLoading, setIsLoading] = createSignal(false)
  const [provider, setProvider] = createSignal<ModelProvider>('deepseek')

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, message])
    return message
  }

  const updateLastMessage = (content: string) => {
    setMessages((prev) => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last && last.role === 'assistant') {
        updated[updated.length - 1] = { ...last, content }
      }
      return updated
    })
  }

  const appendToLastMessage = (chunk: string) => {
    setMessages((prev) => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last && last.role === 'assistant') {
        updated[updated.length - 1] = { ...last, content: last.content + chunk }
      }
      return updated
    })
  }

  const clearMessages = () => {
    setMessages([])
  }

  return {
    messages,
    isLoading,
    setIsLoading,
    provider,
    setProvider,
    addMessage,
    updateLastMessage,
    appendToLastMessage,
    clearMessages,
  }
}
