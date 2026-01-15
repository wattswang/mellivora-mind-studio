/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import App from './App'
import SimpleChat from './pages/SimpleChat'
import DeepResearch from './pages/DeepResearch'
import './styles/global.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

render(
  () => (
    <Router root={App}>
      <Route path="/" component={SimpleChat} />
      <Route path="/research" component={DeepResearch} />
    </Router>
  ),
  root
)
