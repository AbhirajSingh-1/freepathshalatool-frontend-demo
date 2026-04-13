// Frontend/src/pages/Payments.jsx
// RST Revenue Analytics: Sector + Society mapping, Monthly default, Detailed/Summary views
// Payment Tracking: Global sync via AppContext, real-time kabadiwala stats
import { useState, useMemo } from 'react'
import {
  IndianRupee, X, Clock, CheckCircle, AlertCircle,
  Download, History, TrendingUp, Plus, Copy, Check,
  Hash, FileText, CreditCard, Smartphone, BarChart3,
  MapPin, Layers, List,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, fmtCurrency, paymentStatusColor, exportToExcel } from '../utils/helpers'
import { RADDI_ITEM_LABELS } from '../data/temp'

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

// ── Order ID chip ─────────────────────────────────────────────────────────────
function OrderIdChip({ orderId, id }) {
  const display = orderId || id
  if (!display) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700,
      color: 'var(--primary)', background: 'var(--primary-light)',
      padding: '2px 7px', borderRadius: 5,
      border: '1px solid rgba(232,82,26,0.2)',
      whiteSpace: 'nowrap',
    }}>
      <Hash size={9} />{display}
    </span>
  )
}

// ── Society + Sector label helper ─────────────────────────────────────────────
function SocietySectorLabel({ society, sector }) {
  if (!society && !sector) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <div>
      {society && <div style={{ fontWeight: 600, fontSize: 13 }}>{society}</div>}
      {sector  && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sector}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// A) RST Revenue Analytics — Sector + Society Mapping
// ─────────────────────────────────────────────────────────────────────────────
function RSTAnalytics({ raddiRecords }) {
  // Date filters
  const [datePreset, setDatePreset] = useState('month')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  // Time grouping: monthly (default) | daily
  const [viewType, setViewType] = useState('monthly')

  // Location grouping: society (detailed) | sector (summary)
  const [groupMode, setGroupMode] = useState('sector') // 'society' | 'sector'

  // Filters
  const [filterSector,  setFilterSector]  = useState('')
  const [filterSociety, setFilterSociety] = useState('')

  // Derive unique sectors from records
  const uniqueSectors = useMemo(() =>
    [...new Set(raddiRecords.map(r => r.sector).filter(Boolean))].sort()
  , [raddiRecords])

  // Societies cascade from selected sector (or all if none selected)
  const uniqueSocieties = useMemo(() => {
    const base = raddiRecords.filter(r => !filterSector || r.sector === filterSector)
    return [...new Set(base.map(r => r.society).filter(Boolean))].sort()
  }, [raddiRecords, filterSector])

  const dateRange = useMemo(() => {
    const now = new Date()
    if (datePreset === 'today') return { from: now.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
    if (datePreset === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) } }
    if (datePreset === 'month') { const d = new Date(now); d.setDate(1); return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) } }
    return { from: dateFrom, to: dateTo }
  }, [datePreset, dateFrom, dateTo])

  // Base filtered records
  const filtered = useMemo(() => raddiRecords.filter(r => {
    const matchDate    = (!dateRange.from || r.pickupDate >= dateRange.from) && (!dateRange.to || r.pickupDate <= dateRange.to)
    const matchSector  = !filterSector  || r.sector  === filterSector
    const matchSociety = !filterSociety || r.society === filterSociety
    return matchDate && matchSector && matchSociety && r.orderStatus === 'Completed'
  }), [raddiRecords, dateRange, filterSector, filterSociety])

  // ── Time-series grouping (monthly or daily) ──────────────────────────────
  const timeGrouped = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      const timeKey = viewType === 'monthly'
        ? (r.pickupDate || '').slice(0, 7)
        : (r.pickupDate || '')
      if (!timeKey) return
      if (!map[timeKey]) map[timeKey] = { key: timeKey, revenue: 0, kg: 0, count: 0, societies: new Set(), sectors: new Set() }
      map[timeKey].revenue += r.totalAmount || 0
      map[timeKey].kg      += r.totalKg     || 0
      map[timeKey].count   += 1
      if (r.society) map[timeKey].societies.add(r.society)
      if (r.sector)  map[timeKey].sectors.add(r.sector)
    })
    return Object.values(map)
      .map(g => ({
        ...g,
        societies: [...g.societies].join(', '),
        sectors:   [...g.sectors].join(', '),
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [filtered, viewType])

  // ── Location grouping ────────────────────────────────────────────────────
  // Detailed = by Society  |  Summary = by Sector
  const locationGrouped = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      const key  = groupMode === 'society' ? (r.society || 'Unknown') : (r.sector || 'Unknown')
      const sec  = r.sector  || '—'
      const soc  = r.society || '—'
      if (!map[key]) map[key] = { key, sector: sec, society: soc, revenue: 0, kg: 0, orders: 0 }
      map[key].revenue += r.totalAmount || 0
      map[key].kg      += r.totalKg     || 0
      map[key].orders  += 1
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [filtered, groupMode])

  const totalRevenue = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const totalKg      = filtered.reduce((s, r) => s + (r.totalKg     || 0), 0)
  const totalOrders  = filtered.length
  const avgRate      = totalKg > 0 ? Math.round(totalRevenue / totalKg) : 0

  // When sector filter changes, reset society filter
  const handleSectorChange = (val) => {
    setFilterSector(val)
    setFilterSociety('')
  }

  return (
    <div>
      {/* KPI Row */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card orange">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><TrendingUp size={18}/></div>
          <div className="stat-value">{fmtCurrency(totalRevenue)}</div>
          <div className="stat-label">Total Revenue (filtered)</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>kg</div>
          <div className="stat-value">{totalKg} kg</div>
          <div className="stat-label">Total Raddi Collected</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>#</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-label">Completed Orders</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon" style={{ background: 'var(--accent-light)', color: '#92400E' }}>₹/kg</div>
          <div className="stat-value">{avgRate}</div>
          <div className="stat-label">Avg Rate (₹/kg)</div>
        </div>
      </div>

      {/* Controls row 1: Date presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['today','Today'],['week','Last 7 Days'],['month','This Month'],['custom','Custom']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${datePreset === v ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDatePreset(v)}>{l}</button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* Controls row 2: Sector + Society filters + view toggles */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end', padding: '12px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)' }}>

        {/* Sector filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 160px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> Sector
          </label>
          <select value={filterSector} onChange={e => handleSectorChange(e.target.value)} style={{ fontSize: 13 }}>
            <option value="">All Sectors</option>
            {uniqueSectors.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Society filter — cascades from sector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 180px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> Society
            {filterSector && <span style={{ fontSize: 10, color: 'var(--info)', marginLeft: 2 }}>in {filterSector}</span>}
          </label>
          <select value={filterSociety} onChange={e => setFilterSociety(e.target.value)} style={{ fontSize: 13 }}>
            <option value="">{filterSector ? `All societies in ${filterSector}` : 'All Societies'}</option>
            {uniqueSocieties.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {(filterSector || filterSociety) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterSector(''); setFilterSociety('') }} style={{ alignSelf: 'flex-end' }}>
            <X size={11} /> Clear
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Time grouping toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Time View</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['monthly','Monthly'],['daily','Daily']].map(([v, l]) => (
              <button key={v} className={`btn btn-sm ${viewType === v ? 'btn-outline' : 'btn-ghost'}`}
                onClick={() => setViewType(v)} style={{ fontSize: 12 }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Location grouping toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Group By</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${groupMode === 'sector' ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setGroupMode('sector')}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              title="Summary — grouped by Sector"
            >
              <Layers size={12} /> Sector
            </button>
            <button
              className={`btn btn-sm ${groupMode === 'society' ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setGroupMode('society')}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              title="Detailed — grouped by Society"
            >
              <List size={12} /> Society
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {(filterSector || filterSociety) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>Showing:</span>
          {filterSector && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--info)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(59,130,246,0.2)' }}>
              Sector: {filterSector}
              <button onClick={() => handleSectorChange('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}><X size={10}/></button>
            </span>
          )}
          {filterSociety && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--secondary-light)', color: 'var(--secondary)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(27,94,53,0.2)' }}>
              Society: {filterSociety}
              <button onClick={() => setFilterSociety('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}><X size={10}/></button>
            </span>
          )}
        </div>
      )}

      <div className="two-col" style={{ marginBottom: 20 }}>

        {/* Time-series table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {viewType === 'monthly' ? 'Monthly' : 'Daily'} Revenue
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {timeGrouped.length} period{timeGrouped.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>{viewType === 'monthly' ? 'Month' : 'Date'}</th>
                  <th>Orders</th>
                  <th>Kg</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {timeGrouped.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No data for selected range</td></tr>
                ) : timeGrouped.map(g => (
                  <tr key={g.key}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600 }}>{g.key}</td>
                    <td style={{ fontWeight: 600 }}>{g.count}</td>
                    <td style={{ fontWeight: 600 }}>{g.kg.toFixed(1)} kg</td>
                    <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{fmtCurrency(g.revenue)}</td>
                  </tr>
                ))}
                {timeGrouped.length > 0 && (
                  <tr style={{ background: 'var(--secondary-light)' }}>
                    <td style={{ fontWeight: 700, fontSize: 12.5 }}>Total</td>
                    <td style={{ fontWeight: 700 }}>{totalOrders}</td>
                    <td style={{ fontWeight: 700 }}>{totalKg.toFixed(1)} kg</td>
                    <td style={{ fontWeight: 800, color: 'var(--secondary)' }}>{fmtCurrency(totalRevenue)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Location grouping table */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div className="card-title">
                {groupMode === 'society' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <List size={14} color="var(--secondary)" /> Detailed — by Society
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} color="var(--primary)" /> Summary — by Sector
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {locationGrouped.length} {groupMode === 'society' ? 'societ' : 'sector'}{locationGrouped.length !== 1 ? (groupMode === 'society' ? 'ies' : 's') : (groupMode === 'society' ? 'y' : '')}
            </span>
          </div>
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  {groupMode === 'society'
                    ? <th>Society (Sector)</th>
                    : <th>Sector</th>
                  }
                  <th>Orders</th>
                  <th>Kg</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {locationGrouped.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No data</td></tr>
                ) : locationGrouped.map(g => (
                  <tr key={g.key}>
                    <td>
                      {groupMode === 'society' ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{g.key}</div>
                          {g.sector !== '—' && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                              <MapPin size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                              {g.sector}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{g.key}</div>
                      )}
                    </td>
                    <td>{g.orders}</td>
                    <td style={{ fontWeight: 600 }}>{g.kg.toFixed(1)} kg</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmtCurrency(g.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Export */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(
          filtered.map(r => ({
            'Pickup Date': r.pickupDate,
            'Society': r.society,
            'Sector': r.sector,
            'Society (Sector)': r.society && r.sector ? `${r.society} (${r.sector})` : (r.society || r.sector || '—'),
            'Kabadiwala': r.kabadiwalaName,
            'Total KG': r.totalKg,
            'Revenue (₹)': r.totalAmount,
            'Payment': r.paymentStatus,
            'Order': r.orderStatus,
          })),
          'RST_Revenue_Analytics'
        )}>
          <Download size={13} /> Export Analytics
        </button>
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

  // Live kabadiwala summary derived from filtered pickups (always synced)
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
    // updatePickup handles sync to raddiRecords AND kabadiwalas via AppContext
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
      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card orange"><div className="stat-icon" style={{ background:'var(--primary-light)',color:'var(--primary)' }}><TrendingUp size={18}/></div><div className="stat-value">{fmtCurrency(totalValue)}</div><div className="stat-label">Total RST Value</div></div>
        <div className="stat-card green"><div className="stat-icon" style={{ background:'var(--secondary-light)',color:'var(--secondary)' }}><CheckCircle size={18}/></div><div className="stat-value">{fmtCurrency(totalPaid)}</div><div className="stat-label">Total Received</div></div>
        <div className="stat-card red"><div className="stat-icon" style={{ background:'var(--danger-bg)',color:'var(--danger)' }}><Clock size={18}/></div><div className="stat-value">{fmtCurrency(totalPending)}</div><div className="stat-label">Total Pending</div></div>
        <div className="stat-card blue"><div className="stat-icon" style={{ background:'var(--info-bg)',color:'var(--info)' }}><AlertCircle size={18}/></div><div className="stat-value">{filtered.filter(p => p.paymentStatus !== 'Paid').length}</div><div className="stat-label">Unpaid Entries</div></div>
      </div>

      {/* Kabadiwala quick summary — live from pickups state */}
      {kabSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: 13 }}>Pickup Partner Summary</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>Live — updates on payment</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
            {kabSummary.map((k, i) => (
              <div key={k.name} style={{
                padding: '12px 16px',
                borderRight: (i + 1) % 3 !== 0 ? '1px solid var(--border-light)' : 'none',
                borderBottom: Math.floor(i / 3) < Math.floor((kabSummary.length - 1) / 3) ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{k.name}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
                    <div style={{ fontWeight: 700 }}>{fmtCurrency(k.total)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Paid</div>
                    <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{fmtCurrency(k.paid)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Pending</div>
                    <div style={{ fontWeight: 700, color: k.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {k.pending > 0 ? fmtCurrency(k.pending) : '✓ Clear'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
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
          'Order ID': p.orderId || p.id,
          'Donor': p.donorName,
          'Society': p.society,
          'Sector': p.sector,
          'Kabadiwala': p.kabadiwala || '—',
          'Date': p.date,
          'Total Value (₹)': p.totalValue,
          'Amount Paid (₹)': p.amountPaid,
          'Remaining (₹)': (p.totalValue||0)-(p.amountPaid||0),
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
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                        {fmtDate(p.date)} · {p.kabadiwala||'No kabadiwala'}
                      </div>
                      {/* Society + Sector */}
                      {(p.society || p.sector) && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} />
                          {p.society && <span>{p.society}</span>}
                          {p.society && p.sector && <span style={{ color: 'var(--border)' }}>·</span>}
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

      {view === 'analytics'  && <RSTAnalytics raddiRecords={raddiRecords} />}
      {view === 'kabadiwala' && <KabadiwalaTracking pickups={pickups} kabadiwalas={kabadiwalas} updatePickup={updatePickup} />}
    </div>
  )
}