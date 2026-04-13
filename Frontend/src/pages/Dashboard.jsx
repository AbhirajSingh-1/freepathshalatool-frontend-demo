// Frontend/src/pages/Dashboard.jsx
// ─── Dashboard — Period-filtered KPIs + Donor Pickup History ─────────────────
import { useState, useMemo, useCallback } from 'react'
import {
  Users, Truck, IndianRupee, AlertTriangle, Clock,
  TrendingUp, PackageCheck, Car, Weight, Download,
  Search, CalendarDays, Filter, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useApp }  from '../context/AppContext'
import { itemBreakdown } from '../data/mockData'
import { fmtDate, fmtCurrency, pickupStatusColor, exportToExcel } from '../utils/helpers'

const PIE_COLORS = ['#E8521A', '#1B5E35', '#F5B942', '#3B82F6', '#8B5CF6', '#EC4899']

// ── Period helpers ────────────────────────────────────────────────────────────
const padM = (n) => String(n).padStart(2, '0')

function getFinancialYear(date = new Date()) {
  const m = date.getMonth() + 1 // 1-12
  const y = date.getFullYear()
  return m >= 4 ? y : y - 1  // FY starts April
}

function getFYRange(fyStart) {
  // fyStart e.g. 2025 → Apr 2025 – Mar 2026
  return {
    from: `${fyStart}-04-01`,
    to:   `${fyStart + 1}-03-31`,
  }
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

function buildMonthlyChart(pickups, from, to) {
  const map = {}
  pickups
    .filter(p => p.status === 'Completed' && p.date >= (from || '') && p.date <= (to || '9999'))
    .forEach(p => {
      const key = (p.date || '').slice(0, 7)
      if (!key) return
      const [, m] = key.split('-')
      const label = new Date(key + '-01').toLocaleString('default', { month: 'short' })
      map[key] = map[key] || { month: label, value: 0, pickups: 0 }
      map[key].value   += p.totalValue || 0
      map[key].pickups += 1
    })
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .slice(-6)
}

// ── Period selector component ─────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function PeriodSelector({ period, onPeriod }) {
  const [open, setOpen] = useState(false)
  const last5 = getLast5Months()
  const currentFY = getFinancialYear()
  const fyOptions = [currentFY, currentFY - 1, currentFY - 2]

  const label = useMemo(() => {
    if (period.type === 'all')   return 'All Time'
    if (period.type === 'month') {
      const [y, m] = period.value.split('-')
      return `${MONTHS_SHORT[+m - 1]} ${y}`
    }
    if (period.type === 'fy') return `FY ${period.value}-${period.value + 1}`
    return 'Select Period'
  }, [period])

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
      >
        <CalendarDays size={13} />
        {label}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
          padding: 12, minWidth: 260,
        }}>
          {/* All time */}
          <button
            className={`btn btn-sm ${period.type === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 10 }}
            onClick={() => { onPeriod({ type: 'all' }); setOpen(false) }}
          >
            All Time
          </button>

          {/* Last 5 months */}
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            Last 5 Months
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {last5.map(ym => {
              const [y, m] = ym.split('-')
              const active = period.type === 'month' && period.value === ym
              return (
                <button
                  key={ym}
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11 }}
                  onClick={() => { onPeriod({ type: 'month', value: ym }); setOpen(false) }}
                >
                  {MONTHS_SHORT[+m - 1]} {y}
                </button>
              )
            })}
          </div>

          {/* Financial Years */}
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            Financial Year
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {fyOptions.map(fy => {
              const active = period.type === 'fy' && period.value === fy
              return (
                <button
                  key={fy}
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11 }}
                  onClick={() => { onPeriod({ type: 'fy', value: fy }); setOpen(false) }}
                >
                  FY {fy}-{fy + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ onNav }) {
  const { donors, pickups, raddiRecords, dashboardStats: allStats } = useApp()

  // Default period: last 5 months span
  const last5 = getLast5Months()
  const defaultPeriod = { type: 'range', from: last5[0] + '-01', to: new Date().toISOString().slice(0, 10) }
  const [period, setPeriod] = useState(defaultPeriod)

  // ── Resolve date range from period ───────────────────────────────────────
  const { from: pFrom, to: pTo } = useMemo(() => {
    if (period.type === 'all')   return { from: '', to: '' }
    if (period.type === 'month') return getMonthRange(period.value)
    if (period.type === 'fy')    return getFYRange(period.value)
    if (period.type === 'range') return { from: period.from, to: period.to }
    return { from: '', to: '' }
  }, [period])

  // ── Filtered pickups for KPIs ─────────────────────────────────────────────
  const filteredPickups = useMemo(() =>
    pickups.filter(p => {
      const d = p.date || ''
      return (!pFrom || d >= pFrom) && (!pTo || d <= pTo)
    }),
    [pickups, pFrom, pTo]
  )

  // ── Period KPI stats ──────────────────────────────────────────────────────
  const periodStats = useMemo(() => {
    const completed   = filteredPickups.filter(p => p.status === 'Completed')
    const pending     = filteredPickups.filter(p => p.status === 'Pending')
    const totalValue  = completed.reduce((s, p) => s + (p.totalValue || 0), 0)
    const pendingPay  = completed.filter(p => p.paymentStatus !== 'Paid' && p.paymentStatus !== 'Write Off').length
    const driveCount  = completed.filter(p => p.pickupMode === 'Drive').length
    const indivCount  = completed.filter(p => p.pickupMode === 'Individual').length
    const totalKg     = raddiRecords
      .filter(r => (!pFrom || (r.pickupDate || '') >= pFrom) && (!pTo || (r.pickupDate || '') <= pTo))
      .reduce((s, r) => s + (r.totalKg || 0), 0)
    return {
      completed: completed.length,
      pending:   pending.length,
      totalValue,
      pendingPay,
      driveCount,
      indivCount,
      totalKg,
    }
  }, [filteredPickups, raddiRecords, pFrom, pTo])

  // ── Charts ────────────────────────────────────────────────────────────────
  const monthlyChartData = useMemo(() =>
    buildMonthlyChart(pickups, pFrom || last5[0] + '-01', pTo),
    [pickups, pFrom, pTo] // eslint-disable-line
  )

  // ── Overdue donors ────────────────────────────────────────────────────────
  const overdue = useMemo(
    () => donors.filter(d => d.nextPickup && new Date(d.nextPickup) < new Date() && d.status === 'Active'),
    [donors]
  )

  const upcoming = useMemo(
    () => pickups.filter(p => p.status === 'Pending').slice(0, 5),
    [pickups]
  )

  const pendingPayments = useMemo(
    () => pickups.filter(p => p.paymentStatus !== 'Paid' && p.status === 'Completed').slice(0, 5),
    [pickups]
  )

  // ── Donor Pickup History filters ──────────────────────────────────────────
  const [histSearch,   setHistSearch]   = useState('')
  const [histSector,   setHistSector]   = useState('')
  const [histDateFrom, setHistDateFrom] = useState(pFrom)
  const [histDateTo,   setHistDateTo]   = useState(pTo)
  const [histStatus,   setHistStatus]   = useState('All')
  const [showHF,       setShowHF]       = useState(false)

  const allSectors = useMemo(() => {
    const s = new Set(pickups.map(p => p.sector).filter(Boolean))
    return [...s].sort()
  }, [pickups])

  const historyRows = useMemo(() => {
    const q = histSearch.toLowerCase()
    return pickups
      .filter(p => {
        const matchQ  = !q || p.donorName?.toLowerCase().includes(q) || p.society?.toLowerCase().includes(q)
        const matchSe = !histSector   || p.sector === histSector
        const matchF  = !histDateFrom || (p.date || '') >= histDateFrom
        const matchT  = !histDateTo   || (p.date || '') <= histDateTo
        const matchSt = histStatus === 'All' || p.status === histStatus
        return matchQ && matchSe && matchF && matchT && matchSt
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [pickups, histSearch, histSector, histDateFrom, histDateTo, histStatus])

  const handleHistExport = useCallback(() => {
    exportToExcel(
      historyRows.map(p => ({
        Donor:        p.donorName,  Date:          p.date,
        Sector:       p.sector,    Society:        p.society,
        City:         p.city,      Mode:           p.pickupMode,
        Type:         p.type,      'RST Items':    (p.rstItems  || []).join(', '),
        'SKS Items':  (p.sksItems  || []).join(', '),
        'Total Kg':   p.rstTotalWeight || '',
        'Amount (₹)': p.totalValue,  Status:       p.status,
        Payment:      p.paymentStatus, Kabadiwala:  p.kabadiwala,
      })),
      'Donor_Pickup_History'
    )
  }, [historyRows])

  const clearHistFilters = () => {
    setHistSearch(''); setHistSector(''); setHistDateFrom(pFrom)
    setHistDateTo(pTo); setHistStatus('All')
  }
  const hasHistFilters = histSearch || histSector || histDateFrom || histDateTo || histStatus !== 'All'

  // Sync history filters when period changes
  const handlePeriodChange = (p) => {
    setPeriod(p)
    if (p.type === 'all')   { setHistDateFrom(''); setHistDateTo('') }
    if (p.type === 'month') { const r = getMonthRange(p.value); setHistDateFrom(r.from); setHistDateTo(r.to) }
    if (p.type === 'fy')    { const r = getFYRange(p.value); setHistDateFrom(r.from); setHistDateTo(r.to) }
  }

  const periodLabel = useMemo(() => {
    if (period.type === 'all')   return 'All Time'
    if (period.type === 'month') { const [y, m] = period.value.split('-'); return `${MONTHS_SHORT[+m - 1]} ${y}` }
    if (period.type === 'fy')    return `FY ${period.value}-${period.value + 1}`
    return `${pFrom || '—'} to ${pTo || '—'}`
  }, [period, pFrom, pTo])

  return (
    <div className="page-body">

      {/* ── Period selector bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, marginBottom: 20,
        padding: '10px 16px', background: 'var(--surface)',
        border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={15} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 13 }}>Period:</span>
          <span style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600 }}>{periodLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {last5.map(ym => {
            const [y, m] = ym.split('-')
            const active = period.type === 'month' && period.value === ym
            return (
              <button
                key={ym}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11.5 }}
                onClick={() => handlePeriodChange({ type: 'month', value: ym })}
              >
                {MONTHS_SHORT[+m - 1]} {y}
              </button>
            )
          })}
          <PeriodSelector period={period} onPeriod={handlePeriodChange} />
        </div>
      </div>

      {/* ── KPI Grid (period-aware) ── */}
      <div className="stat-grid">
        <div className="stat-card orange">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{allStats.activeDonors}</div>
          <div className="stat-label">Active Donors</div>
          <div className="stat-change up">of {allStats.totalDonors} total</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Truck size={20} /></div>
          <div className="stat-value">{periodStats.completed}</div>
          <div className="stat-label">Completed Pickups</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Clock size={20} /></div>
          <div className="stat-value">{periodStats.pending}</div>
          <div className="stat-label">Scheduled Pickups</div>
          <div className="stat-change up">Pending</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div className="stat-value">{overdue.length}</div>
          <div className="stat-label">Overdue Pickups</div>
          <div className="stat-change down">Needs attention</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Weight size={18} /></div>
          <div className="stat-value">{periodStats.totalKg.toFixed(1)} kg</div>
          <div className="stat-label">Waste Collected</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon"><IndianRupee size={20} /></div>
          <div className="stat-value">{fmtCurrency(periodStats.totalValue)}</div>
          <div className="stat-label">RST Revenue</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{periodStats.driveCount}</div>
          <div className="stat-label">Drive Pickups</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><Car size={20} /></div>
          <div className="stat-value">{periodStats.indivCount}</div>
          <div className="stat-label">Individual Pickups</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
      </div>

      {/* ── Overdue Alert ── */}
      {overdue.length > 0 && (
        <div className="alert-strip alert-warning" style={{ marginBottom: 20, marginTop: 4 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{overdue.length} donor{overdue.length > 1 ? 's' : ''} overdue:</strong>{' '}
            {overdue.slice(0, 4).map(d => d.name).join(', ')}{overdue.length > 4 ? '…' : ''}.{' '}
            <button
              onClick={() => onNav('pickupscheduler')}
              style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}
            >
              Schedule now →
            </button>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card page-section">
          <div className="card-header">
            <TrendingUp size={18} color="var(--primary)" />
            <div className="card-title">Monthly RST Value (₹)</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            {monthlyChartData.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No completed pickups in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyChartData} barSize={28}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'RST Value']} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card page-section">
          <div className="card-header">
            <PackageCheck size={18} color="var(--secondary)" />
            <div className="card-title">RST Item Breakdown</div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={itemBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} innerRadius={28}>
                    {itemBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, minWidth: 120 }}>
                {itemBreakdown.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{item.value}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming + Pending Payments ── */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <Clock size={18} color="var(--info)" />
            <div className="card-title">Upcoming Pickups</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('pickups')}>View All</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>No upcoming pickups</p></div>
            ) : upcoming.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={16} color="var(--info)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.society} · {p.pickupMode || 'Individual'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(p.date)}</div>
                  <span className="badge badge-primary" style={{ fontSize: 10 }}>{p.type || 'RST'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <IndianRupee size={18} color="var(--warning)" />
            <div className="card-title">Pending Payments</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('payments')}>View All</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {pendingPayments.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>All payments cleared! 🎉</p></div>
            ) : pendingPayments.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtDate(p.date)} · {p.kabadiwala || 'No kabadiwala'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13.5 }}>
                    {fmtCurrency((p.totalValue || 0) - (p.amountPaid || 0))}
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: 10 }}>Due</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Donor Pickup History ── */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <CalendarDays size={18} color="var(--primary)" />
          <div className="card-title">Donor Pickup History</div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${showHF ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setShowHF(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Filter size={12} />
              Filters
              {hasHistFilters && (
                <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {[histSearch, histSector, histDateFrom, histDateTo, histStatus !== 'All' ? histStatus : ''].filter(Boolean).length}
                </span>
              )}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleHistExport}>
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {showHF && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input placeholder="Search donor or society…" value={histSearch} onChange={e => setHistSearch(e.target.value)} style={{ paddingLeft: 32, fontSize: 13 }} />
              </div>
              <select value={histSector} onChange={e => setHistSector(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">All Sectors</option>
                {allSectors.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={histStatus} onChange={e => setHistStatus(e.target.value)} style={{ fontSize: 13 }}>
                <option value="All">All Status</option>
                {['Completed', 'Pending', 'Postponed', 'Did Not Open Door'].map(s => <option key={s}>{s}</option>)}
              </select>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 10.5, fontWeight: 600 }}>From</label>
                <input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)} style={{ fontSize: 12 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 10.5, fontWeight: 600 }}>To</label>
                <input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)} style={{ fontSize: 12 }} />
              </div>
              {hasHistFilters && (
                <button className="btn btn-ghost btn-sm" onClick={clearHistFilters} style={{ alignSelf: 'flex-end' }}>
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '8px 20px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>{historyRows.length}</strong> record{historyRows.length !== 1 ? 's' : ''}
          {hasHistFilters && ' (filtered)'}
        </div>

        <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Donor</th><th>Date</th><th>Sector</th><th>Mode</th>
                <th>Type</th><th>Kg</th><th>Amount</th><th>Status</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No records found
                  </td>
                </tr>
              ) : historyRows.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.donorName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.society}</div>
                  </td>
                  <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                  <td style={{ fontSize: 12.5 }}>{p.sector || '—'}</td>
                  <td><span className="badge badge-muted" style={{ fontSize: 10 }}>{p.pickupMode || 'Individual'}</span></td>
                  <td>
                    <span className={`badge ${p.type === 'RST' ? 'badge-success' : p.type === 'SKS' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                      {p.type || 'RST'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>
                    {p.rstTotalWeight ? `${p.rstTotalWeight} ${p.rstWeightUnit || 'kg'}` : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--secondary)', fontSize: 12.5 }}>
                    {(p.totalValue || 0) > 0 ? fmtCurrency(p.totalValue) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${pickupStatusColor(p.status)}`} style={{ fontSize: 10 }}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      p.paymentStatus === 'Paid' ? 'badge-success'
                      : p.paymentStatus === 'Partially Paid' ? 'badge-warning'
                      : 'badge-danger'
                    }`} style={{ fontSize: 10 }}>
                      {p.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards" style={{ padding: '8px 12px' }}>
          {historyRows.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><p>No records found</p></div>
          ) : historyRows.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{p.society}, {p.sector}</div>
                </div>
                <span className={`badge ${pickupStatusColor(p.status)}`} style={{ fontSize: 10, flexShrink: 0 }}>{p.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Date: </span><strong>{fmtDate(p.date)}</strong></div>
                {p.rstTotalWeight && <div><span style={{ color: 'var(--text-muted)' }}>Kg: </span><strong>{p.rstTotalWeight}</strong></div>}
                {(p.totalValue || 0) > 0 && <div><span style={{ color: 'var(--text-muted)' }}>Amount: </span><strong style={{ color: 'var(--secondary)' }}>{fmtCurrency(p.totalValue)}</strong></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}