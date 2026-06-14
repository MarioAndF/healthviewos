import './browser-shims'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const assistantShortcutEvent = 'healthviewos:assistant-shortcut'

declare global {
  interface Window {
    __healthviewAssistantShortcutSignal?: number
    __healthviewAssistantSpaceShortcutInstalled?: boolean
  }
}

function isAssistantSpaceShortcut(event: KeyboardEvent) {
  return (
    !event.isComposing &&
    !event.repeat &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar')
  )
}

function installAssistantSpaceShortcut() {
  if (window.__healthviewAssistantSpaceShortcutInstalled) return

  window.__healthviewAssistantSpaceShortcutInstalled = true
  window.addEventListener(
    'keydown',
    (event) => {
      if (!isAssistantSpaceShortcut(event)) return

      event.preventDefault()
      event.stopImmediatePropagation()
      window.__healthviewAssistantShortcutSignal = (window.__healthviewAssistantShortcutSignal ?? 0) + 1
      window.dispatchEvent(
        new CustomEvent(assistantShortcutEvent, {
          detail: { signal: window.__healthviewAssistantShortcutSignal },
        }),
      )
    },
    true,
  )
}

installAssistantSpaceShortcut()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
