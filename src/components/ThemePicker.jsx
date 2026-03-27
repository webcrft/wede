import { Moon, Sun } from 'lucide-react'
import Logo from './Logo'

export default function ThemePicker({ onSelect }) {
  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center p-4">
      <div className="animate-fade-in text-center w-full max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1e293b] border border-[#334155] mb-6 overflow-hidden">
          <Logo size={40} />
        </div>
        <h1 className="text-2xl font-semibold text-[#f1f5f9] mb-2">Welcome to <span className="font-brand">wede</span></h1>
        <p className="text-[#94a3b8] mb-8">Choose your theme to get started</p>

        <div className="grid grid-cols-2 gap-4 px-2">
          {/* Dark */}
          <button
            onClick={() => onSelect('dark')}
            className="group rounded-xl border-2 border-[#334155] hover:border-[#60a5fa] bg-[#0f172a] p-4 transition-all hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="rounded-lg bg-[#111827] border border-[#1e293b] p-3 mb-3">
              <div className="flex gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#fb7185]" />
                <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                <div className="w-2 h-2 rounded-full bg-[#34d399]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 w-3/4 rounded bg-[#60a5fa]/30" />
                <div className="h-1.5 w-1/2 rounded bg-[#a78bfa]/30" />
                <div className="h-1.5 w-5/6 rounded bg-[#34d399]/20" />
                <div className="h-1.5 w-2/3 rounded bg-[#94a3b8]/20" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[#f1f5f9]">
              <Moon className="w-4 h-4" />
              <span className="font-medium">Midnight</span>
            </div>
          </button>

          {/* Light */}
          <button
            onClick={() => onSelect('light')}
            className="group rounded-xl border-2 border-[#334155] hover:border-[#60a5fa] bg-[#0f172a] p-4 transition-all hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="rounded-lg bg-[#ffffff] border border-[#e2e8f0] p-3 mb-3">
              <div className="flex gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#dc2626]" />
                <div className="w-2 h-2 rounded-full bg-[#d97706]" />
                <div className="w-2 h-2 rounded-full bg-[#16a34a]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 w-3/4 rounded bg-[#3b82f6]/30" />
                <div className="h-1.5 w-1/2 rounded bg-[#7c3aed]/30" />
                <div className="h-1.5 w-5/6 rounded bg-[#16a34a]/20" />
                <div className="h-1.5 w-2/3 rounded bg-[#94a3b8]/30" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[#f1f5f9]">
              <Sun className="w-4 h-4" />
              <span className="font-medium">Daylight</span>
            </div>
          </button>
        </div>

        <p className="text-[#64748b] text-xs mt-6">You can change this later in Settings</p>
      </div>
    </div>
  )
}
