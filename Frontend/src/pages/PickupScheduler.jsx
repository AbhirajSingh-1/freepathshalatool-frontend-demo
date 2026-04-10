// Frontend/src/pages/PickupScheduler.jsx
// ─── Pickup Scheduler — global AppContext only ────────────────────────────────
//
// KEY BEHAVIOURS:
//  1. Donor added here  →  immediately appears in Record Pickup page
//  2. Auto-selects the newly created donor
//  3. Stores donorId (not just name) on the pickup for reliable linking
//  4. Drive mode: only 2 time slots, resets on mode change

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  CalendarDays, Plus, Search, X, ChevronDown, Check,
  Clock, User, MapPin, FileText, CheckCircle, AlertTriangle,
  Filter,
} from 'lucide-react'
import { useApp }      from '../context/AppContext'
import DonorModal      from '../components/DonorModal'
import PickupTabs      from '../components/PickupTabs'
import { fmtDate }     from '../utils/helpers'
import { PICKUP_MODES } from '../data/mockData'

// ── Time slots ────────────────────────────────────────────────────────────────
const ALL_TIME_SLOTS = [
  '9:00 AM – 10:00 AM', '10:00 AM – 11:00 AM',
  '11:00 AM – 12:00 PM', '12:00 PM – 1:00 PM',
  '2:00 PM – 3:00 PM',  '3:00 PM – 4:00 PM',
  '4:00 PM – 5:00 PM',  '5:00 PM – 6:00 PM',
]
const DRIVE_TIME_SLOTS = ['9:00 AM – 12:00 PM', '2:00 PM – 5:00 PM']

// ── Date filter helpers ───────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().slice(0, 10)

function getPresetRange(p) {
  const n = new Date()
  if (p === 'today')     return { from: fmt(n), to: fmt(n) }
  if (p === 'yesterday') { const d = new Date(n); d.setDate(d.getDate() - 1); return { from: fmt(d), to: fmt(d) } }
  if (p === 'tomorrow')  { const d = new Date(n); d.setDate(d.getDate() + 1); return { from: fmt(d), to: fmt(d) } }
  return { from: '', to: '' }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 24, zIndex: 200,
      background: 'var(--secondary)', color: 'white',
      padding: '12px 20px', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.25s ease',
      fontSize: 13.5, fontWeight: 600,
    }}>
      <CheckCircle size={16} />{message}
    </div>
  )
}

