import { useState, useMemo, useEffect } from 'react'
import {
  Search, Filter, X, Download, ChevronLeft, ChevronRight,
  SlidersHorizontal, ArrowUpDown, AlertTriangle, TableProperties,
} from 'lucide-react'
import {
  raddiMasterData,
  RADDI_ITEM_LABELS,
  RADDI_DONOR_STATUSES,
  RADDI_PAYMENT_STATUSES,
  RADDI_ORDER_STATUSES,
  UNIQUE_SECTORS,
  UNIQUE_SOCIETIES,
} from '../data/raddimockData'
import { fmtDate, exportToExcel } from '../utils/helpers'

// ── constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

// ── badge helpers ─────────────────────────────────────────────────────────────
const donorStatusBadge = (s) => ({
  'Active':     { bg: 'var(--secondary-light)', color: 'var(--secondary)',      label: 'Active' },
  'Pickup Due': { bg: 'var(--info-bg)',          color: 'var(--info)',           label: 'Pickup Due' },
  'At Risk':    { bg: 'var(--warning-bg)',        color: '#92400E',              label: 'At Risk' },
  'Churned':    { bg: 'var(--danger-bg)',         color: 'var(--danger)',        label: 'Churned' },
}[s] || { bg: 'var(--border-light)', color: 'var(--text-muted)', label: s })

const paymentBadge = (s) => ({
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

function Badge({ label, style: extraStyle }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      ...extraStyle,
    }}>
      {label}
    </span>
  )
}

// ── skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 18 }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div style={{
            height: 14, borderRadius: 6,
            background: 'linear-gradient(90deg, var(--border-light) 25%, var(--bg) 50%, var(--border-light) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.3s infinite',
            width: i === 0 ? 70 : i < 4 ? 90 : 60,
          }} />
        </td>
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </tr>
  )
}

