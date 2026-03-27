import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  GitBranch, Plus, Minus, RefreshCw,
  Check, ChevronDown, ChevronRight, RotateCcw,
  Copy, GitCommit, Eye, Tag
} from 'lucide-react'

/* ═══════════════════════════════════
   Commit Context Menu
   ═══════════════════════════════════ */

function CommitMenu({ x, y, commit, onClose, onAction }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Clamp to viewport
  const style = { left: Math.min(x, window.innerWidth - 200), top: Math.min(y, window.innerHeight - 240) }

  return (
    <div ref={ref} className="fixed z-50 bg-bg-primary border border-border rounded-lg shadow-xl shadow-shadow py-1 min-w-[180px] animate-fade-in" style={style}>
      <div className="px-3 py-1.5 border-b border-border">
        <div className="text-[11px] font-mono text-accent">{commit.short}</div>
        <div className="text-[11px] text-text-muted truncate max-w-[200px]">{commit.message}</div>
      </div>
      {[
        { label: 'Checkout commit', icon: GitCommit, action: () => onAction('checkout', commit.hash) },
        { label: 'Copy commit hash', icon: Copy, action: () => { navigator.clipboard.writeText(commit.hash); onClose() } },
        { label: 'Copy short hash', icon: Copy, action: () => { navigator.clipboard.writeText(commit.short); onClose() } },
        { label: 'Copy message', icon: Copy, action: () => { navigator.clipboard.writeText(commit.message); onClose() } },
      ].map((item, i) => (
        <button key={i} onClick={item.action}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-left">
          <item.icon className="w-3.5 h-3.5 text-text-muted" />
          {item.label}
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════
   Git Graph
   ═══════════════════════════════════ */

const COLORS = [
  '#60a5fa', '#34d399', '#a78bfa', '#fb923c',
  '#22d3ee', '#fbbf24', '#fb7185', '#f472b6',
]

function buildGraph(entries) {
  if (!entries?.length) return []
  const lanes = []
  const rows = []

  for (const entry of entries) {
    let lane = lanes.indexOf(entry.hash)
    if (lane === -1) {
      lane = lanes.indexOf(null)
      if (lane === -1) { lane = lanes.length; lanes.push(null) }
      lanes[lane] = entry.hash
    }
    const activeBefore = lanes.slice()
    const parentLanes = []
    const mergeLines = []

    for (let i = 0; i < entry.parents.length; i++) {
      const p = entry.parents[i]
      if (i === 0) {
        lanes[lane] = p
        parentLanes.push(lane)
      } else {
        let pl = lanes.indexOf(p)
        if (pl === -1) {
          pl = lanes.indexOf(null)
          if (pl === -1) { pl = lanes.length; lanes.push(null) }
          lanes[pl] = p
        }
        parentLanes.push(pl)
        mergeLines.push({ from: lane, to: pl })
      }
    }
    if (entry.parents.length === 0) lanes[lane] = null
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) lanes.pop()

    rows.push({ ...entry, lane, parentLanes, mergeLines,
      laneCount: Math.max(lanes.length, activeBefore.length, 1), activeLanes: activeBefore })
  }
  return rows
}

function GraphRow({ row, nextRow, isLast, onContextMenu, selected }) {
  const LANE_W = 14, ROW_H = 32, DOT_R = 4
  const laneCount = Math.max(row.laneCount, nextRow?.laneCount || 0, 1)
  const svgW = laneCount * LANE_W + 8
  const cx = 4 + row.lane * LANE_W + LANE_W / 2
  const cy = ROW_H / 2
  const color = COLORS[row.lane % COLORS.length]
  const isMerge = row.parents.length > 1

  const lines = []
  for (let i = 0; i < laneCount; i++) {
    const laneActive = row.activeLanes[i] != null
    const isMyLane = i === row.lane
    if (laneActive || isMyLane) {
      const x = 4 + i * LANE_W + LANE_W / 2
      const lColor = COLORS[i % COLORS.length]
      if (laneActive && !isMyLane) {
        lines.push(<line key={`p-${i}`} x1={x} y1={0} x2={x} y2={ROW_H} stroke={lColor} strokeWidth={2} opacity={0.5} />)
      } else if (isMyLane) {
        lines.push(<line key={`t-${i}`} x1={x} y1={0} x2={x} y2={cy} stroke={lColor} strokeWidth={2} opacity={0.5} />)
        if (row.parents.length > 0 && !isLast) {
          lines.push(<line key={`b-${i}`} x1={x} y1={cy} x2={x} y2={ROW_H} stroke={lColor} strokeWidth={2} opacity={0.5} />)
        }
      }
    }
  }

  const curves = row.mergeLines.map(({ from, to }, i) => {
    const fx = 4 + from * LANE_W + LANE_W / 2
    const tx = 4 + to * LANE_W + LANE_W / 2
    return <path key={`m-${i}`} d={`M${fx},${cy} C${fx},${cy + 12} ${tx},${cy + 12} ${tx},${ROW_H}`}
      stroke={COLORS[to % COLORS.length]} strokeWidth={2} fill="none" opacity={0.5} />
  })

  const refs = row.refs ? row.refs.split(', ').filter(Boolean) : []

  return (
    <div className={`flex items-stretch transition-colors group cursor-pointer ${selected ? 'bg-accent/10' : 'hover:bg-bg-hover/50'}`}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, row) }}>
      <svg width={svgW} height={ROW_H} className="shrink-0">
        {lines}{curves}
        <circle cx={cx} cy={cy} r={DOT_R + 2} fill="var(--c-bg-secondary)" />
        {isMerge ? (
          <><circle cx={cx} cy={cy} r={DOT_R + 0.5} fill={color} /><circle cx={cx} cy={cy} r={DOT_R - 2} fill="var(--c-bg-secondary)" /></>
        ) : (
          <circle cx={cx} cy={cy} r={DOT_R} fill={color} />
        )}
      </svg>

      <div className="flex-1 min-w-0 flex flex-col justify-center py-1 pr-2 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {refs.map((ref) => (
            <span key={ref} className={`shrink-0 px-1.5 py-px rounded-sm text-[9px] font-bold leading-tight ${
              ref.includes('HEAD') ? 'bg-green/15 text-green'
                : ref.startsWith('origin/') ? 'bg-peach/15 text-peach'
                : 'bg-accent/15 text-accent'
            }`}>{ref}</span>
          ))}
          <span className="text-[12px] text-text-primary truncate leading-tight">{row.message}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-px overflow-hidden">
          <span className="font-mono text-[10px] text-accent/60 shrink-0">{row.short}</span>
          <span className="text-[10px] text-text-muted truncate">{row.author}</span>
          <span className="text-[10px] text-text-muted shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{row.date}</span>
        </div>
      </div>
    </div>
  )
}

