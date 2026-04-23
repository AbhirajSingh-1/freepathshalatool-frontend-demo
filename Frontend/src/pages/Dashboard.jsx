// Frontend/src/pages/Dashboard.jsx
// Enhanced: global filters, RST/SKS item breakdowns, connected to all modules
import { useState, useMemo } from 'react'
import {
  Users, Truck, IndianRupee, TrendingUp,
  Weight, Car, CalendarDays, ChevronDown, ChevronUp,
  UserCheck, PackageCheck, AlertCircle, CheckCircle,
  Filter, X, RefreshCw,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useApp }  from '../context/AppContext'
import { fmtCurrency } from '../utils/helpers'
import { CITIES, CITY_SECTORS, RST_ITEMS, SKS_ITEMS } from '../data/mockData'

const RST_PIE_COLORS  = ['#E8521A','#1B5E35','#F5B942','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F97316','#84CC16','#EF4444']
const SKS_PIE_COLORS  = ['#3B82F6','#8B5CF6','#F5B942','#1B5E35','#EC4899','#14B8A6','#F97316','#E8521A','#84CC16','#06B6D4','#A78BFA','#FB923C','#4ADE80','#F472B6']

const padM = (n) => String(n).padStart(2, '0')

// ── Period helpers ─────────────────────────────────────────────────────────
function getPeriodRange(type, customFrom, customTo) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (type === 'current_month') {
    const last = new Date(y, m + 1, 0).getDate()
    return { from: `${y}-${padM(m + 1)}-01`, to: `${y}-${padM(m + 1)}-${padM(last)}` }
  }
  if (type === 'last_month') {
    const lm = m === 0 ? 11 : m - 1; const ly = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${padM(lm + 1)}-01`, to: `${ly}-${padM(lm + 1)}-${padM(last)}` }
  }
  if (type === 'last_quarter') {
    const curQStart = Math.floor(m / 3) * 3
    let lqStart = curQStart - 3; let lqYear = y
    if (lqStart < 0) { lqStart += 12; lqYear = y - 1 }
    const lqEnd  = lqStart + 2
    const lqLast = new Date(lqYear, lqEnd + 1, 0).getDate()
    return { from: `${lqYear}-${padM(lqStart + 1)}-01`, to: `${lqYear}-${padM(lqEnd + 1)}-${padM(lqLast)}` }
  }
  if (type === 'all_time') return { from: '', to: '' }
  if (type === 'custom') return { from: customFrom || '', to: customTo || '' }
  return { from: '', to: '' }
}

function buildMonthlyChart(pickups, from, to) {
  const map = {}
  if (from && to) {
    let [y, m] = from.slice(0, 7).split('-').map(Number)
    const [ey, em] = to.slice(0, 7).split('-').map(Number)
    while (y < ey || (y === ey && m <= em)) {
      const key   = `${y}-${padM(m)}`
      const label = new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' })
      map[key] = { month: label, value: 0, pickups: 0 }
      m++; if (m > 12) { m = 1; y++ }
    }
  }
  pickups.filter(p => p.status === 'Completed' && (!from || (p.date || '') >= from) && (!to || (p.date || '') <= to))
    .forEach(p => {
      const key = (p.date || '').slice(0, 7); if (!key) return
      const label = new Date(key + '-01').toLocaleString('default', { month: 'short' })
      map[key] = map[key] || { month: label, value: 0, pickups: 0 }
      map[key].value   += p.totalValue || 0
      map[key].pickups += 1
    })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-7)
}

// ── Filters Panel ─────────────────────────────────────────────────────────────
function FiltersPanel({ filters, onChange, PickupPartners, pickups }) {
  const { period, customFrom, customTo, city, sector, PickupPartner } = filters
  const PERIOD_OPTIONS = [
    { id: 'current_month', label: 'This Month' },
    { id: 'last_month',    label: 'Last Month' },
    { id: 'last_quarter',  label: 'Last Quarter' },
    { id: 'all_time',      label: 'All Time' },
    { id: 'custom',        label: 'Custom' },
  ]
  const sectorOptions = city ? (CITY_SECTORS[city] || []) : []
  const pickuppartnerNames = [...new Set(pickups.map(p => p.PickupPartner).filter(Boolean))].sort()

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 20, boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Filter size={14} color="var(--primary)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard Filters</span>
        <span style={{ fontSize: 11, color: 'var(--info)', marginLeft: 4 }}>— All charts and cards update with selection</span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }}
          onClick={() => onChange({ period: 'current_month', customFrom: '', customTo: '', city: '', sector: '', PickupPartner: '' })}>
          <RefreshCw size={10} /> Reset
        </button>
      </div>

      {/* Period */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>Period:</span>
        {PERIOD_OPTIONS.map(o => (
          <button key={o.id} className={`btn btn-sm ${period === o.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}
            onClick={() => onChange({ ...filters, period: o.id })}>
            {o.label}
          </button>
        ))}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10.5, fontWeight: 600 }}>From</label>
              <input type="date" value={customFrom} onChange={e => onChange({ ...filters, customFrom: e.target.value })} style={{ width: 140 }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10.5, fontWeight: 600 }}>To</label>
              <input type="date" value={customTo} onChange={e => onChange({ ...filters, customTo: e.target.value })} style={{ width: 140 }} />
            </div>
          </div>
        )}
      </div>

      {/* Location + Partner */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0, minWidth: 130 }}>
          <label style={{ fontSize: 11, fontWeight: 600 }}>City</label>
          <select value={city} onChange={e => onChange({ ...filters, city: e.target.value, sector: '' })} style={{ fontSize: 12.5 }}>
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
          <label style={{ fontSize: 11, fontWeight: 600 }}>Sector</label>
          <select value={sector} onChange={e => onChange({ ...filters, sector: e.target.value })} disabled={!city} style={{ fontSize: 12.5 }}>
            <option value="">{city ? 'All Sectors' : 'Select city first'}</option>
            {sectorOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
          <label style={{ fontSize: 11, fontWeight: 600 }}>Pickup Partner</label>
          <select value={PickupPartner} onChange={e => onChange({ ...filters, PickupPartner: e.target.value })} style={{ fontSize: 12.5 }}>
            <option value="">All Partners</option>
            {pickuppartnerNames.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        {(city || sector || PickupPartner) && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11.5, color: 'var(--danger)' }}
            onClick={() => onChange({ ...filters, city: '', sector: '', PickupPartner: '' })}>
            <X size={11} /> Clear Location
          </button>
        )}
      </div>
    </div>
  )
}

