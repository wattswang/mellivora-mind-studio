import { type Component, createSignal, For, Show } from 'solid-js'
import { createChatStore, type Message } from '../stores/chat'
import { sendResearchMessage, type ModelProvider } from '../lib/api'

interface Document {
  id: string
  title: string
  type: 'pdf' | 'doc' | 'txt'
  uploadedAt: Date
}

const DeepResearch: Component = () => {
  const chat = createChatStore()
  const [input, setInput] = createSignal('')
  const [documents, setDocuments] = createSignal<Document[]>([])
  const [selectedDocs, setSelectedDocs] = createSignal<string[]>([])
  const [activePanel, setActivePanel] = createSignal<'sources' | 'outputs'>('sources')

  let fileInputRef: HTMLInputElement | undefined

  const handleUpload = (e: Event) => {
    const files = (e.target as HTMLInputElement).files
    if (!files) return

    Array.from(files).forEach((file) => {
      const doc: Document = {
        id: crypto.randomUUID(),
        title: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.doc') ? 'doc' : 'txt',
        uploadedAt: new Date(),
      }
      setDocuments((prev) => [...prev, doc])
      setSelectedDocs((prev) => [...prev, doc.id])
    })
  }

  const handleSubmit = async (e?: Event) => {
    e?.preventDefault()
    const message = input().trim()
    if (!message || chat.isLoading()) return

    setInput('')
    chat.addMessage('user', message)
    chat.setIsLoading(true)

    try {
      const response = await sendResearchMessage({
        message,
        provider: chat.provider(),
        documentIds: selectedDocs(),
      })
      chat.addMessage('assistant', response.response)
    } catch (error) {
      console.error('Error:', error)
      chat.addMessage('assistant', 'Error: Unable to get response')
    } finally {
      chat.setIsLoading(false)
    }
  }

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const providerOptions: { value: ModelProvider; label: string }[] = [
    { value: 'openai', label: 'GPT-4o' },
    { value: 'anthropic', label: 'Claude' },
    { value: 'deepseek', label: 'DeepSeek' },
  ]

  return (
    <div class="h-[calc(100vh-73px)] flex">
      {/* Left Panel - Sources */}
      <div class="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h2 class="font-semibold text-gray-900 mb-3">Sources</h2>
          <button
            onClick={() => fileInputRef?.click()}
            class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            + Upload Document
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            multiple
            onChange={handleUpload}
            class="hidden"
          />
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <Show
            when={documents().length > 0}
            fallback={
              <div class="text-center text-gray-400 text-sm py-8">
                No documents yet.<br />Upload research materials to get started.
              </div>
            }
          >
            <div class="space-y-1">
              <For each={documents()}>
                {(doc) => (
                  <div
                    onClick={() => toggleDoc(doc.id)}
                    class={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedDocs().includes(doc.id)
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div class="flex items-start gap-2">
                      <span class="text-lg">
                        {doc.type === 'pdf' ? '\u{1F4C4}' : '\u{1F4DD}'}
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">
                          {doc.title}
                        </div>
                        <div class="text-xs text-gray-500">
                          {doc.uploadedAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Center Panel - Chat */}
      <div class="flex-1 flex flex-col">
        <div class="flex-1 overflow-y-auto p-4">
          <Show
            when={chat.messages().length > 0}
            fallback={
              <div class="h-full flex items-center justify-center">
                <div class="text-center text-gray-500">
                  <div class="text-3xl mb-3">Deep Research Mode</div>
                  <p class="text-sm">Upload documents and ask questions.</p>
                  <p class="text-sm mt-1">The AI will analyze your sources and provide insights.</p>
                </div>
              </div>
            }
          >
            <div class="space-y-4 max-w-3xl mx-auto">
              <For each={chat.messages()}>
                {(message) => (
                  <div
                    class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      class={`max-w-[85%] px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div class="message-content whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Input */}
        <div class="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSubmit} class="max-w-3xl mx-auto flex gap-3">
            <select
              value={chat.provider()}
              onChange={(e) => chat.setProvider(e.currentTarget.value as ModelProvider)}
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <For each={providerOptions}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </select>

            <input
              type="text"
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask about your documents..."
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={chat.isLoading()}
            />

            <button
              type="submit"
              disabled={chat.isLoading() || !input().trim()}
              class="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {chat.isLoading() ? 'Analyzing...' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Outputs */}
      <div class="w-72 border-l border-gray-200 bg-white flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h2 class="font-semibold text-gray-900">Studio</h2>
          <p class="text-xs text-gray-500 mt-1">Generate outputs from your research</p>
        </div>

        <div class="flex-1 p-4">
          <div class="space-y-2">
            <OutputButton label="Research Report" icon="\u{1F4CA}" disabled />
            <OutputButton label="Comparison Analysis" icon="\u{1F4DD}" disabled />
            <OutputButton label="Knowledge Graph" icon="\u{1F5FA}" disabled />
            <OutputButton label="Data Table" icon="\u{1F4C8}" disabled />
          </div>

          <div class="mt-6 pt-6 border-t border-gray-200">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Generated Content</h3>
            <div class="text-sm text-gray-400 text-center py-4">
              No outputs yet.<br />Start a conversation to generate insights.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const OutputButton: Component<{ label: string; icon: string; disabled?: boolean }> = (
  props
) => {
  return (
    <button
      disabled={props.disabled}
      class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-left hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span class="flex items-center gap-3">
        <span class="text-lg">{props.icon}</span>
        <span class="text-sm font-medium text-gray-700">{props.label}</span>
      </span>
    </button>
  )
}

export default DeepResearch