function GitGraph({ entries, onCommitAction }) {
  const rows = useMemo(() => buildGraph(entries), [entries])
  const [menu, setMenu] = useState(null)

  const handleCtx = (e, row) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, commit: row })
  }

  const handleAction = async (action, hash) => {
    setMenu(null)
    onCommitAction?.(action, hash)
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-text-muted">
        <RotateCcw className="w-6 h-6 mb-2 opacity-30" />
        <span className="text-xs">No commits yet</span>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto overflow-x-hidden">
      {rows.map((row, i) => (
        <GraphRow key={row.hash} row={row} nextRow={rows[i + 1]} isLast={i === rows.length - 1}
          onContextMenu={handleCtx} selected={menu?.commit?.hash === row.hash} />
      ))}
      {menu && <CommitMenu x={menu.x} y={menu.y} commit={menu.commit} onClose={() => setMenu(null)} onAction={handleAction} />}
    </div>
  )
}

/* ═══════════════════════════════════
   File Change Row
   ═══════════════════════════════════ */

const STATUS_STYLE = {
  modified: { color: 'text-yellow', bg: 'bg-yellow/10', label: 'M' },
  added:    { color: 'text-green',  bg: 'bg-green/10',  label: 'A' },
  deleted:  { color: 'text-red',    bg: 'bg-red/10',    label: 'D' },
  untracked:{ color: 'text-green',  bg: 'bg-green/10',  label: 'U' },
  copied:   { color: 'text-green',  bg: 'bg-green/10',  label: 'C' },
  renamed:  { color: 'text-accent', bg: 'bg-accent/10', label: 'R' },
}

