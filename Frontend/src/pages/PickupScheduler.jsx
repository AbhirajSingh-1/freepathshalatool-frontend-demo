import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LayoutGrid,
  MapPin,
  Plus,
  Search,
  UserRound,
} from 'lucide-react'
import DonorModal from '../components/DonorModal'
import PickupTabs from '../components/PickupTabs'
import './PickupScheduler.css'
import {
  getSocietiesForSector,
  locations,
  schedulerDonors,
  schedulerPickups,
  schedulerTimeSlots,
} from '../data/mockData'
import { fmtDate } from '../utils/helpers'

const DEFAULT_FORM = {
  date: '2026-04-10',
  timeSlot: schedulerTimeSlots[1],
  notes: '',
}

function formatDonorLabel(donor) {
  return `${donor.name} - ${donor.society}, ${donor.sector}`
}

function getCoverage() {
  const sectors = Object.keys(locations.Gurgaon.sectors)
  const societies = sectors.flatMap((sector) => getSocietiesForSector('Gurgaon', sector))

  return {
    sectors: sectors.length,
    societies: societies.length,
  }
}

const COVERAGE = getCoverage()

function normalizeSections(data = {}) {
  return {
    overdue: Array.isArray(data.overdue) ? data.overdue : [],
    scheduled: Array.isArray(data.scheduled) ? data.scheduled : [],
    atrisk: Array.isArray(data.atrisk) ? data.atrisk : Array.isArray(data.atRisk) ? data.atRisk : [],
    churned: Array.isArray(data.churned) ? data.churned : [],
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="mt-4 h-9 w-72 rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-10 w-10 rounded-2xl bg-slate-200" />
            <div className="mt-4 h-7 w-14 rounded-full bg-slate-200" />
            <div className="mt-3 h-4 w-32 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <div key={index}>
                <div className="mb-2 h-4 w-24 rounded-full bg-slate-200" />
                <div className="h-12 rounded-2xl bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="mt-4 h-24 rounded-[24px] bg-slate-200" />
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-40 rounded-full bg-slate-200" />
          <div className="mt-4 space-y-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-16 rounded-[22px] bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DesktopScheduleTable({ rows, emptyMessage, title, subtitle, variant }) {
  if (!rows.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <p className="text-base font-semibold text-slate-800">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 md:block">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {rows.length} records
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white text-left text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-5 py-4 font-semibold">Donor</th>
              <th className="px-5 py-4 font-semibold">Location</th>
              <th className="px-5 py-4 font-semibold">Schedule</th>
              <th className="px-5 py-4 font-semibold">Owner</th>
              <th className="px-5 py-4 font-semibold">{variant === 'overdue' ? 'Issue' : 'Notes'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{row.donorName}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.address}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-800">{row.society}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.sector}, {row.city}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-800">{fmtDate(row.scheduledDate)}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.timeSlot}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{row.owner}</td>
                <td className="px-5 py-4 text-slate-600">
                  {variant === 'overdue' ? `${row.reason} (${row.attempts} attempts)` : row.notes || 'No special notes'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MobileScheduleCards({ rows, emptyMessage, variant }) {
  if (!rows.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center md:hidden">
        <p className="text-sm font-semibold text-slate-800">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <div key={row.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{row.donorName}</p>
              <p className="mt-1 text-xs text-slate-500">{row.society}, {row.sector}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              variant === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {variant === 'overdue' ? 'Overdue' : 'Scheduled'}
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Slot</p>
              <p className="mt-1 font-medium text-slate-800">{fmtDate(row.scheduledDate)} | {row.timeSlot}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{variant === 'overdue' ? 'Issue' : 'Notes'}</p>
              <p className="mt-1">{variant === 'overdue' ? row.reason : row.notes || 'No special notes'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PickupScheduler({ triggerAddPickup, onAddPickupDone }) {
  const schedulerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [donors, setDonors] = useState([])
  const [sections, setSections] = useState(() => normalizeSections())
  const [selectedDonorId, setSelectedDonorId] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('scheduled')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [showDonorModal, setShowDonorModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const deferredSearchValue = useDeferredValue(searchValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDonors(schedulerDonors)
      setSections(normalizeSections(schedulerPickups))
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!triggerAddPickup) return

    schedulerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onAddPickupDone?.()
  }, [triggerAddPickup, onAddPickupDone])

  useEffect(() => {
    if (!toast) return undefined

    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const filteredDonors = !deferredSearchValue.trim()
    ? donors
    : donors.filter((donor) => {
        const query = deferredSearchValue.toLowerCase()
        return (
          donor.name.toLowerCase().includes(query) ||
          donor.mobile.includes(query) ||
          donor.sector.toLowerCase().includes(query) ||
          donor.society.toLowerCase().includes(query)
        )
      })

  const selectedDonor = donors.find((donor) => donor.id === selectedDonorId) || null
  const counts = {
    overdue: sections.overdue?.length ?? 0,
    scheduled: sections.scheduled?.length ?? 0,
    atrisk: sections.atrisk?.length ?? 0,
    churned: sections.churned?.length ?? 0,
  }

  const statCards = [
    {
      id: 'overdue',
      label: 'Overdue pickups',
      value: counts.overdue,
      tone: 'from-rose-500/15 to-rose-50',
      iconBg: 'bg-rose-100 text-rose-600',
      icon: AlertCircle,
    },
    {
      id: 'scheduled',
      label: 'Scheduled this week',
      value: counts.scheduled,
      tone: 'from-emerald-500/15 to-emerald-50',
      iconBg: 'bg-emerald-100 text-emerald-600',
      icon: CalendarDays,
    },
    {
      id: 'atrisk',
      label: 'At risk donors',
      value: counts.atrisk,
      tone: 'from-amber-500/15 to-amber-50',
      iconBg: 'bg-amber-100 text-amber-600',
      icon: Clock3,
    },
    {
      id: 'churned',
      label: 'Churned accounts',
      value: counts.churned,
      tone: 'from-slate-400/15 to-slate-50',
      iconBg: 'bg-slate-200 text-slate-600',
      icon: LayoutGrid,
    },
  ]

  const selectDonor = (donor) => {
    setSelectedDonorId(donor.id)
    setSearchValue(formatDonorLabel(donor))
    setDropdownOpen(false)
  }

  const handleTabChange = (tabId) => {
    startTransition(() => {
      setActiveTab(tabId)
    })
  }

  const handleScheduleSubmit = (event) => {
    event.preventDefault()
    if (!selectedDonor) return

    setSubmitting(true)

    setTimeout(() => {
      const newSchedule = {
        id: `SPS-${Date.now()}`,
        donorId: selectedDonor.id,
        donorName: selectedDonor.name,
        city: selectedDonor.city,
        sector: selectedDonor.sector,
        society: selectedDonor.society,
        address: selectedDonor.address,
        scheduledDate: form.date,
        timeSlot: form.timeSlot,
        owner: 'Office Desk',
        notes: form.notes.trim() || 'Slot created from scheduler console',
      }

      setSections((current) => ({
        ...normalizeSections(current),
        overdue: (current.overdue || []).filter((pickup) => pickup.donorId !== selectedDonor.id),
        scheduled: [newSchedule, ...(current.scheduled || []).filter((pickup) => pickup.id !== newSchedule.id)],
      }))
      setToast({
        type: 'success',
        message: `Pickup scheduled for ${selectedDonor.name}.`,
      })
      setForm(DEFAULT_FORM)
      setSubmitting(false)
    }, 900)
  }

  const handleSaveDonor = async (donorForm) => {
    await new Promise((resolve) => {
      setTimeout(() => {
        const newDonor = {
          id: `SD${Date.now()}`,
          ...donorForm,
          lastPickup: '2026-04-01',
        }

        setDonors((current) => [newDonor, ...current])
        setSelectedDonorId(newDonor.id)
        setSearchValue(formatDonorLabel(newDonor))
        setDropdownOpen(false)
        setShowDonorModal(false)
        setToast({
          type: 'success',
          message: `${newDonor.name} added and selected.`,
        })
        resolve()
      }, 850)
    })
  }

  const renderSectionContent = () => {
    if (activeTab === 'overdue') {
      return (
        <div className="space-y-4">
          <DesktopScheduleTable
            rows={sections.overdue}
            title="Overdue pickup board"
            subtitle="Missed pickups that need a new office-confirmed slot."
            emptyMessage="No overdue pickups right now."
            variant="overdue"
          />
          <MobileScheduleCards
            rows={sections.overdue}
            emptyMessage="No overdue pickups right now."
            variant="overdue"
          />
        </div>
      )
    }

    if (activeTab === 'scheduled') {
      return (
        <div className="space-y-4">
          <DesktopScheduleTable
            rows={sections.scheduled}
            title="Upcoming pickup queue"
            subtitle="These are the office-confirmed schedules ready for execution."
            emptyMessage="No scheduled pickups yet."
            variant="scheduled"
          />
          <MobileScheduleCards
            rows={sections.scheduled}
            emptyMessage="No scheduled pickups yet."
            variant="scheduled"
          />
        </div>
      )
    }

    if (activeTab === 'atrisk') {
      return (
        <div className="grid gap-4 lg:grid-cols-3">
          {sections.atrisk.map((record) => (
            <article key={record.id} className="rounded-[26px] border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{record.donorName}</p>
                  <p className="mt-1 text-sm text-slate-500">{record.society}, {record.sector}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                  {record.delayCount} delays
                </span>
              </div>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-600">Risk note</p>
                  <p className="mt-1 text-slate-700">{record.riskNote}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-600">Recommended action</p>
                  <p className="mt-1 text-slate-700">{record.suggestedAction}</p>
                </div>
                <p className="text-xs font-medium text-slate-500">Last pickup: {fmtDate(record.lastPickup)}</p>
              </div>
            </article>
          ))}
        </div>
      )
    }

    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.churned.map((record) => (
          <article key={record.id} className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{record.donorName}</p>
                <p className="mt-1 text-sm text-slate-500">{record.society}, {record.sector}</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {record.inactiveDays} days inactive
              </span>
            </div>
            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Why churned</p>
                <p className="mt-1 text-slate-700">{record.reason}</p>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Owner: {record.owner}</span>
                <span>Last pickup: {fmtDate(record.lastPickup)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-body">
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="page-body scheduler-ui">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,237,213,0.95),_rgba(255,255,255,0.96)_48%,_rgba(240,253,244,0.96)_100%)] p-6 shadow-sm">
          <div className="scheduler-hero-grid">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-orange-600">Scheduling Desk</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">
                Pickup Scheduler
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Schedule donor pickups for the field team using donor selection, date, time slot, and notes.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/85 px-4 py-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">City</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Gurgaon</p>
              </div>
              <div className="rounded-[24px] bg-white/85 px-4 py-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sectors</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{COVERAGE.sectors}</p>
              </div>
              <div className="rounded-[24px] bg-white/85 px-4 py-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Societies</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{COVERAGE.societies}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleTabChange(card.id)}
                className={`rounded-[28px] border border-slate-200 bg-gradient-to-br ${card.tone} p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className={`inline-flex rounded-2xl p-3 ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{card.value}</p>
                <p className="mt-2 text-sm font-medium text-slate-600">{card.label}</p>
              </button>
            )
          })}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <form
            ref={schedulerRef}
            onSubmit={handleScheduleSubmit}
            className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-600">New Schedule</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create a new office slot</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Select an existing donor or create a new one, then assign a date and time slot.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowDonorModal(true)}
                  className="scheduler-secondary-button"
                >
                  <Plus className="h-4 w-4" />
                  Add New Donor
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedDonorId}
                  className="scheduler-primary-button"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Pickup'}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="scheduler-label">Donor selection</label>
                <div
                  className="relative mt-2"
                  onBlur={() => {
                    window.setTimeout(() => setDropdownOpen(false), 120)
                  }}
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchValue}
                      onFocus={() => setDropdownOpen(true)}
                      onChange={(event) => {
                        setSearchValue(event.target.value)
                        setSelectedDonorId('')
                        setDropdownOpen(true)
                      }}
                      placeholder="Search donor by name, mobile, sector or society"
                      className="scheduler-input scheduler-input-icon"
                    />
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <select
                    value={selectedDonorId}
                    onChange={(event) => {
                      const donor = donors.find((item) => item.id === event.target.value)
                      if (donor) {
                        selectDonor(donor)
                      } else {
                        setSelectedDonorId('')
                        setSearchValue('')
                      }
                    }}
                    className="scheduler-select mt-3"
                  >
                    <option value="">Select donor</option>
                    {filteredDonors.map((donor) => (
                      <option key={donor.id} value={donor.id}>
                        {donor.name} - {donor.society}, {donor.sector}
                      </option>
                    ))}
                  </select>

                  {dropdownOpen && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-2 shadow-xl">
                      {filteredDonors.length ? (
                        filteredDonors.map((donor) => (
                          <button
                            key={donor.id}
                            type="button"
                            onClick={() => selectDonor(donor)}
                            className="flex w-full items-start justify-between rounded-[18px] px-4 py-3 text-left transition hover:bg-slate-50"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">{donor.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{donor.mobile}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-700">{donor.society}</p>
                              <p className="mt-1 text-xs text-slate-500">{donor.sector}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[18px] bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          No donor found for this search.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedDonor && (
                  <div className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-emerald-600" />
                          <p className="font-semibold text-slate-900">{selectedDonor.name}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{selectedDonor.mobile}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        <span>{selectedDonor.society}, {selectedDonor.sector}</span>
                      </div>
                    </div>
                    {selectedDonor.address && (
                      <p className="mt-3 text-sm text-slate-500">{selectedDonor.address}</p>
                    )}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="scheduler-label">Pickup date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="scheduler-input"
                />
              </label>

              <label className="block">
                <span className="scheduler-label">Time slot</span>
                <select
                  value={form.timeSlot}
                  onChange={(event) => setForm((current) => ({ ...current, timeSlot: event.target.value }))}
                  className="scheduler-select"
                >
                  {schedulerTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="scheduler-label">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Entry instructions, preferred contact timing, or route notes"
                  rows={3}
                  className="scheduler-textarea"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                {selectedDonor
                  ? `Ready to schedule for ${selectedDonor.name}.`
                  : 'Select a donor to enable scheduling.'}
              </div>
              <button
                type="submit"
                disabled={submitting || !selectedDonorId}
                className="scheduler-primary-button"
              >
                {submitting ? 'Scheduling...' : 'Schedule Pickup'}
              </button>
            </div>
          </form>
          <aside className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-semibold text-slate-500">Operations Snapshot</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Scheduling Overview</h2>
              <p className="mt-2 text-sm text-slate-500">
                A quick view of donor selection, city coverage, and queue health.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Selected donor</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {selectedDonor ? selectedDonor.name : 'No donor selected'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedDonor ? `${selectedDonor.society}, ${selectedDonor.sector}` : 'Search and choose an existing donor first.'}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Coverage</p>
                <p className="mt-2 text-base font-semibold text-slate-900">Gurgaon cascading location data</p>
                <p className="mt-1 text-sm text-slate-500">
                  {COVERAGE.sectors} sectors and {COVERAGE.societies} society options power the city to sector to society flow.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Priority</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {counts.overdue ? 'Clear overdue queue first' : 'Build upcoming pickup density'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {counts.overdue
                    ? `${counts.overdue} overdue records still need office intervention.`
                    : 'The queue is healthy. Add more scheduled pickups for route efficiency.'}
                </p>
              </div>

              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Scheduler scope</p>
                <p className="mt-2 text-base font-semibold text-slate-900">No pricing or RST calculations here</p>
                <p className="mt-1 text-sm text-slate-600">
                  This screen is intentionally restricted to scheduling inputs only.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50">
            <PickupTabs activeTab={activeTab} counts={counts} onTabChange={handleTabChange} />
          </div>
          <div className="p-6">
            {renderSectionContent()}
          </div>
        </section>
      </div>

      <DonorModal
        open={showDonorModal}
        onClose={() => setShowDonorModal(false)}
        onSave={handleSaveDonor}
        locations={locations}
      />

      {toast && (
        <div className="fixed right-4 top-20 z-[130] flex max-w-sm items-start gap-3 rounded-[24px] border border-emerald-200 bg-white px-4 py-4 shadow-2xl">
          <div className={`mt-0.5 rounded-full p-1.5 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Success</p>
            <p className="mt-1 text-sm text-slate-500">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
