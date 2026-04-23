// Frontend/src/pages/Dashboard.jsx
// Reorganized: RST section + SKS section, compact filter bar, single-row KPIs
import { useState, useMemo } from 'react'
import {
  Users, Truck, IndianRupee, TrendingUp,
  Weight, CalendarDays, ChevronDown, ChevronUp,
  UserCheck, PackageCheck, AlertCircle, CheckCircle,
  Filter, X, RefreshCw, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useApp }  from '../context/AppContext'
import { fmtCurrency } from '../utils/helpers'
import { CITIES, CITY_SECTORS } from '../data/mockData'

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

function buildSKSMonthlyChart(pickups, from, to) {
  const map = {}
  if (from && to) {
    let [y, m] = from.slice(0, 7).split('-').map(Number)
    const [ey, em] = to.slice(0, 7).split('-').map(Number)
    while (y < ey || (y === ey && m <= em)) {
      const key   = `${y}-${padM(m)}`
      const label = new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' })
      map[key] = { month: label, items: 0, pickups: 0 }
      m++; if (m > 12) { m = 1; y++ }
    }
  }
  pickups.filter(p =>
    p.status === 'Completed' &&
    (p.sksItems || []).length > 0 &&
    (!from || (p.date || '') >= from) &&
    (!to || (p.date || '') <= to)
  ).forEach(p => {
    const key = (p.date || '').slice(0, 7); if (!key) return
    const label = new Date(key + '-01').toLocaleString('default', { month: 'short' })
    map[key] = map[key] || { month: label, items: 0, pickups: 0 }
    map[key].items   += (p.sksItems || []).length
    map[key].pickups += 1
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-7)
}

// ── Compact Filters Bar ────────────────────────────────────────────────────────
function FiltersPanel({ filters, onChange, pickups }) {
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
  const hasLocFilter = city || sector || PickupPartner

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius)', padding: '8px 12px',
      marginBottom: 14, boxShadow: 'var(--shadow)',
    }}>
      {/* Single-row filter line: period left, location right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap', overflowX: 'auto' }}>
        <Filter size={12} color="var(--primary)" style={{ flexShrink: 0 }} />

        {PERIOD_OPTIONS.map(o => (
          <button key={o.id} className={`btn btn-sm ${period === o.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => onChange({ ...filters, period: o.id })}>
            {o.label}
          </button>
        ))}

        {/* Divider + push right */}
        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0, marginLeft: 'auto' }} />

        {/* Location + partner filters — right side */}
        <select value={city} onChange={e => onChange({ ...filters, city: e.target.value, sector: '' })}
          style={{ fontSize: 11, padding: '2px 4px', width: 'auto', minWidth: 0, maxWidth: 100, height: 26, flexShrink: 0 }}>
          <option value="">All Cities</option>
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sector} onChange={e => onChange({ ...filters, sector: e.target.value })}
          disabled={!city}
          style={{ fontSize: 11, padding: '2px 4px', width: 'auto', minWidth: 0, maxWidth: 110, height: 26, flexShrink: 0 }}>
          <option value="">{city ? 'All Sectors' : '—'}</option>
          {sectorOptions.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={PickupPartner} onChange={e => onChange({ ...filters, PickupPartner: e.target.value })}
          style={{ fontSize: 11, padding: '2px 4px', width: 'auto', minWidth: 0, maxWidth: 110, height: 26, flexShrink: 0 }}>
          <option value="">All Partners</option>
          {pickuppartnerNames.map(k => <option key={k}>{k}</option>)}
        </select>

        {hasLocFilter && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10.5, color: 'var(--danger)', padding: '3px 6px', flexShrink: 0 }}
            onClick={() => onChange({ ...filters, city: '', sector: '', PickupPartner: '' })}>
            <X size={10} />
          </button>
        )}
        <button className="btn btn-ghost btn-sm"
          style={{ fontSize: 10.5, padding: '3px 7px', flexShrink: 0 }}
          onClick={() => onChange({ period: 'current_month', customFrom: '', customTo: '', city: '', sector: '', PickupPartner: '' })}>
          <RefreshCw size={10} />
        </button>
      </div>

      {/* Custom date row (only when custom selected) */}
      {period === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>From:</span>
          <input type="date" value={customFrom} onChange={e => onChange({ ...filters, customFrom: e.target.value })} style={{ width: 130, fontSize: 12, height: 28 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>To:</span>
          <input type="date" value={customTo} onChange={e => onChange({ ...filters, customTo: e.target.value })} style={{ width: 130, fontSize: 12, height: 28 }} />
        </div>
      )}
    </div>
  )
}