// ── Donor dropdown ────────────────────────────────────────────────────────────
function DonorDropdown({ donors, value, onChange, onAddNew }) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef(null)

  const selected = useMemo(() => donors.find(d => d.id === value), [donors, value])

  const filtered = useMemo(() =>
    donors.filter(d =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.mobile.includes(query) ||
      (d.society || '').toLowerCase().includes(query.toLowerCase())
    ), [donors, query])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = (d) => { onChange(d.id); setOpen(false); setQuery('') }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
          boxShadow: open ? '0 0 0 3px rgba(232,82,26,0.1)' : 'none',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          background: 'var(--surface)', transition: 'all 0.15s',
        }}
      >
        <User size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
          {selected ? (
            <span style={{ fontWeight: 600 }}>
              {selected.name}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
                {selected.society}, {selected.city}
              </span>
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>Search or select a donor…</span>
          )}
        </div>
        {selected
          ? <X size={14} color="var(--text-muted)" onClick={e => { e.stopPropagation(); onChange('') }} />
          : <ChevronDown size={14} color="var(--text-muted)" />}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 60, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Type name, mobile, or society…"
              style={{ paddingLeft: 28, width: '100%', fontSize: 13, border: 'none', outline: 'none', background: 'transparent' }} />
          </div>
          <button onClick={() => { setOpen(false); onAddNew() }}
            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border-light)', background: 'var(--primary-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
            <Plus size={14} /> Add New Donor
          </button>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No donors found.{' '}
                <button onClick={() => { setOpen(false); onAddNew() }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>Add new?</button>
              </div>
            ) : filtered.map(d => (
              <div key={d.id} onClick={() => select(d)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', background: d.id === value ? 'var(--primary-light)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s' }}
                onMouseEnter={e => { if (d.id !== value) e.currentTarget.style.background = 'var(--bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = d.id === value ? 'var(--primary-light)' : 'transparent' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14, flexShrink: 0 }}>
                  {d.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{d.mobile} · {d.society}, {d.city}</div>
                </div>
                {d.id === value && <Check size={14} color="var(--primary)" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function PickupScheduler() {
  const {
    donors,
    addDonor,
    schedulePickup,
    schedulerTabData,
    dashboardStats,
  } = useApp()

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedDonorId, setSelectedDonorId] = useState('')
  const [date,       setDate]       = useState('')
  const [timeSlot,   setTimeSlot]   = useState('')
  const [pickupMode, setPickupMode] = useState('Individual')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState('')

  // ── Tab / filter state ────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]  = useState('scheduled')
  const [datePreset,   setDatePreset] = useState('all')
  const [dateFrom,     setDateFrom]   = useState('')
  const [dateTo,       setDateTo]     = useState('')
  const [sectorFilter, setSector]     = useState('')
  const [showFilters,  setShowFilters] = useState(false)

  // ── Modal / Toast ─────────────────────────────────────────────────────────
  const [showDonorModal, setDonorModal] = useState(false)
  const [toast,          setToast]      = useState(null)

  // Active donors (not Lost) — from GLOBAL context
  const activeDonors = useMemo(
    () => donors.filter(d => d.status !== 'Lost'),
    [donors]
  )

  const timeSlots = pickupMode === 'Drive' ? DRIVE_TIME_SLOTS : ALL_TIME_SLOTS

  // Sectors from live tab data
  const allSectors = useMemo(() => {
    const s = new Set()
    ;[...schedulerTabData.scheduled, ...schedulerTabData.overdue].forEach(p => { if (p.sector) s.add(p.sector) })
    return [...s].sort()
  }, [schedulerTabData])

  // Apply date preset
  const applyPreset = (p) => {
    setDatePreset(p)
    if (p !== 'custom') { const { from, to } = getPresetRange(p); setDateFrom(from); setDateTo(to) }
  }

  // Filter the live tab data
  const filteredTabData = useMemo(() => {
    const inRange  = (ds) => { if (!ds) return true; if (dateFrom && ds < dateFrom) return false; if (dateTo && ds > dateTo) return false; return true }
    const inSector = (row) => !sectorFilter || row.sector === sectorFilter
    const f        = (rows, dk = 'scheduledDate') => rows.filter(r => inRange(r[dk]) && inSector(r))
    return { overdue: f(schedulerTabData.overdue), scheduled: f(schedulerTabData.scheduled), atRisk: f(schedulerTabData.atRisk, 'lastPickup'), churned: f(schedulerTabData.churned, 'lastPickup') }
  }, [schedulerTabData, dateFrom, dateTo, sectorFilter])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleModeChange = (mode) => { setPickupMode(mode); setTimeSlot('') }

  /**
   * Add a donor from the modal, then AUTO-SELECT them in the form.
   * Because addDonor updates AppContext.donors, the new donor will
   * simultaneously appear in the Pickups page donor dropdown.
   */
  const handleAddDonor = async (newDonorData) => {
    const newDonor = await addDonor(newDonorData)   // returns object with generated id
    setSelectedDonorId(newDonor.id)                  // ← auto-select immediately
    setDonorModal(false)
    setToast(`✓ ${newDonor.name} added and selected`)
  }

  const handleSchedule = async () => {
    if (!selectedDonorId) { setFormError('Please select a donor');     return }
    if (!date)            { setFormError('Please pick a pickup date'); return }
    if (!timeSlot)        { setFormError('Please select a time slot'); return }
    setFormError('')
    setSaving(true)

    const donor = activeDonors.find(d => d.id === selectedDonorId)
    await schedulePickup({
      donorId:   donor.id,          // ← stored for reliable cross-page linking
      donorName: donor.name,        // ← snapshot for display without join
      mobile:    donor.mobile   || '',
      society:   donor.society  || '',
      sector:    donor.sector   || '',
      city:      donor.city     || '',
      date,
      timeSlot,
      pickupMode,
      notes,
    })

    setActiveTab('scheduled')
    setSelectedDonorId(''); setDate(''); setTimeSlot(''); setNotes('')
    setSaving(false)
    setToast('Pickup scheduled successfully!')
  }

  const donorDetails = useMemo(
    () => activeDonors.find(d => d.id === selectedDonorId),
    [activeDonors, selectedDonorId]
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-body">

      {/* ── KPIs ── */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Scheduled', val: dashboardStats.upcomingPickups,  color: 'blue' },
          { label: 'Overdue',   val: dashboardStats.overduePickups,   color: 'red' },
          { label: 'At Risk',   val: filteredTabData.atRisk.length,   color: 'yellow' },
          { label: 'Churned',   val: filteredTabData.churned.length,  color: 'orange' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── 2-col layout ── */}
      <div className="two-col" style={{ alignItems: 'start', marginBottom: 28 }}>

        {/* Schedule Form */}
        <div className="card">
          <div className="card-header">
            <CalendarDays size={18} color="var(--primary)" />
            <div className="card-title">Schedule a Pickup</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Donor */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Donor <span className="required">*</span></label>
                <DonorDropdown
                  donors={activeDonors}
                  value={selectedDonorId}
                  onChange={id => { setSelectedDonorId(id); setFormError('') }}
                  onAddNew={() => setDonorModal(true)}
                />
              </div>

              {donorDetails && (
                <div style={{ padding: '10px 14px', background: 'var(--secondary-light)', borderRadius: 8, fontSize: 12.5, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={13} />
                  {[donorDetails.society, donorDetails.sector, donorDetails.city].filter(Boolean).join(', ')}
                </div>
              )}

              {/* Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Pickup Date <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <CalendarDays size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="date" value={date} min={new Date().toISOString().slice(0, 10)}
                    onChange={e => { setDate(e.target.value); setFormError('') }} style={{ paddingLeft: 36 }} />
                </div>
              </div>

              {/* Mode */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Pickup Mode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PICKUP_MODES.map(mode => (
                    <button key={mode} type="button" onClick={() => handleModeChange(mode)} style={{
                      flex: 1, padding: '7px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      border: `1.5px solid ${pickupMode === mode ? 'var(--primary)' : 'var(--border)'}`,
                      background: pickupMode === mode ? 'var(--primary-light)' : 'transparent',
                      color: pickupMode === mode ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: pickupMode === mode ? 700 : 400,
                    }}>
                      {mode}
                    </button>
                  ))}
                </div>
                {pickupMode === 'Drive' && (
                  <div style={{ fontSize: 11.5, color: 'var(--info)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={11} /> Drive: community slots only
                  </div>
                )}
              </div>

              {/* Time Slot */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>
                  Time Slot <span className="required">*</span>
                  {pickupMode === 'Drive' && (
                    <span style={{ fontSize: 11, color: 'var(--info)', fontWeight: 400, marginLeft: 6 }}>(Drive slots)</span>
                  )}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {timeSlots.map(slot => (
                    <button key={slot} type="button" onClick={() => { setTimeSlot(slot); setFormError('') }} style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      border: `1.5px solid ${timeSlot === slot ? 'var(--primary)' : 'var(--border)'}`,
                      background: timeSlot === slot ? 'var(--primary-light)' : 'transparent',
                      color: timeSlot === slot ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: timeSlot === slot ? 700 : 400, transition: 'all 0.12s',
                    }}>
                      <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Notes <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions for the pickup team…" style={{ minHeight: 68 }} />
              </div>

              {formError && (
                <div style={{ fontSize: 12.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠ {formError}
                </div>
              )}

              <button className="btn btn-primary" onClick={handleSchedule} disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                {saving
                  ? <><span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} /> Scheduling…</>
                  : <><Plus size={15} /> Schedule Pickup</>}
              </button>
            </div>
          </div>
        </div>

        {/* How-to + quick add */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-header">
              <FileText size={16} color="var(--info)" />
              <div className="card-title">How to Use</div>
            </div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 8 }}>1. <strong>Search</strong> for a donor or click <span style={{ color: 'var(--primary)', fontWeight: 700 }}>+ Add New Donor</span>.</p>
              <p style={{ marginBottom: 8 }}>2. Pick a <strong>date</strong>, <strong>mode</strong>, and <strong>time slot</strong>.</p>
              <p style={{ marginBottom: 8 }}>3. <strong>Individual</strong> = all slots. <strong>Drive</strong> = 9–12 AM and 2–5 PM only.</p>
              <p style={{ marginBottom: 8 }}>4. Any donor added here is instantly available in <strong>Record Pickup</strong>.</p>
              <p>5. Hit <strong>Schedule Pickup</strong> → appears under <em>Scheduled</em> immediately.</p>
            </div>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => setDonorModal(true)}>
            <Plus size={15} /> Add New Donor
          </button>
        </div>
      </div>

      {/* ── Pickup Overview with Filters ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title">Pickup Overview</div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${showFilters ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setShowFilters(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Filter size={13} />
              {(sectorFilter || (datePreset !== 'all' && datePreset !== ''))
                ? <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {[sectorFilter, datePreset !== 'all' && datePreset !== '' ? 'd' : ''].filter(Boolean).length}
                  </span>
                : 'Filters'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Date presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['today','Today'],['yesterday','Yesterday'],['tomorrow','Tomorrow'],['all','All'],['custom','Custom']].map(([v, l]) => (
                  <button key={v} className={`btn btn-sm ${datePreset === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => applyPreset(v)} style={{ fontSize: 12 }}>{l}</button>
                ))}
                {datePreset === 'custom' && (
                  <>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 140, fontSize: 12 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ width: 140, fontSize: 12 }} />
                  </>
                )}
              </div>
            </div>
            {/* Sector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sector</label>
              <select value={sectorFilter} onChange={e => setSector(e.target.value)} style={{ minWidth: 160, fontSize: 13 }}>
                <option value="">All Sectors</option>
                {allSectors.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {(sectorFilter || datePreset !== 'all') && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSector(''); applyPreset('all') }}>
                <X size={11} /> Clear
              </button>
            )}
          </div>
        )}

        <div className="card-body">
          <PickupTabs activeTab={activeTab} onTabChange={setActiveTab} data={filteredTabData} loading={false} />
        </div>
      </div>

      {showDonorModal && <DonorModal onClose={() => setDonorModal(false)} onAdd={handleAddDonor} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}