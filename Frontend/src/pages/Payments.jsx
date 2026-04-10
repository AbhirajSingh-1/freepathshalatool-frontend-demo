// Frontend/src/pages/Payments.jsx — orderId shown on all payment cards
// Two sections: A) RST Revenue Analytics  B) Kabadiwala Payment Tracking
import { useState, useMemo } from 'react'
import {
  IndianRupee, X, Clock, CheckCircle, AlertCircle,
  Download, History, TrendingUp, Plus, Copy, Check,
  Hash, FileText, CreditCard, Smartphone, BarChart3,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, fmtCurrency, paymentStatusColor, exportToExcel } from '../utils/helpers'
import { RADDI_ITEM_LABELS } from '../data/raddiMockData'

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

// ─────────────────────────────────────────────────────────────────────────────
// A) RST Revenue Analytics
// ─────────────────────────────────────────────────────────────────────────────
function RSTAnalytics({ raddiRecords }) {
  const [datePreset, setDatePreset]   = useState('month')
  const [dateFrom,   setDateFrom]     = useState('')
  const [dateTo,     setDateTo]       = useState('')
  const [viewType,   setViewType]     = useState('daily')
  const [filterSector, setFilterSector] = useState('')

  const uniqueSectors = useMemo(() => [...new Set(raddiRecords.map(r => r.sector).filter(Boolean))].sort(), [raddiRecords])

  const dateRange = useMemo(() => {
    const now = new Date()
    if (datePreset === 'today')  return { from: now.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
    if (datePreset === 'week')   { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) } }
    if (datePreset === 'month')  { const d = new Date(now); d.setDate(1); return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) } }
    return { from: dateFrom, to: dateTo }
  }, [datePreset, dateFrom, dateTo])

  const filtered = useMemo(() => raddiRecords.filter(r => {
    const matchDate   = (!dateRange.from || r.pickupDate >= dateRange.from) && (!dateRange.to || r.pickupDate <= dateRange.to)
    const matchSector = !filterSector || r.sector === filterSector
    return matchDate && matchSector && r.orderStatus === 'Completed'
  }), [raddiRecords, dateRange, filterSector])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      const key = viewType === 'monthly' ? r.pickupDate?.slice(0, 7) : r.pickupDate
      if (!map[key]) map[key] = { key, sector: r.sector || 'Unknown', revenue: 0, kg: 0, count: 0 }
      map[key].revenue += r.totalAmount || 0
      map[key].kg      += r.totalKg     || 0
      map[key].count   += 1
    })
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key))
  }, [filtered, viewType])

  const sectorSummary = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      const s = r.sector || 'Unknown'
      if (!map[s]) map[s] = { sector: s, revenue: 0, kg: 0, orders: 0 }
      map[s].revenue += r.totalAmount || 0
      map[s].kg      += r.totalKg     || 0
      map[s].orders  += 1
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [filtered])

  const totalRevenue  = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const totalKg       = filtered.reduce((s, r) => s + (r.totalKg || 0), 0)
  const totalOrders   = filtered.length

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card orange">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><TrendingUp size={18}/></div>
          <div className="stat-value">{fmtCurrency(totalRevenue)}</div>
          <div className="stat-label">Total Revenue (filtered)</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>𓍝</div>
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
          <div className="stat-value">{totalKg > 0 ? Math.round(totalRevenue / totalKg) : 0}</div>
          <div className="stat-label">Avg Rate (₹/kg)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 6 }}>
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
        <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Sectors</option>
          {uniqueSectors.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[['daily','Daily'],['monthly','Monthly']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${viewType === v ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setViewType(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">{viewType === 'monthly' ? 'Monthly' : 'Daily'} Revenue</div>
          </div>
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>{viewType === 'monthly' ? 'Month' : 'Date'}</th>
                  <th>Sector</th>
                  <th>Orders</th>
                  <th>Kg</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No data for selected range</td></tr>
                ) : grouped.map(g => (
                  <tr key={g.key}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{g.key}</td>
                    <td style={{ fontSize: 12.5 }}>{g.sector}</td>
                    <td style={{ fontWeight: 600 }}>{g.count}</td>
                    <td style={{ fontWeight: 600 }}>{g.kg} kg</td>
                    <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{fmtCurrency(g.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Sector Summary</div></div>
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table>
              <thead><tr><th>Sector</th><th>Orders</th><th>Kg</th><th>Revenue</th></tr></thead>
              <tbody>
                {sectorSummary.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No data</td></tr>
                ) : sectorSummary.map(s => (
                  <tr key={s.sector}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{s.sector}</td>
                    <td>{s.orders}</td>
                    <td>{s.kg} kg</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmtCurrency(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// B) Kabadiwala Payment Tracking
// ─────────────────────────────────────────────────────────────────────────────
function KabadiwalaTracking({ pickups, updatePickup }) {
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
    updatePickup(modal.id, { amountPaid: newTotalPaid, paymentStatus: status, payHistory: [...(modal.payHistory || []), newEntry] })
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
          'Pickup ID': p.id,
          'Donor': p.donorName,
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
                  {/* Order ID + Donor header */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <OrderIdChip orderId={p.orderId} id={p.id} />
                        <span className={`badge ${paymentStatusColor(p.paymentStatus)}`} style={{ fontSize:11 }}>{p.paymentStatus}</span>
                      </div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{p.donorName}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{fmtDate(p.date)} · {p.kabadiwala||'No kabadiwala'}</div>
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
              {/* Order ID badge */}
              {(modal.orderId || modal.id) && (
                <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:600 }}>Order:</span>
                  <OrderIdChip orderId={modal.orderId} id={modal.id} />
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
              {/* Order ID in history modal */}
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
  const { pickups, raddiRecords, updatePickup } = useApp()
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

      {view === 'analytics' && <RSTAnalytics raddiRecords={raddiRecords} />}
      {view === 'kabadiwala' && <KabadiwalaTracking pickups={pickups} updatePickup={updatePickup} />}
    </div>
  )
}