// ── Custom Pie Label ──────────────────────────────────────────────────────────
const RADIAN = Math.PI / 180
function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
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
      ;(r.rstOthers || []).forEach(o => {
        if (o.name && o.amount > 0) map['Others'] = (map['Others'] || 0) + (parseFloat(o.weight) || 0)
      })
    })
    if (Object.keys(map).length === 0) {
      pickups.filter(p => p.status === 'Completed').forEach(p => {
        ;(p.rstItems || []).forEach(item => { map[item] = (map[item] || 0) + 1 })
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
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={itemTotals} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={75} innerRadius={28} labelLine={false} label={CustomPieLabel}>
              {itemTotals.map((_, i) => <Cell key={i} fill={RST_PIE_COLORS[i % RST_PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v} ${unit}`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, minWidth: 150 }}>
          {itemTotals.slice(0, 8).map((item, i) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: RST_PIE_COLORS[i % RST_PIE_COLORS.length], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }} className="truncate">{item.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value} {unit}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{item.pct}%</div>
            </div>
          ))}
          {itemTotals.length > 8 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>+{itemTotals.length - 8} more</div>
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
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={itemCounts} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={75} innerRadius={28} labelLine={false} label={CustomPieLabel}>
              {itemCounts.map((_, i) => <Cell key={i} fill={SKS_PIE_COLORS[i % SKS_PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v} items`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, minWidth: 150 }}>
          {itemCounts.slice(0, 8).map((item, i) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: SKS_PIE_COLORS[i % SKS_PIE_COLORS.length], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }} className="truncate">{item.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{item.pct}%</div>
            </div>
          ))}
          {itemCounts.length > 8 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>+{itemCounts.length - 8} more</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── RST Financial Summary ─────────────────────────────────────────────────────
function RSTFinancialSummary({ raddiRecords }) {
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
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
          <span style={{ color: 'var(--text-muted)' }}>Collection progress</span>
          <span style={{ color: collPct >= 80 ? 'var(--secondary)' : collPct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{collPct}%</span>
        </div>
        <div style={{ height: 7, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, collPct)}%`, background: collPct >= 80 ? 'var(--secondary)' : collPct >= 50 ? 'var(--warning)' : 'var(--danger)', transition: 'width 0.5s ease' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border-light)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        {[
          { label: 'Total Revenue', val: fmtCurrency(totalRevenue), color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Collected',     val: fmtCurrency(totalReceived), color: 'var(--secondary)', bg: 'var(--secondary-light)' },
          { label: 'Pending',       val: fmtCurrency(totalPending), color: totalPending > 0 ? 'var(--danger)' : 'var(--secondary)', bg: totalPending > 0 ? 'var(--danger-bg)' : 'var(--secondary-light)' },
        ].map(item => (
          <div key={item.label} style={{ padding: '10px 12px', background: item.bg, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: item.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>
      {partnerBreakdown.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>By Pickup Partner</div>
          {partnerBreakdown.slice(0, 5).map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: p.pending > 0 ? 'var(--danger-bg)' : 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: p.pending > 0 ? 'var(--danger)' : 'var(--secondary)', flexShrink: 0 }}>
                {p.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{p.name}</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{fmtCurrency(p.received)}</span>
                  {p.pending > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Due: {fmtCurrency(p.pending)}</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{fmtCurrency(p.total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SKS Dispatch Financial Summary ────────────────────────────────────────────
function SKSDispatchSummary({ sksOutflows, filteredSKSOutflows }) {
  const totalDispatched = filteredSKSOutflows.reduce((s, r) => s + (r.items || []).reduce((a, it) => a + it.qty, 0), 0)
  const totalReceived   = filteredSKSOutflows.reduce((s, r) => s + (Number(r.payment?.amount) || 0), 0)
  const totalValue      = filteredSKSOutflows.reduce((s, r) => s + (Number(r.payment?.totalValue) || 0), 0)
  const paidCount       = filteredSKSOutflows.filter(r => r.payment?.status === 'Paid').length
  const collPct         = totalValue > 0 ? Math.round((totalReceived / totalValue) * 100) : 0

  const recipientMap = useMemo(() => {
    const map = {}
    filteredSKSOutflows.forEach(r => {
      const n = r.partnerName || 'Unknown'
      if (!map[n]) map[n] = { name: n, items: 0, received: 0 }
      map[n].items    += (r.items || []).reduce((a, it) => a + it.qty, 0)
      map[n].received += Number(r.payment?.amount) || 0
    })
    return Object.values(map).sort((a, b) => b.items - a.items).slice(0, 5)
  }, [filteredSKSOutflows])

  if (filteredSKSOutflows.length === 0) return (
    <div className="empty-state" style={{ padding: 32 }}>
      <p style={{ fontSize: 12 }}>No SKS dispatch data for this period.</p>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border-light)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        {[
          { label: 'Total Dispatched', val: `${totalDispatched} items`, color: 'var(--info)', bg: 'var(--info-bg)' },
          { label: 'Payments In',      val: fmtCurrency(totalReceived), color: 'var(--secondary)', bg: 'var(--secondary-light)' },
          { label: 'Dispatches',        val: String(filteredSKSOutflows.length), color: 'var(--primary)', bg: 'var(--primary-light)' },
        ].map(item => (
          <div key={item.label} style={{ padding: '10px 12px', background: item.bg, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: item.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>

      {totalValue > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Payment collection</span>
            <span style={{ color: collPct >= 80 ? 'var(--secondary)' : 'var(--warning)' }}>{collPct}%</span>
          </div>
          <div style={{ height: 7, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, collPct)}%`, background: collPct >= 80 ? 'var(--secondary)' : 'var(--warning)', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {recipientMap.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Top Recipients</div>
          {recipientMap.map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--info)', flexShrink: 0 }}>
                {r.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{r.name}</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.items} items</span>
              </div>
              {r.received > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary)', flexShrink: 0 }}>{fmtCurrency(r.received)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ emoji, title, subtitle, color = 'var(--primary)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 8 }}>
      <div style={{ width: 4, height: 22, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 15, fontWeight: 800, color }}>{emoji} {title}</span>
      {subtitle && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>— {subtitle}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border-light)', marginLeft: 4 }} />
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ onNav }) {
  const { donors, pickups, raddiRecords, PickupPartners, partners, sksInflows, sksOutflows } = useApp()

  const [filters, setFilters] = useState({
    period: 'current_month', customFrom: '', customTo: '',
    city: '', sector: '', PickupPartner: '',
  })

  const { from: pFrom, to: pTo } = useMemo(
    () => getPeriodRange(filters.period, filters.customFrom, filters.customTo),
    [filters.period, filters.customFrom, filters.customTo]
  )

  const filteredPickups = useMemo(() => pickups.filter(p => {
    const d = p.date || ''
    const inDate = (!pFrom || d >= pFrom) && (!pTo || d <= pTo)
    const inCity = !filters.city || p.city === filters.city
    const inSect = !filters.sector || p.sector === filters.sector
    const inpickuppartner = !filters.PickupPartner || p.PickupPartner === filters.PickupPartner
    return inDate && inCity && inSect && inpickuppartner
  }), [pickups, pFrom, pTo, filters])

  const filteredRaddi = useMemo(() => raddiRecords.filter(r => {
    const d = r.pickupDate || ''
    const inDate = (!pFrom || d >= pFrom) && (!pTo || d <= pTo)
    const inCity = !filters.city || r.city === filters.city
    const inSect = !filters.sector || r.sector === filters.sector
    const inpickuppartner = !filters.PickupPartner || r.PickupPartnerName === filters.PickupPartner
    return inDate && inCity && inSect && inpickuppartner
  }), [raddiRecords, pFrom, pTo, filters])

  // Date-filter sksOutflows
  const filteredSKSOutflows = useMemo(() => sksOutflows.filter(r => {
    const d = r.date || ''
    return (!pFrom || d >= pFrom) && (!pTo || d <= pTo)
  }), [sksOutflows, pFrom, pTo])

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

  const monthlyRSTData = useMemo(() => buildMonthlyChart(filteredPickups, pFrom, pTo), [filteredPickups, pFrom, pTo])
  const monthlySKSData = useMemo(() => buildSKSMonthlyChart(filteredPickups, pFrom, pTo), [filteredPickups, pFrom, pTo])

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

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--primary)' }}>₹{(payload[0]?.value || 0).toLocaleString('en-IN')}</div>
      </div>
    )
  }
  const SKSTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--info)' }}>{payload[0]?.value || 0} items</div>
      </div>
    )
  }

  return (
    <div className="page-body">
      {/* ── Compact Filters ── */}
      <FiltersPanel filters={filters} onChange={setFilters} pickups={pickups} />

      {/* ── Active filter chips ── */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Active:</span>
          {filters.city && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
              📍 {filters.city}
              <button onClick={() => setFilters(f => ({ ...f, city: '', sector: '' }))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0 }}>×</button>
            </span>
          )}
          {filters.sector && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--info)', fontWeight: 600 }}>
              🏘 {filters.sector}
              <button onClick={() => setFilters(f => ({ ...f, sector: '' }))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--info)', padding: 0 }}>×</button>
            </span>
          )}
          {filters.PickupPartner && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--secondary-light)', color: 'var(--secondary)', fontWeight: 600 }}>
              🤝 {filters.PickupPartner}
              <button onClick={() => setFilters(f => ({ ...f, PickupPartner: '' }))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--secondary)', padding: 0 }}>×</button>
            </span>
          )}
        </div>
      )}

      {/* ── Period label ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <CalendarDays size={14} color="var(--primary)" />
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

      {/* ── Compact KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'Total Pickups',   value: stats.completed,               sub: periodLabel,            icon: Truck,         tone: 'orange' },
          { label: 'RST Revenue',     value: fmtCurrency(stats.totalValue), sub: periodLabel,            icon: IndianRupee,   tone: 'green'  },
          { label: 'RST Collected',   value: `${stats.totalKg.toFixed(1)} kg`, sub: 'weight',            icon: Weight,        tone: 'blue'   },
          { label: 'SKS Items',       value: stats.totalSKS,                sub: `${stats.sksPickupsCount} pickups`, icon: PackageCheck, tone: 'yellow' },
          { label: 'Received',        value: fmtCurrency(stats.received),   sub: periodLabel,            icon: CheckCircle,   tone: 'green'  },
          { label: 'Pending',         value: fmtCurrency(stats.pending),    sub: 'Needs collection',     icon: AlertCircle,   tone: 'red'    },
          { label: 'Active Donors',   value: donors.filter(d => d.status === 'Active').length, sub: `${donors.length} total`, icon: Users, tone: 'blue' },
          { label: 'Partners',        value: (partners || []).length,       sub: `${activePartners} active`, icon: UserCheck, tone: 'orange' },
        ].map(({ label, value, sub, icon: Icon, tone }) => (
          <div key={label} className={`stat-card ${tone}`} style={{ padding: '12px 12px' }}>
            <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: 8 }}><Icon size={16} /></div>
            <div className="stat-value" style={{ fontSize: 18 }}>{value}</div>
            <div className="stat-label" style={{ fontSize: 10.5 }}>{label}</div>
            <div className="stat-change up" style={{ fontSize: 10 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          ♻️ RST SECTION
      ═══════════════════════════════════════════ */}
      <SectionHeader emoji="♻️" title="RST — Raddi Se Tarakki" subtitle="Scrap collection revenue & item analytics" color="var(--primary)" />

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <TrendingUp size={16} color="var(--primary)" />
            <div className="card-title">Monthly RST Revenue</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            {monthlyRSTData.length === 0 ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No RST pickups in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyRSTData} barSize={26}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {monthlyRSTData.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                <span>Drive: <strong style={{ color: 'var(--info)' }}>{stats.driveCount}</strong></span>
                <span>Individual: <strong style={{ color: 'var(--primary)' }}>{stats.indivCount}</strong></span>
                <span style={{ marginLeft: 'auto' }}>Total: <strong style={{ color: 'var(--secondary)' }}>{stats.completed}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <Weight size={16} color="var(--secondary)" />
            <div className="card-title">RST Item Breakdown</div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <RSTBreakdown raddiRecords={filteredRaddi} pickups={filteredPickups} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <IndianRupee size={16} color="var(--primary)" />
          <div className="card-title">RST Financial Insights</div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
        </div>
        <div className="card-body" style={{ paddingTop: 10 }}>
          <RSTFinancialSummary raddiRecords={filteredRaddi} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          🎁 SKS SECTION
      ═══════════════════════════════════════════ */}
      <SectionHeader emoji="🎁" title="SKS — Sammaan Ka Saaman" subtitle="Goods collection & dispatch analytics" color="var(--info)" />

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <TrendingUp size={16} color="var(--info)" />
            <div className="card-title">Monthly SKS Items Collected</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            {monthlySKSData.length === 0 ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No SKS items in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlySKSData} barSize={26}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<SKSTooltip />} />
                  <Bar dataKey="items" fill="var(--info)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {monthlySKSData.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                <span>SKS Pickups: <strong style={{ color: 'var(--info)' }}>{stats.sksPickupsCount}</strong></span>
                <span style={{ marginLeft: 'auto' }}>Total Items: <strong style={{ color: 'var(--info)' }}>{stats.totalSKS}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <PackageCheck size={16} color="var(--info)" />
            <div className="card-title">SKS Item Breakdown</div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <SKSBreakdown pickups={filteredPickups} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <ArrowUpCircle size={16} color="var(--info)" />
          <div className="card-title">SKS Dispatch & Payment Analytics</div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</span>
        </div>
        <div className="card-body" style={{ paddingTop: 10 }}>
          <SKSDispatchSummary sksOutflows={sksOutflows} filteredSKSOutflows={filteredSKSOutflows} />
        </div>
      </div>

    </div>
  )
}