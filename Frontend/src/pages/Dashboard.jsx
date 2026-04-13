// Frontend/src/pages/Dashboard.jsx
// Simplified: Core KPIs + Month filter + charts (no overdue donors list, no scheduled pickups section)
import { useState, useMemo } from 'react'
import {
  Users, Truck, IndianRupee, TrendingUp,
  Weight, Car, CalendarDays, ChevronDown, ChevronUp,
  UserCheck, PackageCheck, Download,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useApp }  from '../context/AppContext'
import { itemBreakdown } from '../data/mockData'
import { fmtCurrency, exportToExcel } from '../utils/helpers'

const PIE_COLORS = ['#E8521A', '#1B5E35', '#F5B942', '#3B82F6', '#8B5CF6', '#EC4899']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const padM = (n) => String(n).padStart(2, '0')

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

function getFinancialYear(date = new Date()) {
  return date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1
}

function getFYRange(fyStart) {
  return { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` }
}

function buildMonthlyChart(pickups, from, to) {
  const map = {}
  pickups
    .filter(p => p.status === 'Completed' && p.date >= (from || '') && p.date <= (to || '9999'))
    .forEach(p => {
      const key = (p.date || '').slice(0, 7)
      if (!key) return
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

// ── Period pill selector ──────────────────────────────────────────────────────
function PeriodPills({ period, onPeriod }) {
  const [fyOpen, setFyOpen] = useState(false)
  const last5   = getLast5Months()
  const fy      = getFinancialYear()

  const label = period.type === 'all' ? 'All Time'
    : period.type === 'month' ? (() => { const [y, m] = period.value.split('-'); return `${MONTHS_SHORT[+m - 1]} ${y}` })()
    : period.type === 'fy' ? `FY ${period.value}-${period.value + 1}`
    : 'Custom'

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {last5.map(ym => {
        const [y, m] = ym.split('-')
        const active = period.type === 'month' && period.value === ym
        return (
          <button key={ym} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11.5 }}
            onClick={() => onPeriod({ type: 'month', value: ym })}>
            {MONTHS_SHORT[+m - 1]} {y}
          </button>
        )
      })}

      <div style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={() => setFyOpen(o => !o)}>
          Financial Year {fyOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        {fyOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 6, minWidth: 140 }}>
            {[fy, fy - 1, fy - 2].map(f => (
              <button key={f}
                className={`btn btn-sm ${period.type === 'fy' && period.value === f ? 'btn-primary' : 'btn-ghost'}`}
                style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 3, fontSize: 11.5 }}
                onClick={() => { onPeriod({ type: 'fy', value: f }); setFyOpen(false) }}>
                FY {f}-{f + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className={`btn btn-sm ${period.type === 'all' ? 'btn-primary' : 'btn-ghost'}`}
        style={{ fontSize: 11.5 }}
        onClick={() => onPeriod({ type: 'all' })}>
        All Time
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ onNav }) {
  const { donors, pickups, raddiRecords, dashboardStats, partners } = useApp()

  const last5 = getLast5Months()
  const [period, setPeriod] = useState({ type: 'month', value: last5[last5.length - 1] })

  const { from: pFrom, to: pTo } = useMemo(() => {
    if (period.type === 'all')   return { from: '', to: '' }
    if (period.type === 'month') return getMonthRange(period.value)
    if (period.type === 'fy')    return getFYRange(period.value)
    return { from: '', to: '' }
  }, [period])

  const filteredPickups = useMemo(() =>
    pickups.filter(p => {
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

  const monthlyChartData = useMemo(() =>
    buildMonthlyChart(pickups, pFrom || last5[0] + '-01', pTo),
    [pickups, pFrom, pTo] // eslint-disable-line
  )

  const periodLabel = useMemo(() => {
    if (period.type === 'all')   return 'All Time'
    if (period.type === 'month') { const [y, m] = period.value.split('-'); return `${MONTHS_SHORT[+m - 1]} ${y}` }
    if (period.type === 'fy')    return `FY ${period.value}-${period.value + 1}`
    return ''
  }, [period])

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
        <PeriodPills period={period} onPeriod={setPeriod} />
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
      </div>x

      {/* Quick nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'Schedule Pickups',   sub: 'Plan upcoming pickups',            page: 'pickupscheduler', color: 'var(--info)',       bg: 'var(--info-bg)' },
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