function FileRow({ file, action, onAction }) {
  const s = STATUS_STYLE[file.status] || STATUS_STYLE.modified
  const filename = file.path.split('/').pop()
  const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : ''

  return (
    <div className="flex items-center px-2 py-1 hover:bg-bg-hover transition-colors group text-[12px] overflow-hidden">
      <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${s.color} ${s.bg} shrink-0`}>
        {s.label}
      </span>
      <div className="flex-1 min-w-0 ml-2 flex items-baseline gap-1 overflow-hidden">
        <span className="text-text-primary truncate font-medium">{filename}</span>
        {dir && <span className="text-text-muted text-[10px] truncate">{dir}</span>}
      </div>
      <button onClick={() => onAction(file.path)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-active text-text-muted hover:text-text-primary transition-all shrink-0"
        title={action === 'stage' ? 'Stage' : 'Unstage'}>
        {action === 'stage' ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      </button>
    </div>
  )
}

/* ═══════════════════════════════════
   Section Header
   ═══════════════════════════════════ */

function SectionHeader({ label, count, color, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${color} hover:bg-bg-hover transition-colors`}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
        <span className="font-normal opacity-70">({count})</span>
      </button>
      {open && children}
    </div>
  )
}

/* ═══════════════════════════════════
   Main GitPanel
   ═══════════════════════════════════ */

