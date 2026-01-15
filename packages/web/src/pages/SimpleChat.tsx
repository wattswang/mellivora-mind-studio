import { type Component, createSignal, For, Show, onMount, createEffect } from 'solid-js'
import { createChatStore, type Message } from '../stores/chat'
import { streamMessage, type ModelProvider, type ChatMessage } from '../lib/api'
import { marked } from 'marked'
import {
  Send,
  Sparkles,
  User,
  Bot,
  Trash2,
  TrendingUp,
  PieChart,
  BarChart3,
  Loader2,
} from 'lucide-solid'

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

const SimpleChat: Component = () => {
  const chat = createChatStore()
  const [input, setInput] = createSignal('')
  let messagesEndRef: HTMLDivElement | undefined
  let inputRef: HTMLTextAreaElement | undefined

  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' })
  }

  onMount(() => {
    inputRef?.focus()
  })

  // Auto-resize textarea
  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLTextAreaElement
    setInput(target.value)
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, 200) + 'px'
  }

  const handleSubmit = async (e?: Event) => {
    e?.preventDefault()
    const message = input().trim()
    if (!message || chat.isLoading()) return

    setInput('')
    // Reset textarea height
    if (inputRef) {
      inputRef.style.height = 'auto'
    }

    chat.addMessage('user', message)
    chat.setIsLoading(true)

    const history: ChatMessage[] = chat.messages().map((m) => ({
      role: m.role,
      content: m.content,
    }))

    chat.addMessage('assistant', '')

    try {
      const stream = streamMessage({
        messages: history,
        provider: chat.provider(),
      })

      for await (const chunk of stream) {
        chat.appendToLastMessage(chunk)
        scrollToBottom()
      }
    } catch (error) {
      console.error('Error:', error)
      chat.updateLastMessage('抱歉，发生了错误，请稍后重试。')
    } finally {
      chat.setIsLoading(false)
      scrollToBottom()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const providerOptions: { value: ModelProvider; label: string; icon: string }[] = [
    { value: 'deepseek', label: 'DeepSeek', icon: '🔮' },
    { value: 'openai', label: 'GPT-4o', icon: '🤖' },
    { value: 'anthropic', label: 'Claude', icon: '🎭' },
  ]

  const quickPrompts = [
    { icon: TrendingUp, text: '查询易方达蓝筹基金', prompt: '查询易方达蓝筹精选基金的最新净值和收益情况' },
    { icon: PieChart, text: '对比两只基金', prompt: '对比000001和000002两只基金的表现' },
    { icon: BarChart3, text: '基金经理分析', prompt: '帮我查询张坤管理的基金' },
  ]

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef?.focus()
  }

  return (
    <div class="h-[calc(100vh-65px)] flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Messages Area */}
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-3xl mx-auto px-4 py-6">
          <Show
            when={chat.messages().length > 0}
            fallback={<WelcomeScreen onPromptClick={handleQuickPrompt} quickPrompts={quickPrompts} />}
          >
            <div class="space-y-6">
              <For each={chat.messages()}>
                {(message) => <MessageBubble message={message} />}
              </For>
              <Show when={chat.isLoading()}>
                <div class="flex gap-3">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                    <Bot class="w-4 h-4 text-white" />
                  </div>
                  <div class="flex items-center gap-2 text-gray-500">
                    <Loader2 class="w-4 h-4 animate-spin" />
                    <span class="text-sm">思考中...</span>
                  </div>
                </div>
              </Show>
              <div ref={messagesEndRef} />
            </div>
          </Show>
        </div>
      </div>

      {/* Input Area */}
      <div class="border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div class="max-w-3xl mx-auto px-4 py-4">
          {/* Clear button */}
          <Show when={chat.messages().length > 0}>
            <div class="flex justify-end mb-3">
              <button
                onClick={() => chat.clearMessages()}
                class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Trash2 class="w-3.5 h-3.5" />
                清空对话
              </button>
            </div>
          </Show>

          <form onSubmit={handleSubmit} class="relative">
            <div class="flex items-end gap-3 p-2 bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              {/* Provider Selector */}
              <div class="flex-shrink-0">
                <select
                  value={chat.provider()}
                  onChange={(e) => chat.setProvider(e.currentTarget.value as ModelProvider)}
                  class="appearance-none bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 cursor-pointer transition-colors focus:outline-none border-0"
                >
                  <For each={providerOptions}>
                    {(opt) => (
                      <option value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input()}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="输入问题，例如：查询华夏成长基金的收益情况..."
                rows={1}
                class="flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder:text-gray-400 py-2 max-h-[200px]"
                disabled={chat.isLoading()}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={chat.isLoading() || !input().trim()}
                class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              >
                <Show when={chat.isLoading()} fallback={<Send class="w-4 h-4" />}>
                  <Loader2 class="w-4 h-4 animate-spin" />
                </Show>
              </button>
            </div>

            <p class="text-xs text-gray-400 mt-2 text-center">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

const WelcomeScreen: Component<{
  onPromptClick: (prompt: string) => void
  quickPrompts: { icon: any; text: string; prompt: string }[]
}> = (props) => {
  return (
    <div class="h-full flex flex-col items-center justify-center py-12">
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25 mb-6">
          <Sparkles class="w-8 h-8 text-white" />
        </div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">基金智能助手</h2>
        <p class="text-gray-500 max-w-md">
          查询基金信息、分析收益表现、对比不同基金，让投资决策更简单
        </p>
      </div>

      <div class="w-full max-w-lg">
        <p class="text-sm font-medium text-gray-500 mb-3 text-center">快速开始</p>
        <div class="grid gap-3">
          <For each={props.quickPrompts}>
            {(item) => (
              <button
                onClick={() => props.onPromptClick(item.prompt)}
                class="group flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left"
              >
                <div class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <item.icon class="w-5 h-5 text-primary-600" />
                </div>
                <span class="text-gray-700 font-medium">{item.text}</span>
              </button>
            )}
          </For>
        </div>
      </div>

      <p class="text-xs text-gray-400 mt-12">
        数据仅供参考，不构成投资建议
      </p>
    </div>
  )
}

const MessageBubble: Component<{ message: Message }> = (props) => {
  const isUser = () => props.message.role === 'user'

  const renderMarkdown = (content: string) => {
    try {
      return marked.parse(content) as string
    } catch {
      return content
    }
  }

  return (
    <div class={`flex gap-3 ${isUser() ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        class={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser()
            ? 'bg-gray-700'
            : 'bg-gradient-to-br from-primary-500 to-primary-600'
        }`}
      >
        {isUser() ? (
          <User class="w-4 h-4 text-white" />
        ) : (
          <Bot class="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        class={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser()
            ? 'bg-gray-700 text-white'
            : 'bg-white border border-gray-100 shadow-sm'
        }`}
      >
        <Show
          when={!isUser()}
          fallback={
            <div class="whitespace-pre-wrap">{props.message.content}</div>
          }
        >
          <div
            class="message-content prose prose-sm max-w-none"
            innerHTML={renderMarkdown(props.message.content)}
          />
        </Show>
      </div>
    </div>
  )
}

export default SimpleChat
