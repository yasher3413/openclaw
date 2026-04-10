import type { ReactNode } from 'react'

type NavItem = {
  id: string
  label: string
  sublabel: string
}

type SidebarProps = {
  items: NavItem[]
  active: string
  onSelect: (id: string) => void
  isOpen: boolean
  onClose: () => void
  footer?: ReactNode
}

export const Sidebar = ({
  items,
  active,
  onSelect,
  isOpen,
  onClose,
  footer,
}: SidebarProps) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 border-r border-night-700 bg-night-900/95 p-6 transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-night-300">
              OpenClaw
            </p>
            <h1 className="text-xl font-semibold text-white">Yash Gandhi</h1>
            <p className="text-xs text-night-300">
              CS @ Western · AI Eng Intern · Marathoner
            </p>
          </div>
          <button
            className="rounded-md border border-night-600 px-2 py-1 text-xs text-night-200 md:hidden"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <nav className="mt-8 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                active === item.id
                  ? 'border-accent-500/70 bg-accent-500/10 text-white'
                  : 'border-night-700 bg-night-800/60 text-night-200 hover:border-night-500'
              }`}
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-night-400">{item.sublabel}</p>
            </button>
          ))}
        </nav>
        {footer ? <div className="mt-8">{footer}</div> : null}
      </aside>
    </>
  )
}
