// Frontend/src/pages/Dashboard.jsx
import { useState, useMemo } from 'react'
import {
  Users, Truck, IndianRupee, TrendingUp,
  Weight, Car, CalendarDays, ChevronDown, ChevronUp,
  UserCheck, PackageCheck,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useApp }  from '../context/AppContext'
import { itemBreakdown } from '../data/mockData'
import { fmtCurrency } from '../utils/helpers'

const PIE_COLORS = ['#E8521A', '#1B5E35', '#F5B942', '#3B82F6', '#8B5CF6', '#EC4899']
const padM = (n) => String(n).padStart(2, '0')

// ── Period range helpers ──────────────────────────────────────────────────────
function getPeriodRange(type, customFrom, customTo) {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = now.getMonth() // 0-indexed

  if (type === 'current_month') {
    const last = new Date(y, m + 1, 0).getDate()
    return { from: `${y}-${padM(m + 1)}-01`, to: `${y}-${padM(m + 1)}-${padM(last)}` }
  }
  if (type === 'last_month') {
    const lm  = m === 0 ? 11 : m - 1
    const ly  = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${padM(lm + 1)}-01`, to: `${ly}-${padM(lm + 1)}-${padM(last)}` }
  }
  if (type === 'last_quarter') {
    // Calendar quarters: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
    const curQStart = Math.floor(m / 3) * 3          // 0-indexed start of current quarter
    let lqStart = curQStart - 3
    let lqYear  = y
    if (lqStart < 0) { lqStart += 12; lqYear = y - 1 }
    const lqEnd  = lqStart + 2
    const lqLast = new Date(lqYear, lqEnd + 1, 0).getDate()
    return {
      from: `${lqYear}-${padM(lqStart + 1)}-01`,
      to:   `${lqYear}-${padM(lqEnd + 1)}-${padM(lqLast)}`,
    }
  }
  if (type === 'custom') {
    return { from: customFrom || '', to: customTo || '' }
  }
  return { from: '', to: '' }
}

// ── FIXED: Pre-populate every month in range so empty months still render ────
function buildMonthlyChart(pickups, from, to) {
  const map = {}

  if (from && to) {
    let [y, m] = from.slice(0, 7).split('-').map(Number)
    const [ey, em] = to.slice(0, 7).split('-').map(Number)
    while (y < ey || (y === ey && m <= em)) {
      const key   = `${y}-${padM(m)}`
      const label = new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' })
      map[key]    = { month: label, value: 0, pickups: 0 }
      m++
      if (m > 12) { m = 1; y++ }
    }
  }

  pickups
    .filter(p => p.status === 'Completed' && p.date >= (from || '') && p.date <= (to || '9999'))
    .forEach(p => {
      const key   = (p.date || '').slice(0, 7)
      if (!key) return
      const label = new Date(key + '-01').toLocaleString('default', { month: 'short' })
      map[key]         = map[key] || { month: label, value: 0, pickups: 0 }
      map[key].value   += p.totalValue || 0
      map[key].pickups += 1
    })

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .slice(-6)
}

// ── Period Picker ─────────────────────────────────────────────────────────────
function PeriodPicker({ period, onPeriod, customFrom, customTo, onCustomFrom, onCustomTo }) {
  const OPTIONS = [
    { id: 'current_month', label: 'Current Month' },
    { id: 'last_month',    label: 'Last Month' },
    { id: 'last_quarter',  label: 'Last Quarter' },
    { id: 'custom',        label: 'Custom' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {OPTIONS.map(o => (
        <button
          key={o.id}
          className={`btn btn-sm ${period === o.id ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: 12 }}
          onClick={() => onPeriod(o.id)}
        >
          {o.label}
        </button>
      ))}
      {period === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 10.5, fontWeight: 600 }}>From</label>
            <input type="date" value={customFrom} onChange={e => onCustomFrom(e.target.value)} style={{ width: 140 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 10.5, fontWeight: 600 }}>To</label>
            <input type="date" value={customTo} onChange={e => onCustomTo(e.target.value)} style={{ width: 140 }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ onNav }) {
  const { donors, pickups, raddiRecords, dashboardStats, partners } = useApp()

  const [period,     setPeriod]     = useState('current_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  const { from: pFrom, to: pTo } = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  )

  const filteredPickups = useMemo(
    () => pickups.filter(p => {
      const d = p.date || ''
      return (!pFrom || d >= pFrom) && (!pTo || d <= pTo)
    }),
    [pickups, pFrom, pTo]
  )

  const periodStats = useMemo(() => {
    const completed  = filteredPickups.filter(p => p.status === 'Completed')
    const totalValue = completed.reduce((s, p) => s + (p.totalValue || 0), 0)
    const driveCount = completed.filter(p => p.pickupMode === 'Drive').length
    const indivCount = completed.filter(p => p.pickupMode === 'Individual').length
    const totalKg    = raddiRecords
      .filter(r => (!pFrom || (r.pickupDate || '') >= pFrom) && (!pTo || (r.pickupDate || '') <= pTo))
      .reduce((s, r) => s + (r.totalKg || 0), 0)
    return { completed: completed.length, totalValue, driveCount, indivCount, totalKg }
  }, [filteredPickups, raddiRecords, pFrom, pTo])

  const monthlyChartData = useMemo(
    () => buildMonthlyChart(pickups, pFrom, pTo),
    [pickups, pFrom, pTo]
  )

  const periodLabel = useMemo(() => {
    if (period === 'current_month') return 'Current Month'
    if (period === 'last_month')    return 'Last Month'
    if (period === 'last_quarter') {
      // Show actual months e.g. "Jan – Mar 2026"
      if (pFrom && pTo) {
        const fmt = d => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        return `${fmt(pFrom)} – ${fmt(pTo)}`
      }
      return 'Last Quarter'
    }
    if (period === 'custom' && pFrom && pTo) {
      const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      return `${fmt(pFrom)} – ${fmt(pTo)}`
    }
    return 'Custom'
  }, [period, pFrom, pTo])

  const activePartners = (partners || []).filter(k => (k.totalPickups || 0) > 0).length

  return (
    <div className="page-body">

      {/* Period selector */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
        padding: '12px 16px', background: 'var(--surface)',
        border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={15} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>{periodLabel}</span>
        </div>
        <PeriodPicker
          period={period}
          onPeriod={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
        />
      </div>

      {/* Core KPIs */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card orange">
          <div className="stat-icon"><Truck size={20} /></div>
          <div className="stat-value">{periodStats.completed}</div>
          <div className="stat-label">Total Pickups</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><IndianRupee size={20} /></div>
          <div className="stat-value">{fmtCurrency(periodStats.totalValue)}</div>
          <div className="stat-label">RST Revenue</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{dashboardStats.activeDonors}</div>
          <div className="stat-label">Total Donors</div>
          <div className="stat-change up">{dashboardStats.totalDonors} total</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon"><UserCheck size={20} /></div>
          <div className="stat-value">{(partners || []).length}</div>
          <div className="stat-label">Active Partners</div>
          <div className="stat-change up">{activePartners} with pickups</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Weight size={18} /></div>
          <div className="stat-value">{periodStats.totalKg.toFixed(1)} kg</div>
          <div className="stat-label">Waste Collected</div>
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
        <div className="stat-card red">
          <div className="stat-icon"><TrendingUp size={18} /></div>
          <div className="stat-value">{dashboardStats.pendingPayments}</div>
          <div className="stat-label">Pending Payments</div>
          <div className="stat-change down">Needs action</div>
        </div>
      </div>

      {/* Charts */}
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
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'RST Value']}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
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

      {/* Quick nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'Pickup Scheduler',   sub: 'Plan upcoming pickups',            page: 'pickupscheduler', color: 'var(--info)',       bg: 'var(--info-bg)' },
          { label: 'Payment Tracking',   sub: `${dashboardStats.pendingPayments} pending`,  page: 'payments',  color: 'var(--warning)',   bg: 'var(--warning-bg)' },
          { label: 'SKS Warehouse',      sub: 'Track donated goods',              page: 'sksoverview',     color: 'var(--primary)',    bg: 'var(--primary-light)' },
        ].map(card => (
          <button
            key={card.page}
            onClick={() => onNav(card.page)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '16px', borderRadius: 'var(--radius)',
              border: `1.5px solid ${card.color}22`,
              background: card.bg, cursor: 'pointer',
              transition: 'all 0.15s', textAlign: 'left',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: card.color, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}