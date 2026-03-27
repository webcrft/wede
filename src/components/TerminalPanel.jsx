import { useState, useCallback, useEffect, useRef, createRef } from 'react'
import { Plus, X, TerminalSquare, Maximize2, Minimize2 } from 'lucide-react'
import Terminal from './Terminal'
import TerminalToolbar from './TerminalToolbar'
import { useTheme } from '../hooks/useTheme'

function loadTerminals() {
  try {
    const saved = localStorage.getItem('wede_terminals')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return null
}

function saveTerminals(terminals, activeId) {
  try {
    localStorage.setItem('wede_terminals', JSON.stringify(terminals))
    localStorage.setItem('wede_terminal_active', String(activeId))
  } catch {}
}

let nextId = (() => {
  const saved = loadTerminals()
  if (saved) return Math.max(...saved.map(t => t.id)) + 1
  return 1
})()

export default function TerminalPanel({ token, authFetch, visible, isFullscreen, onToggleFullscreen, isMobile }) {
  const { terminalTheme } = useTheme()
  const [terminals, setTerminals] = useState(() => {
    const saved = loadTerminals()
    return saved || [{ id: nextId++, name: 'Terminal 1' }]
  })
  const [activeId, setActiveId] = useState(() => {
    const saved = localStorage.getItem('wede_terminal_active')
    return saved ? Number(saved) : terminals[0]?.id || 1
  })
  const reconciledRef = useRef(false)
  const termRefs = useRef({})

  // On mount, check which sessions are still alive on the server and reconcile
  useEffect(() => {
    if (reconciledRef.current || !authFetch) return
    reconciledRef.current = true

    authFetch('/api/terminal/sessions')
      .then(res => res.json())
      .then(data => {
        const serverSessions = new Set(data.sessions || [])
        if (serverSessions.size === 0) return

        setTerminals(prev => {
          const alive = prev.filter(t => serverSessions.has(`term-${t.id}`))
          const knownIds = new Set(prev.map(t => `term-${t.id}`))
          const orphans = [...serverSessions]
            .filter(s => s.startsWith('term-') && !knownIds.has(s))
            .map(s => {
              const id = Number(s.replace('term-', ''))
              if (id > nextId) nextId = id + 1
              return { id, name: `Terminal ${id}` }
            })

          if (alive.length > 0 || orphans.length > 0) {
            return [...alive, ...orphans]
          }
          return prev
        })
      })
      .catch(() => {})
  }, [authFetch])

  // Persist on change
  useEffect(() => {
    saveTerminals(terminals, activeId)
  }, [terminals, activeId])

  const addTerminal = useCallback(() => {
    const id = nextId++
    setTerminals((prev) => [...prev, { id, name: `Terminal ${id}` }])
    setActiveId(id)
  }, [])

  const closeTerminal = useCallback((id) => {
    setTerminals((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (next.length === 0) {
        const newId = nextId++
        next.push({ id: newId, name: `Terminal ${newId}` })
        setActiveId(newId)
      } else if (activeId === id) {
        setActiveId(next[next.length - 1].id)
      }
      return next
    })
  }, [activeId])

  const handleToolbarSend = useCallback((data) => {
    const ref = termRefs.current[activeId]
    if (ref) ref.send(data)
  }, [activeId])

  if (!visible) return null

  return (
    <div className="h-full flex flex-col bg-bg-tertiary">
      {/* Terminal tab bar */}
      <div className="flex items-center border-b border-border compact-touch">
        <div className="flex items-center flex-1 overflow-x-auto">
          <div className="flex items-center px-2 py-1 gap-0.5">
            <TerminalSquare className="w-3.5 h-3.5 text-text-muted mr-1.5 shrink-0" />
          </div>
          {terminals.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-border shrink-0 transition-colors ${
                activeId === t.id
                  ? 'text-text-primary bg-bg-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <span>{t.name}</span>
              {terminals.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); closeTerminal(t.id) }}
                  className="p-0.5 rounded hover:bg-bg-active text-text-muted hover:text-text-primary"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={addTerminal}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded mx-1 shrink-0"
            title="New Terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 mr-1 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Terminal instances */}
      <div className="flex-1 min-h-0">
        {terminals.map((t) => (
          <Terminal
            key={t.id}
            ref={(r) => { if (r) termRefs.current[t.id] = r; else delete termRefs.current[t.id] }}
            token={token}
            sessionId={`term-${t.id}`}
            visible={activeId === t.id && visible}
            terminalTheme={terminalTheme}
          />
        ))}
      </div>

      {/* Mobile special keys toolbar */}
      {isMobile && <TerminalToolbar onSend={handleToolbarSend} />}
    </div>
  )
}
