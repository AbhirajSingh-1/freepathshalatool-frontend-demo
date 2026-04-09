import { useState, useEffect, useRef } from 'react'
import {
  CalendarDays, Plus, Search, X, ChevronDown, Check,
  Clock, User, MapPin, FileText, CheckCircle,
} from 'lucide-react'
import { fetchDonors, createDonor } from '../services/api'
import { CITIES, CITY_SECTORS } from '../data/mockData'
import { GURGAON_LOCATIONS, TIME_SLOTS, schedulerPickups } from '../data/schedulerData'
import DonorModal from '../components/DonorModal'
import PickupTabs from '../components/PickupTabs'
import { fmtDate } from '../utils/helpers'

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 24, zIndex: 200,
      background: 'var(--secondary)', color: 'white',
      padding: '12px 20px', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: 'var(--shadow-lg)',
      animation: 'slideUp 0.25s ease',
      fontSize: 13.5, fontWeight: 600,
    }}>
      <CheckCircle size={16} />
      {message}
    </div>
  )
}

// ── Searchable Donor Dropdown ─────────────────────────────────────────────────
function DonorDropdown({ donors, value, onChange, onAddNew }) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const ref                 = useRef(null)

  const selected = donors.find(d => d.id === value)

  const filtered = donors.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.mobile.includes(query) ||
    (d.society || '').toLowerCase().includes(query.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (d) => { onChange(d.id); setOpen(false); setQuery('') }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', border: '1.5px solid var(--border)',
          borderColor: open ? 'var(--primary)' : 'var(--border)',
          boxShadow: open ? '0 0 0 3px rgba(232,82,26,0.1)' : 'none',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          background: 'var(--surface)', transition: 'all 0.15s',
        }}
      >
        <User size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
          {selected ? (
            <span style={{ fontWeight: 600 }}>{selected.name}
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
          : <ChevronDown size={14} color="var(--text-muted)" />
        }
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
          zIndex: 60, overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type name, mobile, or society…"
              style={{ paddingLeft: 28, width: '100%', fontSize: 13, border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>

          {/* + Add New Donor */}
          <button
            onClick={() => { setOpen(false); onAddNew() }}
            style={{
              width: '100%', padding: '10px 14px', textAlign: 'left',
              border: 'none', borderBottom: '1px solid var(--border-light)',
              background: 'var(--primary-light)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 700, color: 'var(--primary)',
            }}
          >
            <Plus size={14} /> Add New Donor
          </button>

          {/* List */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No donors found. <button onClick={() => { setOpen(false); onAddNew() }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>Add new?</button>
              </div>
            ) : filtered.map(d => (
              <div
                key={d.id}
                onClick={() => select(d)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-light)',
                  background: d.id === value ? 'var(--primary-light)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = d.id === value ? 'var(--primary-light)' : 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = d.id === value ? 'var(--primary-light)' : 'transparent'}
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
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function PickupScheduler() {
  const [donors, setDonors]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [tabLoading, setTabLoading] = useState(true)
  const [tabData, setTabData]     = useState({})

  // Form state
  const [selectedDonor, setSelectedDonor] = useState('')
  const [date, setDate]                   = useState('')
  const [timeSlot, setTimeSlot]           = useState('')
  const [notes, setNotes]                 = useState('')
  const [saving, setSaving]               = useState(false)

  // UI state
  const [activeTab, setActiveTab]     = useState('scheduled')
  const [showDonorModal, setDonorModal] = useState(false)
  const [toast, setToast]             = useState(null)
  const [formError, setFormError]     = useState('')

  // Load donors
  useEffect(() => {
    fetchDonors().then(d => { setDonors(d.filter(x => x.status !== 'Lost')); setLoading(false) })
  }, [])

  // Simulate loading tab data (fake API delay)
  useEffect(() => {
    setTabLoading(true)
    const t = setTimeout(() => { setTabData(schedulerPickups); setTabLoading(false) }, 1000)
    return () => clearTimeout(t)
  }, [])

  // Add new donor from modal
  const handleAddDonor = (newDonor) => {
    setDonors(d => [newDonor, ...d])
    setSelectedDonor(newDonor.id)
    setDonorModal(false)
    setToast(`✓ ${newDonor.name} added and selected`)
  }

  // Schedule pickup submit
  const handleSchedule = async () => {
    if (!selectedDonor) { setFormError('Please select a donor'); return }
    if (!date)          { setFormError('Please pick a pickup date'); return }
    if (!timeSlot)      { setFormError('Please select a time slot'); return }
    setFormError('')
    setSaving(true)

    // Simulate API save
    await new Promise(r => setTimeout(r, 900))

    const donor = donors.find(d => d.id === selectedDonor)
    const newEntry = {
      id: `SC${Date.now()}`,
      donorName: donor.name,
      mobile: donor.mobile,
      society: donor.society || '',
      sector: donor.sector || '',
      city: donor.city || '',
      scheduledDate: date,
      timeSlot,
      notes,
    }

    setTabData(prev => ({ ...prev, scheduled: [newEntry, ...(prev.scheduled || [])] }))
    setActiveTab('scheduled')

    // Reset form
    setSelectedDonor('')
    setDate('')
    setTimeSlot('')
    setNotes('')
    setSaving(false)
    setToast('Pickup scheduled successfully!')
  }

  const donorDetails = donors.find(d => d.id === selectedDonor)

  return (
    <div className="page-body">

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Scheduled',    val: tabData.scheduled?.length ?? '…', color: 'blue' },
          { label: 'Overdue',      val: tabData.overdue?.length   ?? '…', color: 'red' },
          { label: 'At Risk',      val: tabData.atRisk?.length    ?? '…', color: 'yellow' },
          { label: 'Churned',      val: tabData.churned?.length   ?? '…', color: 'orange' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="two-col" style={{ alignItems: 'start', marginBottom: 28 }}>

        {/* ── Schedule Form ──────────────────────────────────────────── */}
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
                {loading ? (
                  <div style={{ height: 40, borderRadius: 8, background: 'var(--border-light)' }} />
                ) : (
                  <DonorDropdown
                    donors={donors}
                    value={selectedDonor}
                    onChange={id => { setSelectedDonor(id); setFormError('') }}
                    onAddNew={() => setDonorModal(true)}
                  />
                )}
              </div>

              {/* Donor location preview */}
              {donorDetails && (
                <div style={{
                  padding: '10px 14px', background: 'var(--secondary-light)',
                  borderRadius: 8, fontSize: 12.5, color: 'var(--secondary)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <MapPin size={13} />
                  {[donorDetails.society, donorDetails.sector, donorDetails.city].filter(Boolean).join(', ')}
                </div>
              )}

              {/* Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Pickup Date <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <CalendarDays size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => { setDate(e.target.value); setFormError('') }}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>

              {/* Time Slot */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Time Slot <span className="required">*</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => { setTimeSlot(slot); setFormError('') }}
                      style={{
                        padding: '5px 11px', borderRadius: 20, fontSize: 12,
                        border: `1.5px solid ${timeSlot === slot ? 'var(--primary)' : 'var(--border)'}`,
                        background: timeSlot === slot ? 'var(--primary-light)' : 'transparent',
                        color: timeSlot === slot ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: timeSlot === slot ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>
                  Notes
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any instructions for the pickup team…"
                  style={{ minHeight: 68 }}
                />
              </div>

              {/* Error */}
              {formError && (
                <div style={{ fontSize: 12.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠</span> {formError}
                </div>
              )}

              {/* Submit */}
              <button
                className="btn btn-primary"
                onClick={handleSchedule}
                disabled={saving}
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              >
                {saving ? (
                  <>
                    <span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} />
                    Scheduling…
                  </>
                ) : (
                  <><Plus size={15} /> Schedule Pickup</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Summary card ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-header">
              <FileText size={16} color="var(--info)" />
              <div className="card-title">How to Use</div>
            </div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 8 }}>1. <strong>Search</strong> for an existing donor or click <span style={{ color: 'var(--primary)', fontWeight: 700 }}>+ Add New Donor</span> to add one.</p>
              <p style={{ marginBottom: 8 }}>2. Choose a <strong>pickup date</strong> and <strong>time slot</strong>.</p>
              <p style={{ marginBottom: 8 }}>3. Add optional <strong>notes</strong> for the team.</p>
              <p>4. Hit <strong>Schedule Pickup</strong> — it will appear under <em>Scheduled</em> below.</p>
            </div>
          </div>

          {/* Quick add donor button */}
          <button
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            onClick={() => setDonorModal(true)}
          >
            <Plus size={15} /> Add New Donor
          </button>
        </div>
      </div>

      {/* ── Pickup Status Tabs ──────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Pickup Overview</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Click a section to view details
          </div>
        </div>
        <div className="card-body">
          <PickupTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            data={tabData}
            loading={tabLoading}
          />
        </div>
      </div>

      {/* ── Modals & Toast ──────────────────────────────────────────── */}
      {showDonorModal && (
        <DonorModal
          onClose={() => setDonorModal(false)}
          onAdd={handleAddDonor}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}