// ── Custom Pie Label ──────────────────────────────────────────────────────────
const RADIAN = Math.PI / 180
function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.05) return null
  const r  = innerRadius + (outerRadius - innerRadius) * 0.5
  const x  = cx + r * Math.cos(-midAngle * RADIAN)
  const y  = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── RST Item Breakdown ────────────────────────────────────────────────────────
function RSTBreakdown({ raddiRecords, pickups }) {
  const itemTotals = useMemo(() => {
    const map = {}
    raddiRecords.forEach(r => {
      const itemKgMap = r.itemKgMap || {}
      Object.entries(itemKgMap).forEach(([item, kg]) => {
        if (kg > 0) map[item] = (map[item] || 0) + kg
      })
      // Also count from rstOthers
      ;(r.rstOthers || []).forEach(o => {
        if (o.name && o.amount > 0) map['Others'] = (map['Others'] || 0) + (parseFloat(o.weight) || 0)
      })
    })
    // Fallback: count from pickups rstItems if no itemKgMap data
    if (Object.keys(map).length === 0) {
      pickups.filter(p => p.status === 'Completed').forEach(p => {
        ;(p.rstItems || []).forEach(item => {
          map[item] = (map[item] || 0) + 1
        })
      })
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)), pct: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0 }))
  }, [raddiRecords, pickups])

  const hasKgData = raddiRecords.some(r => Object.keys(r.itemKgMap || {}).length > 0)
  const unit = hasKgData ? 'kg' : 'pickups'
  const total = itemTotals.reduce((s, r) => s + r.value, 0)

  if (itemTotals.length === 0) return (
    <div className="empty-state" style={{ padding: 32 }}>
      <p style={{ fontSize: 12 }}>No RST item data for this period.</p>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary)' }}>Total: {total.toFixed(1)} {unit}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {itemTotals.length} item types</span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ResponsiveContainer width={170} height={170}>
          <PieChart>
            <Pie data={itemTotals} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={78} innerRadius={30} labelLine={false} label={CustomPieLabel}>
              {itemTotals.map((_, i) => <Cell key={i} fill={RST_PIE_COLORS[i % RST_PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v} ${unit}`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, minWidth: 150 }}>
          {itemTotals.slice(0, 8).map((item, i) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: RST_PIE_COLORS[i % RST_PIE_COLORS.length], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }} className="truncate">{item.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value} {unit}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' }}>{item.pct}%</div>
            </div>
          ))}
          {itemTotals.length > 8 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>+{itemTotals.length - 8} more items</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SKS Item Breakdown ────────────────────────────────────────────────────────
function SKSBreakdown({ pickups }) {
  const itemCounts = useMemo(() => {
    const map = {}
    pickups.filter(p => p.status === 'Completed' || p.status === 'Pending').forEach(p => {
      ;(p.sksItems || []).forEach(item => {
        // Normalise "Others (xxx)" → "Others"
        const key = item.startsWith('Others') ? 'Others' : item
        map[key] = (map[key] || 0) + 1
      })
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value, pct: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0 }))
  }, [pickups])

  const totalItems = itemCounts.reduce((s, r) => s + r.value, 0)

  if (itemCounts.length === 0) return (
    <div className="empty-state" style={{ padding: 32 }}>
      <p style={{ fontSize: 12 }}>No SKS item data for this period.</p>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)' }}>Total: {totalItems} items collected</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {itemCounts.length} item types</span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ResponsiveContainer width={170} height={170}>
          <PieChart>
            <Pie data={itemCounts} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={78} innerRadius={30} labelLine={false} label={CustomPieLabel}>
              {itemCounts.map((_, i) => <Cell key={i} fill={SKS_PIE_COLORS[i % SKS_PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v} items`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, minWidth: 150 }}>
          {itemCounts.slice(0, 8).map((item, i) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: SKS_PIE_COLORS[i % SKS_PIE_COLORS.length], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }} className="truncate">{item.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' }}>{item.pct}%</div>
            </div>
          ))}
          {itemCounts.length > 8 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>+{itemCounts.length - 8} more</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Financial Summary ─────────────────────────────────────────────────────────
function FinancialSummary({ raddiRecords, PickupPartners }) {
  const totalRevenue   = raddiRecords.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const totalReceived  = raddiRecords.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)
  const totalPending   = raddiRecords.filter(r => r.paymentStatus === 'Yet to Receive').reduce((s, r) => s + (r.totalAmount || 0), 0)
  const collPct        = totalRevenue > 0 ? Math.round((totalReceived / totalRevenue) * 100) : 0

  const partnerBreakdown = useMemo(() => {
    const map = {}
    raddiRecords.forEach(r => {
      const n = r.PickupPartnerName || 'Unassigned'
      if (!map[n]) map[n] = { name: n, total: 0, received: 0, pending: 0 }
      map[n].total    += r.totalAmount || 0
      if (r.paymentStatus === 'Received')       map[n].received += r.totalAmount || 0
      if (r.paymentStatus === 'Yet to Receive') map[n].pending  += r.totalAmount || 0
    })
    return Object.values(map).sort((a, b) => b.pending - a.pending)
  }, [raddiRecords])

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>Collection progress</span>
          <span style={{ color: collPct >= 80 ? 'var(--secondary)' : collPct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
            {collPct}%
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, collPct)}%`, background: collPct >= 80 ? 'var(--secondary)' : collPct >= 50 ? 'var(--warning)' : 'var(--danger)', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border-light)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        {[
          { label: 'Total Revenue', val: fmtCurrency(totalRevenue), color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Collected', val: fmtCurrency(totalReceived), color: 'var(--secondary)', bg: 'var(--secondary-light)' },
          { label: 'Pending', val: fmtCurrency(totalPending), color: totalPending > 0 ? 'var(--danger)' : 'var(--secondary)', bg: totalPending > 0 ? 'var(--danger-bg)' : 'var(--secondary-light)' },
        ].map(item => (
          <div key={item.label} style={{ padding: '12px 14px', background: item.bg, textAlign: 'center' }}>
            <div style={{ fontSize: 9.5, color: item.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Per-partner breakdown */}
      {partnerBreakdown.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>By Pickup Partner</div>
          {partnerBreakdown.slice(0, 5).map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: p.pending > 0 ? 'var(--danger-bg)' : 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: p.pending > 0 ? 'var(--danger)' : 'var(--secondary)', flexShrink: 0 }}>
                {p.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{p.name}</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{fmtCurrency(p.received)}</span>
                  {p.pending > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Due: {fmtCurrency(p.pending)}</span>}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{fmtCurrency(p.total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ onNav }) {
  const { donors, pickups, raddiRecords, PickupPartners, partners } = useApp()

  const [filters, setFilters] = useState({
    period: 'current_month', customFrom: '', customTo: '',
    city: '', sector: '', PickupPartner: '',
  })

  const { from: pFrom, to: pTo } = useMemo(
    () => getPeriodRange(filters.period, filters.customFrom, filters.customTo),
    [filters.period, filters.customFrom, filters.customTo]
  )

  // ── Apply ALL filters to pickups ─────────────────────────────────────────
  const filteredPickups = useMemo(() => pickups.filter(p => {
    const d = p.date || ''
    const inDate = (!pFrom || d >= pFrom) && (!pTo || d <= pTo)
    const inCity = !filters.city || p.city === filters.city
    const inSect = !filters.sector || p.sector === filters.sector
    const inpickuppartner  = !filters.PickupPartner || p.PickupPartner === filters.PickupPartner
    return inDate && inCity && inSect && inpickuppartner
  }), [pickups, pFrom, pTo, filters])

  // ── Apply ALL filters to raddiRecords ─────────────────────────────────────
  const filteredRaddi = useMemo(() => raddiRecords.filter(r => {
    const d = r.pickupDate || ''
    const inDate = (!pFrom || d >= pFrom) && (!pTo || d <= pTo)
    const inCity = !filters.city || r.city === filters.city
    const inSect = !filters.sector || r.sector === filters.sector
    const inpickuppartner  = !filters.PickupPartner || r.PickupPartnerName === filters.PickupPartner
    return inDate && inCity && inSect && inpickuppartner
  }), [raddiRecords, pFrom, pTo, filters])

  // ── Period stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const completed  = filteredPickups.filter(p => p.status === 'Completed')
    const sksPickups = filteredPickups.filter(p => (p.sksItems || []).length > 0)
    const totalSKS   = filteredPickups.reduce((s, p) => s + (p.sksItems || []).length, 0)
    const totalValue = completed.reduce((s, p) => s + (p.totalValue || 0), 0)
    const totalKg    = filteredRaddi.reduce((s, r) => s + (r.totalKg || 0), 0)
    const received   = filteredRaddi.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)
    const pending    = filteredRaddi.filter(r => r.paymentStatus === 'Yet to Receive').reduce((s, r) => s + (r.totalAmount || 0), 0)
    const driveCount = completed.filter(p => p.pickupMode === 'Drive').length
    const indivCount = completed.filter(p => p.pickupMode === 'Individual').length
    return { completed: completed.length, totalValue, totalKg, received, pending, totalSKS, sksPickupsCount: sksPickups.length, driveCount, indivCount }
  }, [filteredPickups, filteredRaddi])

  // ── Monthly chart ─────────────────────────────────────────────────────────
  const monthlyChartData = useMemo(
    () => buildMonthlyChart(filteredPickups, pFrom, pTo),
    [filteredPickups, pFrom, pTo]
  )

  const periodLabel = useMemo(() => {
    if (filters.period === 'current_month') return 'This Month'
    if (filters.period === 'last_month')    return 'Last Month'
    if (filters.period === 'last_quarter')  return 'Last Quarter'
    if (filters.period === 'all_time')      return 'All Time'
    if (filters.period === 'custom' && pFrom && pTo) {
      const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      return `${fmt(pFrom)} – ${fmt(pTo)}`
    }
    return 'Custom'
  }, [filters.period, pFrom, pTo])

  const activeFilters = [filters.city, filters.sector, filters.PickupPartner].filter(Boolean)
  const activePartners = (partners || []).filter(k => (k.totalPickups || 0) > 0).length

  // ── Custom tooltip ────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--primary)' }}>₹{(payload[0]?.value || 0).toLocaleString('en-IN')}</div>
        {payload[1] && <div style={{ color: 'var(--secondary)', marginTop: 2 }}>{payload[1]?.value} pickups</div>}
      </div>
    )
  }

  return (
    <div className="page-body">

      {/* ── Filters ── */}
      <FiltersPanel filters={filters} onChange={setFilters} PickupPartners={PickupPartners} pickups={pickups} />

      {/* ── Active filter chips ── */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Active:</span>
          {filters.city && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
              📍 {filters.city}
              <button onClick={() => setFilters(f => ({ ...f, city: '', sector: '' }))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {filters.sector && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--info)', fontWeight: 600 }}>
              🏘 {filters.sector}
              <button onClick={() => setFilters(f => ({ ...f, sector: '' }))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--info)', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {filters.PickupPartner && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--secondary-light)', color: 'var(--secondary)', fontWeight: 600 }}>
              🤝 {filters.PickupPartner}
              <button onClick={() => setFilters(f => ({ ...f, PickupPartner: '' }))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--secondary)', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
        </div>
      )}

      {/* ── Period label strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '9px 14px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <CalendarDays size={15} color="var(--primary)" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>{periodLabel}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
          · {stats.completed} pickups · {filteredRaddi.length} raddi records
        </span>
        {activeFilters.length > 0 && (
          <span style={{ fontSize: 11, background: 'var(--warning-bg)', color: '#92400E', padding: '2px 8px', borderRadius: 20, fontWeight: 600, marginLeft: 'auto' }}>
            Filtered view
          </span>
        )}
      </div>

      {/* ── Core KPIs ── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card orange">
          <div className="stat-icon"><Truck size={20} /></div>
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Total Pickups</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><IndianRupee size={20} /></div>
          <div className="stat-value">{fmtCurrency(stats.totalValue)}</div>
          <div className="stat-label">RST Revenue</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Weight size={18} /></div>
          <div className="stat-value">{stats.totalKg.toFixed(1)} kg</div>
          <div className="stat-label">Total RST Collected</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon"><PackageCheck size={18} /></div>
          <div className="stat-value">{stats.totalSKS}</div>
          <div className="stat-label">SKS Items Collected</div>
          <div className="stat-change up">{stats.sksPickupsCount} pickups</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle size={18} /></div>
          <div className="stat-value">{fmtCurrency(stats.received)}</div>
          <div className="stat-label">Payments Received</div>
          <div className="stat-change up">{periodLabel}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><AlertCircle size={18} /></div>
          <div className="stat-value">{fmtCurrency(stats.pending)}</div>
          <div className="stat-label">Pending Amount</div>
          <div className="stat-change down">Needs collection</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{donors.filter(d => d.status === 'Active').length}</div>
          <div className="stat-label">Active Donors</div>
          <div className="stat-change up">{donors.length} total</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><UserCheck size={20} /></div>
          <div className="stat-value">{(partners || []).length}</div>
          <div className="stat-label">Pickup Partners</div>
          <div className="stat-change up">{activePartners} active</div>
        </div>
      </div>

      {/* ── Monthly Chart + RST Breakdown ── */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <TrendingUp size={18} color="var(--primary)" />
            <div className="card-title">Monthly RST Revenue</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            {monthlyChartData.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No pickups in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyChartData} barSize={28}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {monthlyChartData.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                <span>Drive: <strong style={{ color: 'var(--info)' }}>{stats.driveCount}</strong></span>
                <span>Individual: <strong style={{ color: 'var(--primary)' }}>{stats.indivCount}</strong></span>
                <span style={{ marginLeft: 'auto' }}>Total: <strong style={{ color: 'var(--secondary)' }}>{stats.completed}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <Weight size={18} color="var(--secondary)" />
            <div className="card-title">RST Item Breakdown</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--secondary)', fontWeight: 600 }}>♻️ Raddi se Tarakki</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <RSTBreakdown raddiRecords={filteredRaddi} pickups={filteredPickups} />
          </div>
        </div>
      </div>

      {/* ── SKS Breakdown + Financial ── */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <PackageCheck size={18} color="var(--info)" />
            <div className="card-title">SKS Item Breakdown</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--info)', fontWeight: 600 }}>🎁 Sammaan Ka Saaman</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <SKSBreakdown pickups={filteredPickups} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <IndianRupee size={18} color="var(--primary)" />
            <div className="card-title">Financial Insights</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <FinancialSummary raddiRecords={filteredRaddi} PickupPartners={PickupPartners} />
          </div>
        </div>
      </div>

       
    </div>
  )
}