export default function GitPanel({ authFetch, visible, isMobile }) {
  const [status, setStatus] = useState({ branch: '', files: [], isRepo: true })
  const [log, setLog] = useState([])
  const [branches, setBranches] = useState([])
  const [commitMsg, setCommitMsg] = useState('')
  const [section, setSection] = useState('changes')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!visible) return
    try {
      const [sRes, lRes, bRes] = await Promise.all([
        authFetch('/api/git/status'), authFetch('/api/git/log'), authFetch('/api/git/branches'),
      ])
      const [sData, lData, bData] = await Promise.all([sRes.json(), lRes.json(), bRes.json()])
      setStatus(sData); setLog(lData.entries || []); setBranches(bData.branches || [])
    } catch {}
  }, [authFetch, visible])

  useEffect(() => { refresh() }, [refresh])

  const handleStage = async (path) => {
    await authFetch('/api/git/stage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
    refresh()
  }
  const handleUnstage = async (path) => {
    await authFetch('/api/git/unstage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
    refresh()
  }
  const handleStageAll = async () => {
    await authFetch('/api/git/stage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: '.' }) })
    refresh()
  }
  const handleUnstageAll = async () => {
    await authFetch('/api/git/unstage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: '.' }) })
    refresh()
  }
  const handleCommit = async (e) => {
    e.preventDefault()
    if (!commitMsg.trim()) return
    setLoading(true)
    await authFetch('/api/git/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: commitMsg }) })
    setCommitMsg(''); setLoading(false); refresh()
  }
  const handleCheckout = async (branch) => {
    await authFetch('/api/git/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch }) })
    refresh()
  }
  const handleCommitAction = async (action, hash) => {
    if (action === 'checkout') {
      await authFetch('/api/git/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: hash }) })
      refresh()
    }
  }

  if (!visible) return null

  const staged = status.files?.filter((f) => f.staged) || []
  const unstaged = status.files?.filter((f) => !f.staged) || []

  if (!status.isRepo && status.isRepo !== undefined) {
    return (
      <div className="h-full flex flex-col bg-bg-secondary">
        <div className="flex items-center px-3 py-2 border-b border-border">
          <GitBranch className="w-3.5 h-3.5 text-accent mr-1.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Source Control</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-bg-hover flex items-center justify-center mx-auto mb-3">
              <GitBranch className="w-6 h-6 text-text-muted opacity-50" />
            </div>
            <p className="text-sm text-text-secondary">Not a git repository</p>
            <p className="text-xs text-text-muted mt-1">Run <code className="text-accent bg-accent/10 px-1 rounded">git init</code> in the terminal</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <GitBranch className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted shrink-0">Source Control</span>
          {status.branch && (
            <span className="text-[11px] text-accent font-mono bg-accent/10 px-1.5 py-0.5 rounded truncate ml-1">
              {status.branch}
            </span>
          )}
        </div>
        <button onClick={refresh} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {[
          { key: 'changes', label: 'Changes', badge: staged.length + unstaged.length },
          { key: 'graph', label: 'Graph' },
          { key: 'branches', label: 'Branches' },
        ].map(({ key, label, badge }) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors relative ${section === key ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}>
            {label}
            {badge > 0 && <span className={`ml-1 px-1 rounded-full text-[9px] font-bold ${section === key ? 'bg-accent/20 text-accent' : 'bg-bg-hover text-text-muted'}`}>{badge}</span>}
            {section === key && <div className="absolute bottom-0 inset-x-3 h-0.5 bg-accent rounded-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {section === 'changes' && (
          <div>
            <form onSubmit={handleCommit} className="p-2 border-b border-border">
              <textarea value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit message..." rows={2}
                className="w-full bg-bg-input border border-border rounded-lg px-2.5 py-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none leading-relaxed" />
              <div className="flex gap-1.5 mt-1.5">
                {unstaged.length > 0 && (
                  <button type="button" onClick={handleStageAll}
                    className="flex-1 text-[11px] py-1.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-medium">
                    Stage All
                  </button>
                )}
                {staged.length > 0 && unstaged.length === 0 && (
                  <button type="button" onClick={handleUnstageAll}
                    className="flex-1 text-[11px] py-1.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-medium">
                    Unstage All
                  </button>
                )}
                <button type="submit" disabled={!commitMsg.trim() || loading || staged.length === 0}
                  className="flex-1 flex items-center justify-center gap-1 bg-accent text-white text-[11px] py-1.5 rounded-md hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-semibold">
                  <Check className="w-3 h-3" /> Commit{staged.length > 0 ? ` (${staged.length})` : ''}
                </button>
              </div>
            </form>

            {staged.length > 0 && (
              <SectionHeader label="Staged" count={staged.length} color="text-green">
                {staged.map((f) => <FileRow key={f.path} file={f} action="unstage" onAction={handleUnstage} />)}
              </SectionHeader>
            )}
            {unstaged.length > 0 && (
              <SectionHeader label="Changes" count={unstaged.length} color="text-yellow">
                {unstaged.map((f) => <FileRow key={f.path} file={f} action="stage" onAction={handleStage} />)}
              </SectionHeader>
            )}
            {staged.length === 0 && unstaged.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center mb-2">
                  <Check className="w-5 h-5 text-green" />
                </div>
                <span className="text-xs">Working tree clean</span>
              </div>
            )}
          </div>
        )}

        {section === 'graph' && <GitGraph entries={log} onCommitAction={handleCommitAction} />}

        {section === 'branches' && (
          <div className="py-1">
            {branches.map((b) => (
              <button key={b.name} onClick={() => !b.current && handleCheckout(b.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-bg-hover transition-colors text-left overflow-hidden ${b.current ? 'text-text-primary' : 'text-text-secondary'}`}>
                <GitBranch className={`w-3.5 h-3.5 shrink-0 ${b.current ? 'text-green' : 'text-text-muted'}`} />
                <span className="truncate font-mono">{b.name}</span>
                {b.current && <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-green" />}
              </button>
            ))}
            {branches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <GitBranch className="w-6 h-6 mb-2 opacity-30" />
                <span className="text-xs">No branches</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
