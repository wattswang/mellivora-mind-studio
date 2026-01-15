import { type Component, type ParentProps } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { Sparkles, FlaskConical } from 'lucide-solid'

const App: Component<ParentProps> = (props) => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div class="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header class="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            {/* Logo */}
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Sparkles class="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 class="text-lg font-semibold text-gray-900 leading-tight">
                  Mellivora Mind
                </h1>
                <p class="text-xs text-gray-500 leading-tight">基金智能研究平台</p>
              </div>
            </div>

            {/* Navigation */}
            <nav class="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
              <A
                href="/"
                class={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/')
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                简单对话
              </A>
              <A
                href="/research"
                class={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/research')
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <FlaskConical class="w-4 h-4" />
                深度研究
              </A>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="flex-1">
        {props.children}
      </main>
    </div>
  )
}

export default App
