import { AlertTriangle, CalendarDays, TrendingDown, UserX } from 'lucide-react'

const TAB_META = [
  {
    id: 'overdue',
    label: 'Overdue Pickups',
    hint: 'Missed scheduled visits',
    icon: AlertTriangle,
    tone: 'rose',
  },
  {
    id: 'scheduled',
    label: 'Scheduled Pickups',
    hint: 'Upcoming confirmed visits',
    icon: CalendarDays,
    tone: 'emerald',
  },
  {
    id: 'atrisk',
    label: 'At Risk Schedules',
    hint: 'Donors delaying repeatedly',
    icon: TrendingDown,
    tone: 'amber',
  },
  {
    id: 'churned',
    label: 'Churned Pickups',
    hint: 'Inactive donor relationships',
    icon: UserX,
    tone: 'slate',
  },
]

const toneClasses = {
  rose: {
    active: 'border-rose-200 bg-rose-50 text-rose-700 shadow-sm',
    icon: 'bg-rose-100 text-rose-600',
    badge: 'bg-rose-100 text-rose-700',
  },
  emerald: {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm',
    icon: 'bg-emerald-100 text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  amber: {
    active: 'border-amber-200 bg-amber-50 text-amber-700 shadow-sm',
    icon: 'bg-amber-100 text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
  },
  slate: {
    active: 'border-slate-200 bg-slate-100 text-slate-700 shadow-sm',
    icon: 'bg-slate-200 text-slate-600',
    badge: 'bg-slate-200 text-slate-700',
  },
}

export default function PickupTabs({ activeTab, counts, onTabChange }) {
  return (
    <div className="grid gap-3 p-3 lg:grid-cols-4">
      {TAB_META.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.id === activeTab
        const tone = toneClasses[tab.tone]

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-3 rounded-[22px] border px-4 py-4 text-left transition ${
              isActive
                ? tone.active
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`rounded-2xl p-2 ${isActive ? tone.icon : 'bg-slate-100 text-slate-500'}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold">{tab.label}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? tone.badge : 'bg-slate-100 text-slate-600'}`}>
                  {counts[tab.id] ?? 0}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{tab.hint}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
