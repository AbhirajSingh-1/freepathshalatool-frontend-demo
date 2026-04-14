// Frontend/src/pages/Payments.jsx
// RST Revenue Analytics: City + Sector + Society + Drive mapping, Payment Tracking
import { useState, useMemo } from 'react'
import {
  IndianRupee, X, Clock, CheckCircle, AlertCircle,
  Download, History, TrendingUp, Plus, Copy, Check,
  Hash, FileText, CreditCard, Smartphone, BarChart3,
  MapPin, Layers, List, Building2, ChevronDown, Users,
  Truck, ArrowUpRight, ArrowDownRight, Activity, Filter,
  Package, Weight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, fmtCurrency, paymentStatusColor, exportToExcel } from '../utils/helpers'
import { RADDI_ITEM_LABELS } from '../data/temp'
import { CITIES, CITY_SECTORS, GURGAON_SOCIETIES } from '../data/mockData'

const REF_MODES = [
  { value: 'upi',    label: 'UPI',       icon: Smartphone,  placeholder: 'UPI transaction ID' },
  { value: 'cash',   label: 'Cash',      icon: IndianRupee, placeholder: 'Receipt number (optional)' },
  { value: 'neft',   label: 'NEFT/IMPS', icon: CreditCard,  placeholder: 'NEFT/IMPS reference number' },
  { value: 'cheque', label: 'Cheque',    icon: FileText,    placeholder: 'Cheque number' },
  { value: 'other',  label: 'Other',     icon: Hash,        placeholder: 'Reference / transaction ID' },
]

const refModeLabel = (mode) => REF_MODES.find(r => r.value === mode)?.label || mode || '—'

const calcPayStatus = (total, paid) => {
  const t = Number(total) || 0; const p = Number(paid) || 0
  if (t === 0) return 'Not Paid'
  if (p >= t)  return 'Paid'
  if (p > 0)   return 'Partially Paid'
  return 'Not Paid'
}

function OrderIdChip({ orderId, id }) {
  const display = orderId || id
  if (!display) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700,
      color: 'var(--primary)', background: 'var(--primary-light)',
      padding: '2px 7px', borderRadius: 5,
      border: '1px solid rgba(232,82,26,0.2)', whiteSpace: 'nowrap',
    }}>
      <Hash size={9} />{display}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// A) RST Revenue Analytics — Enhanced with Drive/Mode, payment breakdown
// ─────────────────────────────────────────────────────────────────────────────

// Mini SVG bar chart
function MiniBarChart({ data, valueKey, labelKey, color = 'var(--primary)', height = 120 }) {
  if (!data.length) return null
  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1)
  const barW   = Math.min(36, Math.floor(280 / data.length) - 4)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, padding: '0 4px' }}>
      {data.map((d, i) => {
        const pct = ((d[valueKey] || 0) / maxVal) * 100
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
            <div
              title={`${d[labelKey]}: ${fmtCurrency(d[valueKey])}`}
              style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                background: color, opacity: 0.85,
                height: `${Math.max(pct, 2)}%`,
                transition: 'height 0.3s ease',
                minHeight: 3,
              }}
            />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textAlign: 'center' }}>
              {d[labelKey]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Payment donut
function PaymentDonut({ received, total, size = 64 }) {
  const pct = total > 0 ? Math.min(received / total, 1) : 0
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const stroke = pct * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct === 1 ? 'var(--secondary)' : pct > 0.5 ? 'var(--warning)' : 'var(--danger)'}
        strokeWidth="6"
        strokeDasharray={`${stroke} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-primary)">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

// Date preset helper
function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  const y = now.getFullYear(), m = now.getMonth()
  if (preset === 'today')     return { from: fmt(now), to: fmt(now) }
  if (preset === 'week')      { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: fmt(d), to: fmt(now) } }
  if (preset === 'month')     return { from: `${y}-${String(m+1).padStart(2,'0')}-01`, to: fmt(now) }
  if (preset === 'last_month'){
    const lm = m === 0 ? 11 : m - 1
    const ly = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${String(lm+1).padStart(2,'0')}-01`, to: `${ly}-${String(lm+1).padStart(2,'0')}-${String(last).padStart(2,'0')}` }
  }
  if (preset === 'quarter')   {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    return { from: fmt(d), to: fmt(now) }
  }
  if (preset === 'custom')    return { from: customFrom || '', to: customTo || '' }
  return { from: '', to: '' }
}

