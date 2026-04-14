// Frontend/src/pages/PickupOverview.jsx
// Admin/Manager: Overview of all pickups — Individual & Drive stats + scheduler tabs
// FIXED: "This Week" = Monday to Sunday of current week (includes future dates in week)
import { useState, useMemo } from 'react'
import {
  Truck, Users, AlertTriangle, TrendingUp,
  Filter, X, Calendar, BarChart3, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useApp }   from '../context/AppContext'
import { useRole }  from '../context/RoleContext'
import PickupTabs   from '../components/PickupTabs'
import { fmtDate, fmtCurrency } from '../utils/helpers'

// ── Period helpers ─────────────────────────────────────────────────────────────
const padM = (n) => String(n).padStart(2, '0')
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getFinancialYear(date = new Date()) {
  return date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1
}

function getLast5Months() {
  const now = new Date()
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1)
    return `${d.getFullYear()}-${padM(d.getMonth() + 1)}`
  })
}

function getMonthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${ym}-01`, to: `${ym}-${padM(last)}` }
}

function getFYRange(fyStart) {
  return { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` }
}

const fmt = (d) => d.toISOString().slice(0, 10)

// ── FIXED: This Week = Monday–Sunday of current week ──────────────────────────
function getThisWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon, ...6 = Sat
  // Days since Monday (treat Sunday as day 7)
  const daysSinceMon = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysSinceMon)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: fmt(monday), to: fmt(sunday) }
}

function getPresetRange(p) {
  const n = new Date()
  if (p === 'today')     return { from: fmt(n), to: fmt(n) }
  if (p === 'yesterday') { const d = new Date(n); d.setDate(n.getDate() - 1); return { from: fmt(d), to: fmt(d) } }
  if (p === 'tomorrow')  { const d = new Date(n); d.setDate(n.getDate() + 1); return { from: fmt(d), to: fmt(d) } }
  if (p === 'week')      return getThisWeekRange()   // FIXED: Mon–Sun including future
  if (p === 'next7')     { const d = new Date(n); d.setDate(n.getDate() + 7); return { from: fmt(n), to: fmt(d) } }
  return { from: '', to: '' }
}

