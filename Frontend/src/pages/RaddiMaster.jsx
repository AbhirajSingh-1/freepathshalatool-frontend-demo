/**
 * RaddiMaster.jsx — Core operational data page
 * Live data comes from AppContext.raddiRecords (seed + live recorded pickups).
 * Filters: Today / Last 7 Days / Monthly / Custom range
 * Analytics: Total KG, Total Revenue, daily/monthly breakdown
 */
import { useState, useMemo } from 'react'
import {
  Search, SlidersHorizontal, X, Download,
  ChevronLeft, ChevronRight, Weight, IndianRupee,
  TrendingUp, Package,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  RADDI_ITEM_LABELS,
  RADDI_PAYMENT_STATUSES,
  RADDI_ORDER_STATUSES,
  RADDI_DONOR_STATUSES,
  UNIQUE_SECTORS,
} from '../data/raddimockData'
import { fmtDate, exportToExcel } from '../utils/helpers'

const PAGE_SIZE = 10

// ── Badge helpers ─────────────────────────────────────────────────────────────
const donorBadge = (s) => ({
  'Active':     { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
  'Pickup Due': { bg: 'var(--info-bg)',          color: 'var(--info)' },
  'At Risk':    { bg: 'var(--warning-bg)',        color: '#92400E' },
  'Churned':    { bg: 'var(--danger-bg)',         color: 'var(--danger)' },
}[s] || { bg: 'var(--border-light)', color: 'var(--text-muted)' })

const payBadge = (s) => ({
  'Received':       { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
  'Yet to Receive': { bg: 'var(--warning-bg)',       color: '#92400E' },
  'Write-off':      { bg: 'var(--danger-bg)',        color: 'var(--danger)' },
}[s] || { bg: 'var(--border-light)', color: 'var(--text-muted)' })

const orderBadge = (s) => ({
  'Completed': { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
  'Pending':   { bg: 'var(--info-bg)',          color: 'var(--info)' },
  'Postponed': { bg: 'var(--warning-bg)',       color: '#92400E' },
  'Cancelled': { bg: 'var(--danger-bg)',        color: 'var(--danger)' },
}[s] || { bg: 'var(--border-light)', color: 'var(--text-muted)' })

function Badge({ label, style: s }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', ...s }}>{label}</span>
}

// ── Date preset helper ────────────────────────────────────────────────────────
function getPresetRange(preset) {
  const t = new Date()
  const fmt = (d) => d.toISOString().slice(0, 10)
  if (preset === 'today')  return { from: fmt(t), to: fmt(t) }
  if (preset === 'last7')  { const d = new Date(t); d.setDate(d.getDate() - 7); return { from: fmt(d), to: fmt(t) } }
  if (preset === 'month')  return { from: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`, to: fmt(t) }
  return { from: '', to: '' }
}

// ── Monthly aggregation ────────────────────────────────────────────────────────
function MonthlyBreakdown({ data }) {
  const monthly = useMemo(() => {
    const m = {}
    data.forEach(r => {
      const key = (r.pickupDate || r.orderDate || '').slice(0, 7)
      if (!key) return
      if (!m[key]) m[key] = { month: key, orders: 0, kg: 0, amount: 0, received: 0 }
      m[key].orders++
      m[key].kg     += r.totalKg     || 0
      m[key].amount += r.totalAmount || 0
      if (r.paymentStatus === 'Received') m[key].received += r.totalAmount || 0
    })
    return Object.values(m).sort((a, b) => b.month.localeCompare(a.month))
  }, [data])

  if (monthly.length === 0) return null

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><div className="card-title">Monthly Aggregation</div></div>
      <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
        <table>
          <thead><tr><th>Month</th><th>Orders</th><th>Kg Collected</th><th>Total Value</th><th>Received</th><th>Pending</th></tr></thead>
          <tbody>
            {monthly.map(m => (
              <tr key={m.month}>
                <td style={{ fontWeight: 600 }}>{m.month}</td>
                <td>{m.orders}</td>
                <td style={{ fontWeight: 600 }}>{m.kg.toFixed(1)} kg</td>
                <td style={{ fontWeight: 600 }}>₹{m.amount.toLocaleString('en-IN')}</td>
                <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>₹{m.received.toLocaleString('en-IN')}</td>
                <td style={{ color: 'var(--danger)', fontWeight: 600 }}>₹{(m.amount - m.received).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function RaddiMaster() {
  const { raddiRecords } = useApp()

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search,        setSearch]       = useState('')
  const [filterSector,  setFSector]      = useState('')
  const [filterDonor,   setFDonor]       = useState('')
  const [filterPay,     setFPay]         = useState('')
  const [filterOrder,   setFOrder]       = useState('')
  const [filterKab,     setFKab]         = useState('')
  const [datePreset,    setPreset]       = useState('') // 'today'|'last7'|'month'|'custom'
  const [dateFrom,      setDateFrom]     = useState('')
  const [dateTo,        setDateTo]       = useState('')
  const [showFilters,   setShowFilters]  = useState(false)
  const [page,          setPage]         = useState(1)
  const [showMonthly,   setShowMonthly]  = useState(false)
  const [sortKey,       setSortKey]      = useState('pickupDate')
  const [sortDir,       setSortDir]      = useState('desc')

  const kabNames = useMemo(() => [...new Set(raddiRecords.map(r => r.kabadiwalaName).filter(Boolean))].sort(), [raddiRecords])

  const applyPreset = (p) => {
    setPreset(p)
    if (p !== 'custom') {
      const { from, to } = getPresetRange(p)
      setDateFrom(from); setDateTo(to)
    }
  }

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const q = search.toLowerCase()
  const filtered = useMemo(() => {
    const rows = raddiRecords.filter(r => {
      const mQ  = !q || r.name?.toLowerCase().includes(q) || r.mobile?.includes(q) || r.society?.toLowerCase().includes(q) || r.kabadiwalaName?.toLowerCase().includes(q)
      const mSe = !filterSector || r.sector === filterSector
      const mDs = !filterDonor  || r.donorStatus === filterDonor
      const mPa = !filterPay    || r.paymentStatus === filterPay
      const mOr = !filterOrder  || r.orderStatus === filterOrder
      const mKa = !filterKab    || r.kabadiwalaName === filterKab
      const mF  = !dateFrom || (r.pickupDate || '') >= dateFrom
      const mT  = !dateTo   || (r.pickupDate || '') <= dateTo
      return mQ && mSe && mDs && mPa && mOr && mKa && mF && mT
    })

    rows.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [raddiRecords, q, filterSector, filterDonor, filterPay, filterOrder, filterKab, dateFrom, dateTo, sortKey, sortDir])

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalKg     = filtered.reduce((s, r) => s + (r.totalKg     || 0), 0)
  const totalAmt    = filtered.reduce((s, r) => s + (r.totalAmount  || 0), 0)
  const totalRcvd   = filtered.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)

  const handleExport = () => exportToExcel(
    filtered.map(r => ({
      'Order ID': r.orderId, Mobile: r.mobile, Name: r.name, 'House No': r.houseNo,
      Society: r.society, Sector: r.sector, City: r.city,
      'Pickup Date': r.pickupDate, 'Order Date': r.orderDate,
      'Kabadiwala': r.kabadiwalaName, 'Kab Phone': r.kabadiwalaPhone,
      'Donor Status': r.donorStatus,
      ...RADDI_ITEM_LABELS.reduce((a, lbl, i) => ({ ...a, [lbl]: r.items?.[i] || 0 }), {}),
      'Total Kg': r.totalKg, 'Total Amount': r.totalAmount,
      'Payment Status': r.paymentStatus, 'Order Status': r.orderStatus,
    })),
    'RaddiMaster_Export'
  )

  const hasFilters = filterSector || filterDonor || filterPay || filterOrder || filterKab || dateFrom || dateTo

  const Th = ({ k, children }) => (
    <th onClick={() => sort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {children} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="page-body">
      {/* ── Analytics Row ── */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card blue">
          <div className="stat-icon"><Package size={18} /></div>
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Weight size={18} /></div>
          <div className="stat-value">{totalKg.toFixed(1)} kg</div>
          <div className="stat-label">KG Collected</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><IndianRupee size={18} /></div>
          <div className="stat-value">₹{totalAmt.toLocaleString('en-IN')}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><TrendingUp size={18} /></div>
          <div className="stat-value">₹{totalRcvd.toLocaleString('en-IN')}</div>
          <div className="stat-label">Amount Received</div>
        </div>
      </div>

      {/* ── Date Presets ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['today','Today'], ['last7','Last 7 Days'], ['month','This Month'], ['custom','Custom'], ['','All Time']].map(([v, label]) => (
          <button key={v} className={`btn btn-sm ${datePreset === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => applyPreset(v)}>
            {label}
          </button>
        ))}
        {datePreset === 'custom' && (
          <>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 140 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ width: 140 }} />
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowMonthly(m => !m)} style={{ marginLeft: 'auto' }}>
          {showMonthly ? 'Hide' : 'Show'} Monthly Breakdown
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={13} /> Export</button>
      </div>

      {showMonthly && <MonthlyBreakdown data={filtered} />}

      {/* ── Search + Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Search className="icon" />
          <input placeholder="Search name, mobile, society, kabadiwala…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <button className={`btn btn-sm ${showFilters ? 'btn-outline' : 'btn-ghost'}`} onClick={() => setShowFilters(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}>
          <SlidersHorizontal size={13} />
          {hasFilters ? <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{[filterSector,filterDonor,filterPay,filterOrder,filterKab].filter(Boolean).length}</span> : 'Filter'}
        </button>
      </div>

      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, background: 'var(--bg)', borderRadius: 10, padding: 10, border: '1px solid var(--border-light)', marginBottom: 12 }}>
          <select value={filterSector} onChange={e => { setFSector(e.target.value); setPage(1) }}><option value="">All Sectors</option>{UNIQUE_SECTORS.map(s => <option key={s}>{s}</option>)}</select>
          <select value={filterDonor}  onChange={e => { setFDonor(e.target.value);  setPage(1) }}><option value="">All Donor Status</option>{RADDI_DONOR_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <select value={filterPay}    onChange={e => { setFPay(e.target.value);    setPage(1) }}><option value="">All Payment Status</option>{RADDI_PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <select value={filterOrder}  onChange={e => { setFOrder(e.target.value);  setPage(1) }}><option value="">All Order Status</option>{RADDI_ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <select value={filterKab}    onChange={e => { setFKab(e.target.value);    setPage(1) }}><option value="">All Kabadiwalas</option>{kabNames.map(k => <option key={k}>{k}</option>)}</select>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { setFSector(''); setFDonor(''); setFPay(''); setFOrder(''); setFKab('') }}><X size={11} /> Clear</button>}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
        <strong>{filtered.length}</strong> records · Page {page} of {totalPages || 1}
      </div>

      {/* ── Main Table ── */}
      <div className="table-wrap">
        <table style={{ fontSize: 12.5 }}>
          <thead>
            <tr>
              <Th k="orderId">Order ID</Th>
              <th>Mobile</th>
              <Th k="name">Name</Th>
              <th>House No</th>
              <Th k="society">Society</Th>
              <Th k="sector">Sector</Th>
              <th>City</th>
              <Th k="pickupDate">Pickup Date</Th>
              <Th k="kabadiwalaName">Kabadiwala</Th>
              <th>Kab Phone</th>
              <Th k="orderDate">Order Date</Th>
              <Th k="donorStatus">Donor Status</Th>
              {RADDI_ITEM_LABELS.map((l, i) => <th key={i} style={{ whiteSpace: 'nowrap' }}>{l}</th>)}
              <Th k="totalKg">Total Kg</Th>
              <Th k="totalAmount">Amount (₹)</Th>
              <Th k="paymentStatus">Payment</Th>
              <Th k="orderStatus">Order</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={20} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No records match the current filters</td></tr>
            ) : pageRows.map(r => {
              const { bg: dBg, color: dC } = donorBadge(r.donorStatus)
              const { bg: pBg, color: pC } = payBadge(r.paymentStatus)
              const { bg: oBg, color: oC } = orderBadge(r.orderStatus)
              return (
                <tr key={r.orderId}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.orderId}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.mobile}</td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td>{r.houseNo}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.society}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.sector}</td>
                  <td>{r.city}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.pickupDate)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.kabadiwalaName}</td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 11.5 }}>{r.kabadiwalaPhone}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.orderDate)}</td>
                  <td><Badge label={r.donorStatus} style={{ background: dBg, color: dC }} /></td>
                  {(r.items || []).map((kg, i) => (
                    <td key={i} style={{ textAlign: 'center', color: kg > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {kg > 0 ? kg : '—'}
                    </td>
                  ))}
                  {/* Pad to 9 if items array shorter */}
                  {Array.from({ length: Math.max(0, 9 - (r.items?.length || 0)) }).map((_, i) => <td key={`pad-${i}`} style={{ color: 'var(--text-muted)' }}>—</td>)}
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{r.totalKg > 0 ? `${r.totalKg} kg` : '—'}</td>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{r.totalAmount > 0 ? `₹${r.totalAmount.toLocaleString('en-IN')}` : '—'}</td>
                  <td><Badge label={r.paymentStatus} style={{ background: pBg, color: pC }} /></td>
                  <td><Badge label={r.orderStatus}   style={{ background: oBg, color: oC }} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  )
}