function RSTAnalytics({ raddiRecords, pickups }) {
  const [datePreset,    setDatePreset]    = useState('month')
  const [customFrom,    setCustomFrom]    = useState('')
  const [customTo,      setCustomTo]      = useState('')
  const [groupMode,     setGroupMode]     = useState('sector')   // sector | society | drive | kabadiwala
  const [filterCity,    setFilterCity]    = useState('')
  const [filterSector,  setFilterSector]  = useState('')
  const [filterSociety, setFilterSociety] = useState('')
  const [filterMode,    setFilterMode]    = useState('')          // '' | 'Individual' | 'Drive'
  const [filterPay,     setFilterPay]     = useState('')          // '' | 'Received' | 'Yet to Receive'
  const [showFilters,   setShowFilters]   = useState(false)

  // Date range
  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  // Cascading selects
  const uniqueCities = useMemo(() => [...new Set(raddiRecords.map(r => r.city).filter(Boolean))].sort(), [raddiRecords])
  const uniqueSectors = useMemo(() => {
    if (filterCity && CITY_SECTORS[filterCity]) return CITY_SECTORS[filterCity]
    return [...new Set(raddiRecords.filter(r => !filterCity || r.city === filterCity).map(r => r.sector).filter(Boolean))].sort()
  }, [raddiRecords, filterCity])
  const uniqueSocieties = useMemo(() => {
    if (filterCity === 'Gurgaon' && filterSector && GURGAON_SOCIETIES[filterSector]) return GURGAON_SOCIETIES[filterSector]
    return [...new Set(raddiRecords.filter(r => (!filterCity || r.city === filterCity) && (!filterSector || r.sector === filterSector)).map(r => r.society).filter(Boolean))].sort()
  }, [raddiRecords, filterCity, filterSector])

  // Filtered records
  const filtered = useMemo(() => {
    // raddiRecords = completed pickups; we also need pickup mode from the pickups array
    const pickupModeMap = {}
    ;(pickups || []).forEach(p => { pickupModeMap[p.orderId || p.id] = p.pickupMode })

    return raddiRecords.filter(r => {
      const inDate   = (!dateFrom || (r.pickupDate || '') >= dateFrom) && (!dateTo || (r.pickupDate || '') <= dateTo)
      const inCity   = !filterCity    || r.city    === filterCity
      const inSector = !filterSector  || r.sector  === filterSector
      const inSoc    = !filterSociety || r.society === filterSociety
      const mode     = pickupModeMap[r.orderId] || pickupModeMap[r.pickupId] || ''
      const inMode   = !filterMode || mode === filterMode
      const inPay    = !filterPay  || r.paymentStatus === filterPay
      return inDate && inCity && inSector && inSoc && inMode && inPay
    }).map(r => ({
      ...r,
      _pickupMode: pickupModeMap[r.orderId] || pickupModeMap[r.pickupId] || 'Individual',
    }))
  }, [raddiRecords, pickups, dateFrom, dateTo, filterCity, filterSector, filterSociety, filterMode, filterPay])

  // Aggregated KPIs
  const kpis = useMemo(() => {
    const revenue  = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const kg       = filtered.reduce((s, r) => s + (r.totalKg     || 0), 0)
    const received = filtered.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)
    const pending  = filtered.filter(r => r.paymentStatus === 'Yet to Receive').reduce((s, r) => s + (r.totalAmount || 0), 0)
    const drives   = filtered.filter(r => r._pickupMode === 'Drive').length
    const indivs   = filtered.filter(r => r._pickupMode !== 'Drive').length
    return { revenue, kg, orders: filtered.length, received, pending, drives, indivs, avgRate: kg > 0 ? Math.round(revenue / kg) : 0 }
  }, [filtered])

  // Monthly chart data (last 6 months)
  const monthlyChart = useMemo(() => {
    const m = {}
    filtered.forEach(r => {
      const key = (r.pickupDate || '').slice(0, 7)
      if (!key) return
      if (!m[key]) m[key] = { month: key, label: new Date(key + '-01').toLocaleString('default', { month: 'short' }), revenue: 0, count: 0, received: 0 }
      m[key].revenue   += r.totalAmount || 0
      m[key].count     += 1
      m[key].received  += r.paymentStatus === 'Received' ? (r.totalAmount || 0) : 0
    })
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  }, [filtered])

  // Grouped table data
  const groupedData = useMemo(() => {
    const m = {}
    filtered.forEach(r => {
      let key, label, sub
      if (groupMode === 'society')     { key = r.society || 'Unknown'; label = key; sub = r.sector || '—' }
      else if (groupMode === 'drive')  { key = r._pickupMode || 'Individual'; label = key; sub = '' }
      else if (groupMode === 'kabadiwala') { key = r.kabadiwalaName || 'Unassigned'; label = key; sub = '' }
      else                             { key = r.sector || 'Unknown'; label = key; sub = r.city || '' }

      if (!m[key]) m[key] = { key, label, sub, revenue: 0, kg: 0, orders: 0, received: 0, pending: 0 }
      m[key].revenue  += r.totalAmount || 0
      m[key].kg       += r.totalKg     || 0
      m[key].orders   += 1
      m[key].received += r.paymentStatus === 'Received' ? (r.totalAmount || 0) : 0
      m[key].pending  += r.paymentStatus === 'Yet to Receive' ? (r.totalAmount || 0) : 0
    })
    return Object.values(m).sort((a, b) => b.revenue - a.revenue)
  }, [filtered, groupMode])

  const activeFilterCount = [filterCity, filterSector, filterSociety, filterMode, filterPay].filter(Boolean).length

  const PRESETS = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'quarter', label: 'Last 3 Months' },
    { id: '', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ]

  return (
    <div>
      {/* ── Date presets ── */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Clock size={14} color="var(--primary)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Period</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }} onClick={() => setDatePreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 10, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 145 }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 145 }} />
            </div>
          </div>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="stat-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="stat-card orange">
          <div className="stat-icon"><IndianRupee size={18} /></div>
          <div className="stat-value">{fmtCurrency(kpis.revenue)}</div>
          <div className="stat-label">Total RST Revenue</div>
          <div className="stat-change up">{kpis.orders} orders</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ fontSize: 11, fontWeight: 800, background: 'var(--secondary-light)', color: 'var(--secondary)' }}>kg</div>
          <div className="stat-value">{kpis.kg.toFixed(1)}</div>
          <div className="stat-label">Raddi Collected</div>
          <div className="stat-change up">₹{kpis.avgRate}/kg avg</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle size={18} /></div>
          <div className="stat-value">{fmtCurrency(kpis.received)}</div>
          <div className="stat-label">Amount Received</div>
          <div className="stat-change up">{kpis.revenue > 0 ? Math.round((kpis.received / kpis.revenue) * 100) : 0}% collected</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><AlertCircle size={18} /></div>
          <div className="stat-value">{fmtCurrency(kpis.pending)}</div>
          <div className="stat-label">Pending Collection</div>
          <div className="stat-change down">{kpis.revenue > 0 ? Math.round((kpis.pending / kpis.revenue) * 100) : 0}% outstanding</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Truck size={18} /></div>
          <div className="stat-value">{kpis.indivs}</div>
          <div className="stat-label">Individual Pickups</div>
          <div className="stat-change up">{kpis.drives} drives</div>
        </div>
      </div>

      {/* ── Payment Collection Progress ── */}
      {kpis.revenue > 0 && (
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <PaymentDonut received={kpis.received} total={kpis.revenue} size={72} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Payment Collection Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Received', value: kpis.received, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
                { label: 'Pending',  value: kpis.pending,  color: 'var(--warning)',   bg: 'var(--warning-bg)' },
                { label: 'Write-off',value: kpis.revenue - kpis.received - kpis.pending, color: 'var(--text-muted)', bg: 'var(--border-light)' },
              ].filter(s => s.value > 0).map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70 }}>{s.label}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: s.color, width: `${Math.round((s.value / kpis.revenue) * 100)}%`, transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color, minWidth: 80, textAlign: 'right' }}>{fmtCurrency(s.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Location + Mode Filters ── */}
      <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <Filter size={14} color="var(--primary)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>
            {activeFilterCount > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{activeFilterCount}</span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setFilterCity(''); setFilterSector(''); setFilterSociety(''); setFilterMode(''); setFilterPay('') }}>
              <X size={10} /> Clear All
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {/* City */}
          <div>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <Building2 size={10} /> City
            </label>
            <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterSector(''); setFilterSociety('') }} style={{ fontSize: 12.5, width: '100%' }}>
              <option value="">All Cities</option>
              {(uniqueCities.length > 0 ? uniqueCities : CITIES).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Sector */}
          <div>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <MapPin size={10} /> Sector
            </label>
            <select value={filterSector} onChange={e => { setFilterSector(e.target.value); setFilterSociety('') }} disabled={!filterCity} style={{ fontSize: 12.5, width: '100%' }}>
              <option value="">{filterCity ? 'All Sectors' : 'Select city first'}</option>
              {uniqueSectors.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Society */}
          <div>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <List size={10} /> Society
            </label>
            <select value={filterSociety} onChange={e => setFilterSociety(e.target.value)} disabled={!filterSector} style={{ fontSize: 12.5, width: '100%' }}>
              <option value="">{filterSector ? 'All Societies' : 'Select sector first'}</option>
              {uniqueSocieties.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Pickup Mode */}
          <div>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <Truck size={10} /> Mode
            </label>
            <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ fontSize: 12.5, width: '100%' }}>
              <option value="">All Modes</option>
              <option value="Individual">Individual</option>
              <option value="Drive">Drive / Campaign</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <IndianRupee size={10} /> Payment
            </label>
            <select value={filterPay} onChange={e => setFilterPay(e.target.value)} style={{ fontSize: 12.5, width: '100%' }}>
              <option value="">All Statuses</option>
              <option value="Received">Received</option>
              <option value="Yet to Receive">Yet to Receive</option>
              <option value="Write-off">Write-off</option>
            </select>
          </div>
        </div>

        {/* Active breadcrumb chips */}
        {activeFilterCount > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {[
              { val: filterCity,    label: filterCity,    clear: () => { setFilterCity(''); setFilterSector(''); setFilterSociety('') } },
              { val: filterSector,  label: filterSector,  clear: () => { setFilterSector(''); setFilterSociety('') } },
              { val: filterSociety, label: filterSociety, clear: () => setFilterSociety('') },
              { val: filterMode,    label: filterMode,    clear: () => setFilterMode('') },
              { val: filterPay,     label: filterPay,     clear: () => setFilterPay('') },
            ].filter(c => c.val).map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11.5, fontWeight: 600, border: '1px solid rgba(232,82,26,0.2)' }}>
                {c.label}
                <button onClick={c.clear} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, display: 'flex' }}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Charts + Grouped Table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>

        {/* Monthly revenue chart */}
        <div className="card">
          <div className="card-header">
            <Activity size={15} color="var(--primary)" />
            <div className="card-title">Monthly RST Revenue</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{monthlyChart.length} months</span>
          </div>
          <div className="card-body" style={{ paddingBottom: 8 }}>
            {monthlyChart.length === 0 ? (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data for period</div>
            ) : (
              <>
                <MiniBarChart data={monthlyChart} valueKey="revenue" labelKey="label" color="var(--primary)" height={110} />
                <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {monthlyChart.slice(-3).map(m => (
                    <div key={m.month} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.label}</span>: {fmtCurrency(m.revenue)}
                      {m.revenue > 0 && <span style={{ color: 'var(--secondary)', marginLeft: 4 }}>({Math.round((m.received / m.revenue) * 100)}% rcvd)</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top sectors/societies */}
        <div className="card">
          <div className="card-header">
            <BarChart3 size={15} color="var(--secondary)" />
            <div className="card-title">Top by Revenue</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Top 5</span>
          </div>
          <div className="card-body" style={{ paddingBottom: 8 }}>
            {groupedData.length === 0 ? (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
            ) : (
              groupedData.slice(0, 5).map((g, i) => {
                const maxRev = groupedData[0].revenue || 1
                const pct    = Math.round((g.revenue / maxRev) * 100)
                return (
                  <div key={g.key} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--secondary-light)', color: 'var(--secondary)', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary)', flexShrink: 0 }}>{fmtCurrency(g.revenue)}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden', marginLeft: 24 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: `hsl(${140 + i * 10}, 50%, ${40 + i * 5}%)`, width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Group toggle + detailed table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title">Detailed Breakdown</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Group by:</span>
            {[
              { id: 'sector',      label: 'Sector', icon: <Layers size={11} /> },
              { id: 'society',     label: 'Society', icon: <List size={11} /> },
              { id: 'drive',       label: 'Mode', icon: <Truck size={11} /> },
              { id: 'kabadiwala',  label: 'Partner', icon: <Users size={11} /> },
            ].map(g => (
              <button key={g.id} className={`btn btn-sm ${groupMode === g.id ? 'btn-outline' : 'btn-ghost'}`}
                onClick={() => setGroupMode(g.id)} style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                {g.icon}{g.label}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }} onClick={() => exportToExcel(
              filtered.map(r => ({
                'Pickup Date': r.pickupDate, 'City': r.city, 'Sector': r.sector, 'Society': r.society,
                'Mode': r._pickupMode, 'Kabadiwala': r.kabadiwalaName,
                'Total KG': r.totalKg, 'Revenue (₹)': r.totalAmount,
                'Amount Paid (₹)': r.amountPaid || 0, 'Payment Status': r.paymentStatus,
              })), 'RST_Revenue_Analytics')}>
              <Download size={12} /> Export
            </button>
          </div>
        </div>
        <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>{groupMode === 'society' ? 'Society' : groupMode === 'drive' ? 'Mode' : groupMode === 'kabadiwala' ? 'Partner' : 'Sector'}</th>
                {groupMode === 'society' && <th>Sector</th>}
                <th>Orders</th>
                <th>Weight (kg)</th>
                <th>Revenue (₹)</th>
                <th>Received</th>
                <th>Pending</th>
                <th>Collection</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>No data for selected filters</td></tr>
              ) : groupedData.map(g => {
                const collPct = g.revenue > 0 ? Math.round((g.received / g.revenue) * 100) : 0
                return (
                  <tr key={g.key}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</td>
                    {groupMode === 'society' && <td style={{ fontSize: 12, color: 'var(--text-muted)' }}><MapPin size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{g.sub}</td>}
                    <td style={{ fontWeight: 600 }}>{g.orders}</td>
                    <td>{g.kg.toFixed(1)} kg</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmtCurrency(g.revenue)}</td>
                    <td style={{ color: 'var(--secondary)', fontWeight: 700 }}>{g.received > 0 ? fmtCurrency(g.received) : '—'}</td>
                    <td style={{ color: g.pending > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: g.pending > 0 ? 700 : 400 }}>
                      {g.pending > 0 ? fmtCurrency(g.pending) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', borderRadius: 3, background: collPct === 100 ? 'var(--secondary)' : collPct > 50 ? 'var(--warning)' : 'var(--danger)', width: `${collPct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{collPct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {groupedData.length > 0 && (
                <tr style={{ background: 'var(--secondary-light)', fontWeight: 700 }}>
                  <td colSpan={groupMode === 'society' ? 2 : 1} style={{ fontWeight: 800, fontSize: 13 }}>Grand Total</td>
                  <td>{kpis.orders}</td>
                  <td>{kpis.kg.toFixed(1)} kg</td>
                  <td style={{ color: 'var(--primary)' }}>{fmtCurrency(kpis.revenue)}</td>
                  <td style={{ color: 'var(--secondary)' }}>{fmtCurrency(kpis.received)}</td>
                  <td style={{ color: kpis.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{kpis.pending > 0 ? fmtCurrency(kpis.pending) : '—'}</td>
                  <td style={{ fontSize: 12, fontWeight: 700 }}>
                    {kpis.revenue > 0 ? `${Math.round((kpis.received / kpis.revenue) * 100)}% rcvd` : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// B) Kabadiwala Payment Tracking — synced via AppContext
// ─────────────────────────────────────────────────────────────────────────────
function KabadiwalaTracking({ pickups, kabadiwalas, updatePickup }) {
  const [modal,       setModal]      = useState(null)
  const [histModal,   setHistModal]  = useState(null)
  const [saving,      setSaving]     = useState(false)
  const [highlightId, setHighlight]  = useState(null)
  const [copied,      setCopied]     = useState(null)
  const [editAdditional, setEditAmt] = useState('')
  const [editDate,    setEditDate]   = useState('')
  const [editNotes,   setEditNotes]  = useState('')
  const [editRefMode, setEditRef]    = useState('upi')
  const [editRefVal,  setEditRefVal] = useState('')
  const [refError,    setRefError]   = useState('')
  const [filterKab,   setFilterKab]  = useState('All')
  const [filterStatus,setFilterStat] = useState('All')

  const kabNames = [...new Set(pickups.map(p => p.kabadiwala).filter(Boolean))]
  const filtered = pickups.filter(p => {
    if (p.totalValue === 0 && p.status !== 'Completed') return false
    const matchKab  = filterKab === 'All'    || p.kabadiwala === filterKab
    const matchStat = filterStatus === 'All' || p.paymentStatus === filterStatus
    return matchKab && matchStat
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const totalValue   = filtered.reduce((s, p) => s + (p.totalValue  || 0), 0)
  const totalPaid    = filtered.reduce((s, p) => s + (p.amountPaid  || 0), 0)
  const totalPending = totalValue - totalPaid

  const kabSummary = useMemo(() => {
    const map = {}
    filtered.forEach(p => {
      const kab = p.kabadiwala || 'Unassigned'
      if (!map[kab]) map[kab] = { name: kab, total: 0, paid: 0, pending: 0, count: 0 }
      map[kab].total   += p.totalValue  || 0
      map[kab].paid    += p.amountPaid  || 0
      map[kab].pending += (p.totalValue || 0) - (p.amountPaid || 0)
      map[kab].count   += 1
    })
    return Object.values(map).sort((a, b) => b.pending - a.pending)
  }, [filtered])

  const openEdit = (p) => {
    setModal(p)
    setEditAmt(String(Math.max(0, (p.totalValue || 0) - (p.amountPaid || 0))))
    setEditDate(new Date().toISOString().slice(0, 10))
    setEditNotes(''); setEditRef('upi'); setEditRefVal(''); setRefError('')
  }

  const savePayment = async () => {
    if (!editAdditional || Number(editAdditional) <= 0) { setRefError('Enter a valid amount.'); return }
    if (editRefMode !== 'cash' && !editRefVal.trim()) { setRefError(`Enter ${refModeLabel(editRefMode)} reference.`); return }
    setSaving(true)
    const additional   = Number(editAdditional) || 0
    const newTotalPaid = Math.min((modal.amountPaid || 0) + additional, modal.totalValue || 0)
    const status       = calcPayStatus(modal.totalValue, newTotalPaid)
    const newEntry     = { date: editDate, amount: additional, cumulative: newTotalPaid, notes: editNotes.trim(), refMode: editRefMode, refValue: editRefVal.trim() }
    updatePickup(modal.id, {
      amountPaid:    newTotalPaid,
      paymentStatus: status,
      payHistory:    [...(modal.payHistory || []), newEntry],
    })
    setHighlight(modal.id); setTimeout(() => setHighlight(null), 2500)
    setModal(null); setSaving(false)
  }

  const copyRef = (val) => { navigator.clipboard.writeText(val).catch(() => {}); setCopied(val); setTimeout(() => setCopied(null), 1500) }
  const selRef  = REF_MODES.find(r => r.value === editRefMode)
  const prevAmt = modal ? Math.max(0, (modal.totalValue || 0) - (modal.amountPaid || 0)) : 0
  const previewNewTotal  = modal ? Math.min((modal.amountPaid || 0) + (Number(editAdditional) || 0), modal.totalValue || 0) : 0
  const previewRemaining = modal ? Math.max(0, (modal.totalValue || 0) - previewNewTotal) : 0
  const previewStatus    = modal ? calcPayStatus(modal.totalValue, previewNewTotal) : ''

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card orange"><div className="stat-icon"><TrendingUp size={18}/></div><div className="stat-value">{fmtCurrency(totalValue)}</div><div className="stat-label">Total RST Value</div></div>
        <div className="stat-card green"><div className="stat-icon"><CheckCircle size={18}/></div><div className="stat-value">{fmtCurrency(totalPaid)}</div><div className="stat-label">Total Received</div></div>
        <div className="stat-card red"><div className="stat-icon"><Clock size={18}/></div><div className="stat-value">{fmtCurrency(totalPending)}</div><div className="stat-label">Total Pending</div></div>
        <div className="stat-card blue"><div className="stat-icon"><AlertCircle size={18}/></div><div className="stat-value">{filtered.filter(p => p.paymentStatus !== 'Paid').length}</div><div className="stat-label">Unpaid Entries</div></div>
      </div>

      {kabSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: 13 }}>Pickup Partner Summary</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>Live — updates on payment</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
            {kabSummary.map((k, i) => (
              <div key={k.name} style={{ padding: '12px 16px', borderRight: (i + 1) % 3 !== 0 ? '1px solid var(--border-light)' : 'none', borderBottom: Math.floor(i / 3) < Math.floor((kabSummary.length - 1) / 3) ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{k.name}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Total</div><div style={{ fontWeight: 700 }}>{fmtCurrency(k.total)}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Paid</div><div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{fmtCurrency(k.paid)}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Pending</div><div style={{ fontWeight: 700, color: k.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{k.pending > 0 ? fmtCurrency(k.pending) : '✓ Clear'}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="filter-bar" style={{ flexWrap:'wrap', gap:10, marginBottom:16 }}>
        <select value={filterKab} onChange={e => setFilterKab(e.target.value)} style={{ flex:'1 1 160px' }}>
          <option value="All">All Kabadiwalas</option>
          {kabNames.map(k => <option key={k}>{k}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStat(e.target.value)} style={{ flex:'1 1 160px' }}>
          <option value="All">All Payment Status</option>
          <option>Paid</option><option>Not Paid</option><option>Partially Paid</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(filtered.map(p => ({
          'Order ID': p.orderId || p.id, 'Donor': p.donorName, 'Society': p.society, 'Sector': p.sector,
          'Kabadiwala': p.kabadiwala || '—', 'Date': p.date, 'Total Value (₹)': p.totalValue,
          'Amount Paid (₹)': p.amountPaid, 'Remaining (₹)': (p.totalValue||0)-(p.amountPaid||0),
          'Payment Status': p.paymentStatus,
        })),'Payments_Report')} style={{ marginLeft:'auto' }}>
          <Download size={13}/> Export
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><IndianRupee size={24}/></div><h3>No records</h3><p>Adjust filters.</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {filtered.map(p => {
            const rem  = (p.totalValue||0) - (p.amountPaid||0)
            const pct  = p.totalValue > 0 ? Math.min(100, Math.round(((p.amountPaid||0)/p.totalValue)*100)) : 0
            const lastP = (p.payHistory||[]).slice(-1)[0]
            return (
              <div key={p.id} className="card" style={{ transition:'box-shadow 0.3s', boxShadow: highlightId===p.id ? '0 0 0 2px var(--secondary)' : undefined }}>
                <div className="card-body">
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <OrderIdChip orderId={p.orderId} id={p.id} />
                        <span className={`badge ${paymentStatusColor(p.paymentStatus)}`} style={{ fontSize:11 }}>{p.paymentStatus}</span>
                      </div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{p.donorName}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{fmtDate(p.date)} · {p.kabadiwala||'No kabadiwala'}</div>
                      {(p.society || p.sector) && (
                        <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:3, display:'flex', alignItems:'center', gap:4 }}>
                          <MapPin size={10} />
                          {p.society && <span>{p.society}</span>}
                          {p.society && p.sector && <span style={{ color:'var(--border)' }}>·</span>}
                          {p.sector && <span>{p.sector}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    {[{val:fmtCurrency(p.totalValue),label:'Total',bg:'var(--bg)',col:'var(--text-primary)'},{val:fmtCurrency(p.amountPaid||0),label:'Paid',bg:'var(--secondary-light)',col:'var(--secondary)'},{val:rem>0?fmtCurrency(rem):'✓',label:'Due',bg:rem>0?'var(--danger-bg)':'var(--bg)',col:rem>0?'var(--danger)':'var(--text-muted)'}].map(item => (
                      <div key={item.label} style={{ flex:'1 1 80px', background:item.bg, borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                        <div style={{ fontWeight:700, fontSize:14, color:item.col }}>{item.val}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {p.totalValue > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:3, transition:'width 0.4s', width:`${pct}%`, background:pct===100?'var(--secondary)':pct>0?'var(--warning)':'var(--danger)' }} />
                      </div>
                      <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:4 }}>{pct}% paid</div>
                    </div>
                  )}

                  {lastP?.refValue && (
                    <div style={{ marginBottom:12, padding:'7px 10px', background:'var(--bg)', borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
                      <Hash size={11} color="var(--text-muted)"/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', fontWeight:600 }}>{refModeLabel(lastP.refMode)} ref</div>
                        <div style={{ fontSize:12, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lastP.refValue}</div>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyRef(lastP.refValue)}>
                        {copied===lastP.refValue ? <Check size={12} color="var(--secondary)"/> : <Copy size={12}/>}
                      </button>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:8 }}>
                    {(p.payHistory||[]).length > 0 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setHistModal(p)}>
                        <History size={12}/> History ({p.payHistory.length})
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => openEdit(p)} disabled={p.paymentStatus==='Paid'}>
                      <Plus size={12}/> {p.paymentStatus==='Paid' ? 'Fully Paid ✓' : 'Record Payment'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Record Payment Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <IndianRupee size={18} color="var(--primary)"/>
              <div className="modal-title">Record Payment — {modal.donorName}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(null)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              {(modal.orderId || modal.id) && (
                <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:600 }}>Order:</span>
                  <OrderIdChip orderId={modal.orderId} id={modal.id} />
                  {(modal.society || modal.sector) && (
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} />
                      {[modal.society, modal.sector].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              )}
              <div style={{ background:'var(--bg)', borderRadius:10, padding:16, marginBottom:20, display:'flex', gap:16, flexWrap:'wrap' }}>
                {[{label:'Total Value',val:fmtCurrency(modal.totalValue),col:'var(--text-primary)'},{label:'Already Paid',val:fmtCurrency(modal.amountPaid||0),col:'var(--secondary)'},{label:'Remaining',val:fmtCurrency(prevAmt),col:'var(--danger)'}].map(item => (
                  <div key={item.label} style={{ flex:'1 1 80px' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', fontWeight:600 }}>{item.label}</div>
                    <div style={{ fontWeight:700, fontSize:17, fontFamily:'var(--font-display)', color:item.col }}>{item.val}</div>
                  </div>
                ))}
              </div>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Amount Received Now (₹) <span className="required">*</span></label>
                  <input type="number" min={0} max={prevAmt} inputMode="numeric" value={editAdditional}
                    onChange={e => { setEditAmt(e.target.value); setRefError('') }} placeholder={`Max ₹${prevAmt}`} autoFocus />
                  {editAdditional !== '' && (
                    <div style={{ marginTop:10, padding:'10px 14px', background:'var(--bg)', borderRadius:8, display:'flex', gap:16, flexWrap:'wrap', fontSize:13 }}>
                      <div>New total: <strong style={{ color:'var(--secondary)' }}>{fmtCurrency(previewNewTotal)}</strong></div>
                      <div>Remaining: <strong style={{ color:previewRemaining>0?'var(--danger)':'var(--secondary)' }}>{previewRemaining>0?fmtCurrency(previewRemaining):'₹0 ✓'}</strong></div>
                      <div>Status: <span className={`badge ${paymentStatusColor(previewStatus)}`}>{previewStatus}</span></div>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Payment Date <span className="required">*</span></label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Payment Method <span className="required">*</span></label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {REF_MODES.map(r => { const Icon = r.icon; return (
                      <button key={r.value} type="button" onClick={() => { setEditRef(r.value); setRefError('') }}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, fontSize:12.5, cursor:'pointer', fontWeight:editRefMode===r.value?700:400, border:`1.5px solid ${editRefMode===r.value?'var(--primary)':'var(--border)'}`, background:editRefMode===r.value?'var(--primary-light)':'transparent', color:editRefMode===r.value?'var(--primary)':'var(--text-secondary)', transition:'all 0.15s' }}>
                        <Icon size={13}/>{r.label}
                      </button>
                    )})}
                  </div>
                </div>
                <div className="form-group full">
                  <label>{selRef?.label} Reference{editRefMode !== 'cash' ? <span className="required"> *</span> : <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)', marginLeft:4 }}>(optional)</span>}</label>
                  <div style={{ position:'relative' }}>
                    <Hash size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
                    <input value={editRefVal} onChange={e => { setEditRefVal(e.target.value); setRefError('') }} placeholder={selRef?.placeholder} style={{ paddingLeft:34 }} />
                  </div>
                  {refError && <div style={{ fontSize:12, color:'var(--danger)', marginTop:5, display:'flex', alignItems:'center', gap:5 }}><AlertCircle size={12}/>{refError}</div>}
                </div>
                <div className="form-group full">
                  <label>Notes</label>
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes about this payment…" style={{ minHeight:60 }} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePayment} disabled={saving || !editAdditional || Number(editAdditional) <= 0}>
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {histModal && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setHistModal(null)}>
          <div className="modal" style={{ maxWidth:540 }}>
            <div className="modal-header">
              <History size={18} color="var(--info)"/>
              <div className="modal-title">Payment History — {histModal.donorName}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setHistModal(null)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              {(histModal.orderId || histModal.id) && (
                <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>Order:</span>
                  <OrderIdChip orderId={histModal.orderId} id={histModal.id} />
                </div>
              )}
              {(histModal.payHistory||[]).length === 0 ? (
                <div className="empty-state" style={{ padding:32 }}><p>No payment history yet.</p></div>
              ) : [...(histModal.payHistory||[])].reverse().map((h, i, arr) => {
                const RefIcon = REF_MODES.find(r => r.value===h.refMode)?.icon || Hash
                return (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 0', borderBottom:i<arr.length-1?'1px solid var(--border-light)':'none' }}>
                    <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:'var(--secondary-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <RefIcon size={16} color="var(--secondary)"/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:15, color:'var(--secondary)' }}>+{fmtCurrency(h.amount)}</span>
                        <span className="badge badge-muted" style={{ fontSize:10 }}>{refModeLabel(h.refMode)}</span>
                      </div>
                      {h.refValue && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, padding:'5px 10px', background:'var(--bg)', borderRadius:6, border:'1px solid var(--border-light)' }}>
                          <Hash size={11} color="var(--text-muted)"/>
                          <span style={{ fontSize:12, fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.refValue}</span>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyRef(h.refValue)}>
                            {copied===h.refValue ? <Check size={11} color="var(--secondary)"/> : <Copy size={11}/>}
                          </button>
                        </div>
                      )}
                      {h.notes && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:5, fontStyle:'italic' }}>{h.notes}</div>}
                    </div>
                    <div style={{ textAlign:'right', fontSize:12.5, color:'var(--text-muted)', flexShrink:0 }}>{fmtDate(h.date)}</div>
                  </div>
                )
              })}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setHistModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function Payments() {
  const { pickups, raddiRecords, kabadiwalas, updatePickup } = useApp()
  const [view, setView] = useState('analytics')

  return (
    <div className="page-body">
      <div style={{ marginBottom: 24 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')}>
            <BarChart3 size={13} style={{ marginRight: 4 }} /> RST Revenue Analytics
          </button>
          <button className={`tab ${view === 'kabadiwala' ? 'active' : ''}`} onClick={() => setView('kabadiwala')}>
            <IndianRupee size={13} style={{ marginRight: 4 }} /> Kabadiwala Payments
          </button>
        </div>
      </div>

      {view === 'analytics'  && <RSTAnalytics raddiRecords={raddiRecords} pickups={pickups} />}
      {view === 'kabadiwala' && <KabadiwalaTracking pickups={pickups} kabadiwalas={kabadiwalas} updatePickup={updatePickup} />}
    </div>
  )
}