// ── stat mini-cards ───────────────────────────────────────────────────────────
function StatRow({ data }) {
  const total   = data.length
  const active  = data.filter(r => r.donorStatus === 'Active').length
  const atRisk  = data.filter(r => r.donorStatus === 'At Risk').length
  const churned = data.filter(r => r.donorStatus === 'Churned').length
  const totalKg = data.reduce((s, r) => s + (r.totalKg || 0), 0)
  const totalAmt= data.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const received= data.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + r.totalAmount, 0)
  const pending = data.filter(r => r.paymentStatus === 'Yet to Receive').reduce((s, r) => s + r.totalAmount, 0)

  const cards = [
    { label: 'Total Orders',     val: total,                             color: 'blue' },
    { label: 'Active Donors',    val: active,                            color: 'green' },
    { label: 'At Risk',          val: atRisk,                            color: 'yellow' },
    { label: 'Churned',          val: churned,                           color: 'red' },
    { label: 'Total Raddi (kg)', val: `${totalKg} kg`,                   color: 'orange' },
    { label: 'Total Value',      val: `₹${totalAmt.toLocaleString('en-IN')}`, color: 'green' },
    { label: 'Received',         val: `₹${received.toLocaleString('en-IN')}`, color: 'blue' },
    { label: 'Pending',          val: `₹${pending.toLocaleString('en-IN')}`,  color: 'red' },
  ]

  return (
    <div className="stat-grid" style={{ marginBottom: 20 }}>
      {cards.map(c => (
        <div key={c.label} className={`stat-card ${c.color}`}>
          <div className="stat-value" style={{ fontSize: 20 }}>{c.val}</div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function RaddiMaster() {
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [filterSociety, setFilterSociety] = useState('')
  const [filterDonor, setFilterDonor]   = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [filterOrder, setFilterOrder]   = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [page, setPage]                 = useState(1)
  const [sortKey, setSortKey]           = useState('orderId')
  const [sortAsc, setSortAsc]           = useState(true)

  // Fake loading
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  // ── filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return raddiMasterData.filter(r => {
      const matchQ  = !q || r.name.toLowerCase().includes(q) || r.mobile.includes(q) || r.orderId.toLowerCase().includes(q)
      const matchSec = !filterSector  || r.sector      === filterSector
      const matchSoc = !filterSociety || r.society     === filterSociety
      const matchDS  = !filterDonor   || r.donorStatus === filterDonor
      const matchPS  = !filterPayment || r.paymentStatus === filterPayment
      const matchOS  = !filterOrder   || r.orderStatus  === filterOrder
      return matchQ && matchSec && matchSoc && matchDS && matchPS && matchOS
    })
  }, [search, filterSector, filterSociety, filterDonor, filterPayment, filterOrder])

  // ── sorting ────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortAsc ? av - bv : bv - av
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortAsc])

  // ── pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
    setPage(1)
  }

  const clearFilters = () => {
    setSearch(''); setFilterSector(''); setFilterSociety('')
    setFilterDonor(''); setFilterPayment(''); setFilterOrder('')
    setPage(1)
  }

  const hasFilters = search || filterSector || filterSociety || filterDonor || filterPayment || filterOrder

  // ── export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    exportToExcel(sorted.map(r => ({
      'Order ID':         r.orderId,
      'Mobile':           r.mobile,
      'Name':             r.name,
      'House No':         r.houseNo,
      'Society':          r.society,
      'Sector':           r.sector,
      'City':             r.city,
      'Pickup Date':      r.pickupDate,
      'Kabadiwala':       r.kabadiwalaName,
      'Kab Phone':        r.kabadiwalaPhone,
      'Order Date':       r.orderDate,
      'Donor Status':     r.donorStatus,
      ...Object.fromEntries(RADDI_ITEM_LABELS.map((l, i) => [`Item ${i + 1} - ${l} (kg)`, r.items[i] || 0])),
      'Total Kg':         r.totalKg,
      'Total Amount (₹)': r.totalAmount,
      'Payment Status':   r.paymentStatus,
      'Order Status':     r.orderStatus,
    })), 'RaddiMaster_Export')
  }

  // ── sort-able TH ──────────────────────────────────────────────────────────
  const Th = ({ label, field, minW = 110, sticky = false }) => (
    <th
      onClick={field ? () => toggleSort(field) : undefined}
      style={{
        padding: '10px 12px',
        minWidth: minW,
        whiteSpace: 'nowrap',
        cursor: field ? 'pointer' : 'default',
        userSelect: 'none',
        background: 'var(--surface-alt)',
        position: sticky ? 'sticky' : undefined,
        left: sticky ? 0 : undefined,
        zIndex: sticky ? 3 : 1,
        borderRight: sticky ? '2px solid var(--border)' : undefined,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {field && (
          <ArrowUpDown size={10} color={sortKey === field ? 'var(--primary)' : 'var(--text-muted)'} />
        )}
      </span>
    </th>
  )

  // ── column header colours for item columns ────────────────────────────────
  const itemColColor = 'var(--info-bg)'

  return (
    <div className="page-body">

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <StatRow data={filtered} />

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        {/* Row 1: search + toggle + export */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: 380 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, mobile, or order ID…"
              style={{ paddingLeft: 32, width: '100%', fontSize: 13 }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                <X size={12} />
              </button>
            )}
          </div>

          <button
            className={`btn btn-sm ${showFilters ? 'btn-outline' : 'btn-ghost'}`}
            onClick={() => setShowFilters(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <SlidersHorizontal size={13} />
            Filters
            {hasFilters && (
              <span style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>
                {[filterSector, filterSociety, filterDonor, filterPayment, filterOrder].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={12} /> Clear
            </button>
          )}

          <button className="btn btn-ghost btn-sm" onClick={handleExport} style={{ marginLeft: 'auto' }}>
            <Download size={13} /> Export Excel
          </button>
        </div>

        {/* Row 2: dropdown filters (collapsible) */}
        {showFilters && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 8,
            padding: 12,
            background: 'var(--bg)',
            border: '1px solid var(--border-light)',
            borderRadius: 10,
          }}>
            <select value={filterSector} onChange={e => { setFilterSector(e.target.value); setPage(1) }} style={{ fontSize: 12.5 }}>
              <option value="">All Sectors</option>
              {UNIQUE_SECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterSociety} onChange={e => { setFilterSociety(e.target.value); setPage(1) }} style={{ fontSize: 12.5 }}>
              <option value="">All Societies</option>
              {UNIQUE_SOCIETIES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterDonor} onChange={e => { setFilterDonor(e.target.value); setPage(1) }} style={{ fontSize: 12.5 }}>
              <option value="">All Donor Status</option>
              {RADDI_DONOR_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(1) }} style={{ fontSize: 12.5 }}>
              <option value="">All Payment Status</option>
              {RADDI_PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterOrder} onChange={e => { setFilterOrder(e.target.value); setPage(1) }} style={{ fontSize: 12.5 }}>
              <option value="">All Order Status</option>
              {RADDI_ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Record count ───────────────────────────────────────────────────── */}
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Showing <strong>{paginated.length}</strong> of <strong>{sorted.length}</strong> orders
          {hasFilters && ` (filtered from ${raddiMasterData.length} total)`}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TableProperties size={12} /> Raddi Master Table
        </span>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && sorted.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><Search size={24} /></div>
          <h3>No records found</h3>
          <p>Try adjusting your search or filters.</p>
          <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ marginTop: 12 }}>Clear All Filters</button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {(loading || sorted.length > 0) && (
        <div style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 360px)',
          minHeight: 300,
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          background: 'var(--surface)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1800 }}>
            {/* ── Sticky Header ── */}
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              {/* Group header row */}
              <tr style={{ background: 'var(--secondary-dark)' }}>
                {[
                  { label: 'Order Info',    cols: 1,  color: '#3B82F6' },
                  { label: 'Donor Details', cols: 6,  color: '#22C55E' },
                  { label: 'Pickup Info',   cols: 5,  color: '#F5B942' },
                  { label: 'Item Breakdown (kg)', cols: 9, color: '#8B5CF6' },
                  { label: 'Value & Status', cols: 4, color: '#E8521A' },
                ].map(g => (
                  <th
                    key={g.label}
                    colSpan={g.cols}
                    style={{
                      padding: '6px 12px', textAlign: 'center',
                      fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'white',
                      borderRight: '2px solid rgba(255,255,255,0.15)',
                      background: g.color + '22',
                      borderBottom: `3px solid ${g.color}`,
                    }}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>

              {/* Column header row */}
              <tr>
                {/* Order Info */}
                <Th label="Order ID"       field="orderId"       minW={100} sticky />
                {/* Donor Details */}
                <Th label="Name"           field="name"          minW={130} />
                <Th label="Mobile"         field="mobile"        minW={115} />
                <Th label="House No."      field="houseNo"       minW={90}  />
                <Th label="Society"        field="society"       minW={160} />
                <Th label="Sector"         field="sector"        minW={130} />
                <Th label="City"           field="city"          minW={90}  />
                {/* Pickup Info */}
                <Th label="Pickup Date"    field="pickupDate"    minW={115} />
                <Th label="Kabadiwala"     field="kabadiwalaName" minW={120} />
                <Th label="Kab. Phone"     field="kabadiwalaPhone" minW={115} />
                <Th label="Order Date"     field="orderDate"     minW={115} />
                <Th label="Donor Status"   field="donorStatus"   minW={120} />
                {/* Item columns */}
                {RADDI_ITEM_LABELS.map((l, i) => (
                  <th
                    key={l}
                    style={{
                      padding: '10px 10px',
                      minWidth: 90,
                      whiteSpace: 'nowrap',
                      background: itemColColor,
                      color: 'var(--info)',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      borderRight: i === RADDI_ITEM_LABELS.length - 1 ? '2px solid var(--border)' : undefined,
                    }}
                  >
                    Item {i + 1}<br />
                    <span style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--text-secondary)', textTransform: 'none' }}>{l}</span>
                  </th>
                ))}
                {/* Value & Status */}
                <Th label="Total (kg)"     field="totalKg"       minW={95}  />
                <Th label="Total (₹)"      field="totalAmount"   minW={100} />
                <Th label="Payment"        field="paymentStatus" minW={130} />
                <Th label="Order Status"   field="orderStatus"   minW={120} />
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : paginated.map((r, idx) => {
                  const isEven = idx % 2 === 0
                  const ds     = donorStatusBadge(r.donorStatus)
                  const ps     = paymentBadge(r.paymentStatus)
                  const os     = orderBadge(r.orderStatus)
                  const rowBg  = r.donorStatus === 'Churned' ? '#FFF5F5'
                               : r.donorStatus === 'At Risk' ? '#FFFBEB'
                               : isEven ? 'var(--surface)' : 'var(--bg)'

                  return (
                    <tr key={r.orderId} style={{ background: rowBg }}>
                      {/* Order ID – sticky */}
                      <td style={{
                        padding: '11px 12px',
                        position: 'sticky', left: 0, zIndex: 1,
                        background: rowBg,
                        borderRight: '2px solid var(--border)',
                        fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                        color: 'var(--primary)',
                        whiteSpace: 'nowrap',
                      }}>
                        {r.orderId}
                      </td>

                      {/* Donor Details */}
                      <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{r.name}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12.5, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.mobile}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12.5, whiteSpace: 'nowrap' }}>{r.houseNo}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12.5, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.society}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12.5, whiteSpace: 'nowrap' }}>{r.sector}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12.5, whiteSpace: 'nowrap' }}>{r.city}</td>

                      {/* Pickup Info */}
                      <td style={{ padding: '11px 12px', fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDate(r.pickupDate)}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.kabadiwalaName}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.kabadiwalaPhone}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDate(r.orderDate)}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <Badge label={ds.label} style={{ background: ds.bg, color: ds.color }} />
                      </td>

                      {/* Item columns */}
                      {r.items.map((val, i) => (
                        <td key={i} style={{
                          padding: '11px 10px', textAlign: 'center', fontSize: 13,
                          fontWeight: val > 0 ? 700 : 400,
                          color: val > 0 ? 'var(--info)' : 'var(--border)',
                          borderRight: i === r.items.length - 1 ? '2px solid var(--border)' : undefined,
                        }}>
                          {val > 0 ? val : '—'}
                        </td>
                      ))}

                      {/* Value & Status */}
                      <td style={{ padding: '11px 12px', fontWeight: 700, fontSize: 13, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {r.totalKg > 0 ? `${r.totalKg} kg` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 12px', fontWeight: 700, fontSize: 13, color: r.totalAmount > 0 ? 'var(--secondary)' : 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {r.totalAmount > 0 ? `₹${r.totalAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <Badge label={r.paymentStatus} style={{ background: ps.bg, color: ps.color }} />
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <Badge label={r.orderStatus} style={{ background: os.bg, color: os.color }} />
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 14, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            &nbsp;·&nbsp; {sorted.length} records
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="First page"
            >«</button>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => (
                p === '…'
                  ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                  : <button
                      key={p}
                      className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPage(p)}
                      style={{ minWidth: 32, padding: '4px 8px' }}
                    >{p}</button>
              ))
            }

            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </button>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              title="Last page"
            >»</button>
          </div>
        </div>
      )}

      {/* ── Item Legend ─────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 16, padding: '10px 16px',
        background: 'var(--info-bg)', borderRadius: 8,
        display: 'flex', flexWrap: 'wrap', gap: '6px 20px',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--info)', marginRight: 4 }}>Items:</span>
        {RADDI_ITEM_LABELS.map((l, i) => (
          <span key={l} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--info)' }}>Item {i + 1}</strong> = {l}
          </span>
        ))}
      </div>
    </div>
  )
}