// ── Stats row ─────────────────────────────────────────────────────────────────
function PickupStatRow({ label, value, sub, color = 'var(--text-primary)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color }}>{value}</span>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Period Selector ────────────────────────────────────────────────────────────
function PeriodBar({ dateFrom, dateTo, onRange, last5 }) {
  const [fyOpen, setFyOpen] = useState(false)
  const currentFY  = getFinancialYear()
  const fyOptions  = [currentFY, currentFY - 1, currentFY - 2]

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '10px 0 6px' }}>
      {last5.map(ym => {
        const [y, m] = ym.split('-')
        const r = getMonthRange(ym)
        const active = dateFrom === r.from && dateTo === r.to
        return (
          <button key={ym} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11.5 }} onClick={() => onRange(r.from, r.to)}>
            {MONTHS_SHORT[+m - 1]} {y}
          </button>
        )
      })}

      

      <button className={`btn btn-sm ${!dateFrom && !dateTo ? 'btn-primary' : 'btn-ghost'}`}
        style={{ fontSize: 11.5 }} onClick={() => onRange('', '')}>All Time</button>

      {(dateFrom || dateTo) && (
        <button className="btn btn-ghost btn-sm" onClick={() => onRange('', '')} style={{ color: 'var(--danger)', fontSize: 11.5 }}>
          <X size={11} /> Clear
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PickupOverview() {
  const { pickups, schedulerTabData } = useApp()
  const { can } = useRole()

  const last5 = getLast5Months()
  const defaultFrom = last5[0] + '-01'
  const defaultTo   = new Date().toISOString().slice(0, 10)

  const [section,    setSection]   = useState('overview')
  const [activeTab,  setActiveTab] = useState('scheduled')
  const [dateFrom,   setDateFrom]  = useState(defaultFrom)
  const [dateTo,     setDateTo]    = useState(defaultTo)
  const [sector,     setSector]    = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Scheduler sub-filters
  const [schPreset, setSchPreset] = useState('all')
  const [schFrom,   setSchFrom]   = useState('')
  const [schTo,     setSchTo]     = useState('')

  const applySchPreset = (p) => {
    setSchPreset(p)
    if (p === 'all') { setSchFrom(''); setSchTo('') }
    else if (p !== 'custom') {
      const r = getPresetRange(p)
      setSchFrom(r.from)
      setSchTo(r.to)
    }
  }

  const allSectors = useMemo(() => [...new Set(pickups.map(p => p.sector).filter(Boolean))].sort(), [pickups])

  const filteredPickups = useMemo(() =>
    pickups.filter(p => {
      const d = p.date || ''
      const inDate = (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo)
      const inSec  = !sector || p.sector === sector
      return inDate && inSec
    }),
    [pickups, dateFrom, dateTo, sector]
  )

  const individualPickups  = useMemo(() => filteredPickups.filter(p => p.pickupMode !== 'Drive'), [filteredPickups])
  const drivePickups       = useMemo(() => filteredPickups.filter(p => p.pickupMode === 'Drive'), [filteredPickups])
  const completedInd       = individualPickups.filter(p => p.status === 'Completed')
  const completedDrive     = drivePickups.filter(p => p.status === 'Completed')
  const indRevenue         = completedInd.reduce((s, p) => s + (p.totalValue || 0), 0)
  const driveRevenue       = completedDrive.reduce((s, p) => s + (p.totalValue || 0), 0)
  const pendingInd         = individualPickups.filter(p => p.status === 'Pending').length
  const pendingDrive       = drivePickups.filter(p => p.status === 'Pending').length

  const monthlyStats = useMemo(() => {
    const m = {}
    filteredPickups.filter(p => p.status === 'Completed').forEach(p => {
      const key = (p.date || '').slice(0, 7)
      if (!key) return
      if (!m[key]) m[key] = { month: key, individual: 0, drive: 0, revenue: 0 }
      if (p.pickupMode === 'Drive') m[key].drive++
      else m[key].individual++
      m[key].revenue += p.totalValue || 0
    })
    return Object.values(m).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 8)
  }, [filteredPickups])

  // Scheduler tab data filtered — THIS WEEK fix applied via getPresetRange
  const filteredTabData = useMemo(() => {
    const inRange  = (ds) => { if (!ds) return true; if (schFrom && ds < schFrom) return false; if (schTo && ds > schTo) return false; return true }
    const inSec    = (row) => !sector || row.sector === sector
    const f        = (rows, dk = 'scheduledDate') => rows.filter(r => inRange(r[dk]) && inSec(r))
    return {
      overdue:   f(schedulerTabData.overdue   || []),
      scheduled: f(schedulerTabData.scheduled || []),
      atRisk:    f(schedulerTabData.atRisk    || [], 'lastPickup'),
      churned:   f(schedulerTabData.churned   || [], 'lastPickup'),
    }
  }, [schedulerTabData, schFrom, schTo, sector])

  const periodLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return 'All Time'
    if (dateFrom && dateTo)   return `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`
    if (dateFrom)             return `From ${fmtDate(dateFrom)}`
    return `Until ${fmtDate(dateTo)}`
  }, [dateFrom, dateTo])

  if (!can.viewPickupOverview) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-icon"><AlertTriangle size={24} /></div>
          <h3>Access Restricted</h3>
          <p>Pickup Overview is available to Admin and Manager roles only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-body">
      {/* Section tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${section === 'overview' ? 'active' : ''}`} onClick={() => setSection('overview')}>
          <BarChart3 size={13} style={{ marginRight: 5 }} />Pickup Analytics
        </button>
        <button className={`tab ${section === 'scheduler' ? 'active' : ''}`} onClick={() => setSection('scheduler')}>
          <Calendar size={13} style={{ marginRight: 5 }} />Scheduler Tabs
        </button>
      </div>

      {/* ── OVERVIEW SECTION ── */}
      {section === 'overview' && (
        <>
          {/* Period bar */}
          <div className="card" style={{ marginBottom: 20, padding: '8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period:</span>
                <span style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600 }}>{periodLabel}</span>
              </div>
              {/* Date range manual inputs */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600 }}>From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 140 }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600 }}>To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 140 }} />
                </div>
                <select value={sector} onChange={e => setSector(e.target.value)} style={{ fontSize: 12, minWidth: 140 }}>
                  <option value="">All Sectors</option>
                  {allSectors.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <PeriodBar dateFrom={dateFrom} dateTo={dateTo} onRange={(f, t) => { setDateFrom(f); setDateTo(t) }} last5={last5} />
          </div>

          {/* KPIs */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card orange">
              <div className="stat-icon"><Truck size={18} /></div>
              <div className="stat-value">{completedInd.length}</div>
              <div className="stat-label">Individual Pickups</div>
              <div className="stat-change up">{pendingInd} pending</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-icon"><Users size={18} /></div>
              <div className="stat-value">{completedDrive.length}</div>
              <div className="stat-label">Drive Pickups</div>
              <div className="stat-change up">{pendingDrive} pending</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon"><TrendingUp size={18} /></div>
              <div className="stat-value">{fmtCurrency(indRevenue)}</div>
              <div className="stat-label">Individual Revenue</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-icon"><TrendingUp size={18} /></div>
              <div className="stat-value">{fmtCurrency(driveRevenue)}</div>
              <div className="stat-label">Drive Revenue</div>
            </div>
          </div>

          <div className="two-col" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="card-header">
                <Truck size={16} color="var(--primary)" />
                <div className="card-title">Individual Pickup Stats</div>
              </div>
              <div className="card-body">
                <PickupStatRow label="Completed"           value={completedInd.length}       color="var(--secondary)" />
                <PickupStatRow label="Pending"             value={pendingInd}                 color="var(--info)" />
                <PickupStatRow label="Total Revenue"       value={fmtCurrency(indRevenue)}    color="var(--primary)" />
                <PickupStatRow label="Avg Revenue/Pickup"  value={completedInd.length ? fmtCurrency(Math.round(indRevenue / completedInd.length)) : '—'} />
                <PickupStatRow label="Postponed"           value={individualPickups.filter(p => p.status === 'Postponed').length} />
                <PickupStatRow label="RST Pickups"         value={completedInd.filter(p => p.type?.includes('RST')).length} />
                <PickupStatRow label="SKS Pickups"         value={completedInd.filter(p => p.type?.includes('SKS')).length} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <Users size={16} color="var(--info)" />
                <div className="card-title">Drive / Campaign Stats</div>
              </div>
              <div className="card-body">
                <PickupStatRow label="Completed"           value={completedDrive.length}      color="var(--secondary)" />
                <PickupStatRow label="Pending"             value={pendingDrive}                color="var(--info)" />
                <PickupStatRow label="Total Revenue"       value={fmtCurrency(driveRevenue)}  color="var(--primary)" />
                <PickupStatRow label="Avg Revenue/Drive"   value={completedDrive.length ? fmtCurrency(Math.round(driveRevenue / completedDrive.length)) : '—'} />
                <PickupStatRow label="SKS Drives"          value={completedDrive.filter(p => p.type?.includes('SKS')).length} />
                <PickupStatRow label="RST+SKS Combo"       value={completedDrive.filter(p => p.type === 'RST+SKS').length} />
              </div>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div className="card">
            <div className="card-header">
              <BarChart3 size={16} color="var(--secondary)" />
              <div className="card-title">Monthly Pickup Breakdown</div>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
            </div>
            <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr><th>Month</th><th>Individual</th><th>Drive</th><th>Total</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {monthlyStats.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No completed pickups in selected period</td></tr>
                  ) : monthlyStats.map(m => (
                    <tr key={m.month}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.month}</td>
                      <td style={{ fontWeight: 600 }}>{m.individual}</td>
                      <td style={{ fontWeight: 600 }}>{m.drive}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.individual + m.drive}</td>
                      <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{fmtCurrency(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SCHEDULER TABS SECTION ── */}
      {section === 'scheduler' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="card-title">Scheduled & At-Risk Pickups</div>
            <button
              className={`btn btn-sm ${showFilters ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setShowFilters(f => !f)}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Filter size={13} />Filters
            </button>
          </div>

          {/* Filters OUTSIDE tabs (moved per spec) */}
          {showFilters && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    ['today',     'Today'],
                    ['yesterday', 'Yesterday'],
                    ['tomorrow',  'Tomorrow'],
                    ['week',      'This Week (Mon–Sun)'],  // FIXED label
                    ['all',       'All'],
                    ['custom',    'Custom'],
                  ].map(([v, l]) => (
                    <button key={v} className={`btn btn-sm ${schPreset === v ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => applySchPreset(v)} style={{ fontSize: 12 }}>{l}</button>
                  ))}
                  {schPreset === 'custom' && (
                    <>
                      <input type="date" value={schFrom} onChange={e => setSchFrom(e.target.value)} style={{ width: 140, fontSize: 12 }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      <input type="date" value={schTo}   onChange={e => setSchTo(e.target.value)}   style={{ width: 140, fontSize: 12 }} />
                    </>
                  )}
                </div>
                {/* Show current week range when "This Week" is selected */}
                {schPreset === 'week' && schFrom && (
                  <div style={{ fontSize: 11, color: 'var(--info)', fontWeight: 600 }}>
                    📅 {fmtDate(schFrom)} – {fmtDate(schTo)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sector</label>
                <select value={sector} onChange={e => setSector(e.target.value)} style={{ minWidth: 160, fontSize: 13 }}>
                  <option value="">All Sectors</option>
                  {allSectors.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {(sector || schPreset !== 'all') && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSector(''); applySchPreset('all') }}>
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          )}

          <div className="card-body">
            <PickupTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              data={filteredTabData}
              loading={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}