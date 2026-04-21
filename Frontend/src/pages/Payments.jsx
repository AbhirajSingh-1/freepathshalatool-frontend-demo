// Frontend/src/pages/Payments.jsx
import { useMemo, useState } from 'react'
import {
  AlertCircle, BarChart3, Calendar, CheckCircle, CreditCard,
  Download, FileText, History, Image, IndianRupee, AlertTriangle,
  Plus, Search, Smartphone, Upload, X, Hash, MapPin,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'
import { fmtDate, fmtCurrency, exportToExcel } from '../utils/helpers'
import { CITIES, CITY_SECTORS } from '../data/mockData'

// ── Constants ────────────────────────────────────────────────────────────────
const REF_MODES = [
  { value: 'cash',   label: 'Cash',          icon: IndianRupee,  placeholder: 'Receipt number (optional)' },
  { value: 'upi',    label: 'UPI',           icon: Smartphone,   placeholder: 'UPI transaction ID' },
  { value: 'bank',   label: 'Bank Transfer', icon: CreditCard,   placeholder: 'Bank reference number' },
  { value: 'cheque', label: 'Cheque',        icon: FileText,     placeholder: 'Cheque number' },
]

const DATE_PRESETS = [
  { id: 'all',        label: 'All Time' },
  { id: 'month',      label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom',     label: 'Custom' },
]

const refModeLabel = (mode) => REF_MODES.find(r => r.value === mode)?.label || mode || 'Recorded'
const money = (n) => fmtCurrency(Number(n) || 0)

function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  const y = now.getFullYear(), m = now.getMonth()
  if (preset === 'month') return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: fmt(now) }
  if (preset === 'last_month') {
    const lm = m === 0 ? 11 : m - 1, ly = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${String(lm + 1).padStart(2, '0')}-01`, to: `${ly}-${String(lm + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}` }
  }
  if (preset === 'custom') return { from: customFrom || '', to: customTo || '' }
  return { from: '', to: '' }
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────
function OrderIdChip({ orderId, id }) {
  const v = orderId || id
  if (!v) return null
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontFamily:'monospace', fontSize:10.5, fontWeight:700, color:'var(--primary)', background:'var(--primary-light)', padding:'2px 7px', borderRadius:5, whiteSpace:'nowrap' }}>
      <Hash size={9}/>{v}
    </span>
  )
}

function PayBadge({ status }) {
  const map = {
    Received:        { bg:'var(--secondary-light)', color:'var(--secondary)' },
    'Yet to Receive':{ bg:'var(--warning-bg)',       color:'#92400E' },
    'Write-off':     { bg:'var(--danger-bg)',        color:'var(--danger)' },
    Paid:            { bg:'var(--secondary-light)', color:'var(--secondary)' },
    'Not Paid':      { bg:'var(--danger-bg)',        color:'var(--danger)' },
    'Partially Paid':{ bg:'var(--warning-bg)',       color:'#92400E' },
    'Write Off':     { bg:'var(--danger-bg)',        color:'var(--danger)' },
    Completed:       { bg:'var(--secondary-light)', color:'var(--secondary)' },
    Partial:         { bg:'var(--warning-bg)',       color:'#92400E' },
    Pending:         { bg:'var(--danger-bg)',        color:'var(--danger)' },
  }
  const c = map[status] || { bg:'var(--border-light)', color:'var(--text-muted)' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap', background:c.bg, color:c.color }}>
      {status}
    </span>
  )
}

function DateBar({ preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo }) {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
      <Calendar size={13} color="var(--primary)" />
      <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', flexShrink:0 }}>Pickup Date:</span>
      {DATE_PRESETS.map(p => (
        <button key={p.id} className={`btn btn-sm ${preset===p.id?'btn-primary':'btn-ghost'}`} style={{ fontSize:11.5 }} onClick={() => setPreset(p.id)}>
          {p.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width:138, fontSize:12 }} />
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width:138, fontSize:12 }} />
        </div>
      )}
    </div>
  )
}

function StatStrip({ items }) {
  return (
    <div className="stat-grid" style={{ marginBottom:16 }}>
      {items.map(item => {
        const Icon = item.icon
        return (
          <div key={item.label} className={`stat-card ${item.tone||'orange'}`}>
            <div className="stat-icon">{Icon && <Icon size={18}/>}</div>
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── RST Revenue Analytics ─────────────────────────────────────────────────────
function RSTAnalytics({ raddiRecords, pickups }) {
  const [datePreset,    setDatePreset]    = useState('all')
  const [customFrom,    setCustomFrom]    = useState('')
  const [customTo,      setCustomTo]      = useState('')
  const [filterCity,    setFilterCity]    = useState('')
  const [filterSector,  setFilterSector]  = useState('')
  const [filterPay,     setFilterPay]     = useState('')
  const [search,        setSearch]        = useState('')
  const [sortKey,       setSortKey]       = useState('pickupDate')
  const [sortDir,       setSortDir]       = useState('desc')

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  const pickupMap = useMemo(() => {
    const map = {}
    ;(pickups || []).forEach(p => {
      map[p.id] = p
      if (p.orderId) map[p.orderId] = p
    })
    return map
  }, [pickups])

  const uniqueSectors = useMemo(() => {
    if (filterCity && CITY_SECTORS[filterCity]) return CITY_SECTORS[filterCity]
    return [...new Set(raddiRecords.filter(r => !filterCity || r.city === filterCity).map(r => r.sector).filter(Boolean))].sort()
  }, [raddiRecords, filterCity])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const rows = raddiRecords.map(r => {
      const pickup        = pickupMap[r.orderId] || pickupMap[r.pickupId] || {}
      const total         = Number(r.totalAmount) || 0
      const collected     = Math.min(total, Number(r.amountPaid) || 0)
      const pending       = r.paymentStatus === 'Write-off' ? 0 : Math.max(0, total - collected)
      const lastHistory   = (pickup.payHistory || []).slice(-1)[0]
      return {
        ...r,
        total,
        collected,
        pending,
        partnerName:     r.kabadiwalaName || pickup.kabadiwala || 'Unassigned',
        donorName:       r.name || pickup.donorName || '',
        lastPaymentDate: lastHistory?.date || (collected > 0 ? (pickup.date || r.pickupDate) : ''),
      }
    }).filter(r => {
      const inDate    = (!dateFrom || (r.pickupDate || '') >= dateFrom) && (!dateTo || (r.pickupDate || '') <= dateTo)
      const inCity    = !filterCity   || r.city   === filterCity
      const inSector  = !filterSector || r.sector === filterSector
      const inPay     = !filterPay    || r.paymentStatus === filterPay
      const inSearch  = !q || r.partnerName.toLowerCase().includes(q) || r.donorName.toLowerCase().includes(q) || (r.society || '').toLowerCase().includes(q) || (r.orderId || '').toLowerCase().includes(q)
      return inDate && inCity && inSector && inPay && inSearch
    })

    rows.sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number' || typeof bv === 'number')
        return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return rows
  }, [raddiRecords, pickupMap, dateFrom, dateTo, filterCity, filterSector, filterPay, search, sortKey, sortDir])

  const totals = useMemo(() => ({
    revenue:   filtered.reduce((s, r) => s + r.total, 0),
    collected: filtered.reduce((s, r) => s + r.collected, 0),
    pending:   filtered.reduce((s, r) => s + r.pending, 0),
    kg:        filtered.reduce((s, r) => s + (Number(r.totalKg) || 0), 0),
  }), [filtered])

  const toggleSort = (key) => {
    setSortDir(d => sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'desc')
    setSortKey(key)
  }

  const SortTh = ({ k, children, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor:'pointer', userSelect:'none', textAlign: align || 'left' }}>
      {children}
      <span style={{ marginLeft:4, opacity: sortKey === k ? 0.7 : 0.2 }}>
        {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )

  const exportRows = () => exportToExcel(
    filtered.map(r => ({
      'Pickup Partner': r.partnerName,
      'Donor Name':     r.donorName,
      'Order ID':       r.orderId || r.pickupId,
      'Pickup Date':    r.pickupDate,
      'Last Payment':   r.lastPaymentDate || '',
      'Total (₹)':      r.total,
      'Paid (₹)':       r.collected,
      'Pending (₹)':    r.pending,
      'Payment Status': r.paymentStatus,
      'City':           r.city,
      'Sector':         r.sector,
      'Society':        r.society,
    })),
    'RST_Revenue_Analytics'
  )

  return (
    <div>
      <StatStrip items={[
        { label:'Total Revenue',   value:money(totals.revenue),   icon:IndianRupee,  tone:'orange' },
        { label:'Collected',       value:money(totals.collected), icon:CheckCircle,  tone:'green'  },
        { label:'Pending',         value:money(totals.pending),   icon:AlertCircle,  tone:'red'    },
        { label:'Weight',          value:`${totals.kg.toFixed(1)} kg`, icon:BarChart3, tone:'blue' },
      ]}/>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius)', padding:'14px 16px', marginBottom:16, boxShadow:'var(--shadow)' }}>
        <DateBar preset={datePreset} setPreset={setDatePreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo}/>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:10 }}>
          <div style={{ position:'relative', flex:'2 1 200px', minWidth:0 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partner, donor, society, order…" style={{ paddingLeft:32, fontSize:12.5, width:'100%' }}/>
          </div>
          <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterSector('') }} style={{ flex:'1 1 130px', fontSize:12.5 }}>
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={{ flex:'1 1 140px', fontSize:12.5 }} disabled={!filterCity}>
            <option value="">{filterCity ? 'All Sectors' : 'Select city first'}</option>
            {uniqueSectors.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPay} onChange={e => setFilterPay(e.target.value)} style={{ flex:'1 1 140px', fontSize:12.5 }}>
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Yet to Receive">Yet to Receive</option>
            <option value="Write-off">Write-off</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportRows}><Download size={13}/> Export</button>
        </div>
      </div>

      <div style={{ fontSize:12.5, color:'var(--text-muted)', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
        <strong style={{ color:'var(--text-primary)' }}>{filtered.length}</strong> records
        {(search || filterCity || filterPay) && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }}
            onClick={() => { setSearch(''); setFilterCity(''); setFilterSector(''); setFilterPay('') }}>
            <X size={10}/> Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><BarChart3 size={24}/></div>
          <h3>No records found</h3>
          <p>Try a different date range or filter.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh k="partnerName">Pickup Partner</SortTh>
                  <SortTh k="donorName">Donor</SortTh>
                  <SortTh k="pickupDate">Pickup Date</SortTh>
                  <SortTh k="lastPaymentDate">Last Payment</SortTh>
                  <SortTh k="total" align="right">Total ₹</SortTh>
                  <SortTh k="collected" align="right">Paid ₹</SortTh>
                  <SortTh k="pending" align="right">Pending ₹</SortTh>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.orderId || r.pickupId}>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13 }}>{r.partnerName}</div>
                      <OrderIdChip orderId={r.orderId} id={r.pickupId}/>
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{r.donorName || '—'}</div>
                      <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{[r.society, r.sector].filter(Boolean).join(', ')}</div>
                    </td>
                    <td style={{ whiteSpace:'nowrap', fontSize:12.5 }}>{fmtDate(r.pickupDate)}</td>
                    <td style={{ whiteSpace:'nowrap', fontSize:12.5 }}>{r.lastPaymentDate ? fmtDate(r.lastPaymentDate) : <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ textAlign:'right', fontWeight:800, color:'var(--primary)' }}>{money(r.total)}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--secondary)' }}>{r.collected > 0 ? money(r.collected) : <span style={{ color:'var(--text-muted)', fontWeight:400 }}>—</span>}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color: r.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {r.pending > 0 ? money(r.pending) : '—'}
                    </td>
                    <td><PayBadge status={r.paymentStatus}/></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:'var(--secondary-light)', fontWeight:800 }}>
                  <td colSpan={4} style={{ fontWeight:700 }}>Totals ({filtered.length} records)</td>
                  <td style={{ textAlign:'right', color:'var(--primary)' }}>{money(totals.revenue)}</td>
                  <td style={{ textAlign:'right', color:'var(--secondary)' }}>{money(totals.collected)}</td>
                  <td style={{ textAlign:'right', color: totals.pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                    {totals.pending > 0 ? money(totals.pending) : 'All clear ✓'}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mobile-cards">
            {filtered.map(r => (
              <div key={r.orderId || r.pickupId} className="card" style={{ marginBottom:10, padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14 }}>{r.partnerName}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{r.donorName || '—'}</div>
                    <OrderIdChip orderId={r.orderId} id={r.pickupId}/>
                  </div>
                  <PayBadge status={r.paymentStatus}/>
                </div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4 }}>
                  {[r.society, r.sector, r.city].filter(Boolean).join(', ')}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:12.5, alignItems:'center' }}>
                  <span style={{ color:'var(--text-muted)' }}>{fmtDate(r.pickupDate)}</span>
                  <span style={{ color:'var(--primary)', fontWeight:800 }}>{money(r.total)}</span>
                  {r.collected > 0 && <span style={{ color:'var(--secondary)', fontWeight:700 }}>Paid {money(r.collected)}</span>}
                  {r.pending > 0 && <span style={{ color:'var(--danger)', fontWeight:700 }}>Due {money(r.pending)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Payment form hook ──────────────────────────────────────────────────────────
function usePaymentForm() {
  const [amount,     setAmount]     = useState('')
  const [date,       setDate]       = useState(() => new Date().toISOString().slice(0, 10))
  const [method,     setMethod]     = useState('cash')
  const [reference,  setReference]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [writeOff,   setWriteOff]   = useState(false)
  const [error,      setError]      = useState('')

  const reset = (nextAmount = '') => {
    setAmount(nextAmount); setDate(new Date().toISOString().slice(0, 10))
    setMethod('cash'); setReference(''); setNotes('')
    setScreenshot(null); setWriteOff(false); setError('')
  }

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setScreenshot(ev.target.result)
    reader.readAsDataURL(file)
  }

  return {
    amount, setAmount, date, setDate, method, setMethod,
    reference, setReference, notes, setNotes,
    screenshot, setScreenshot, writeOff, setWriteOff,
    error, setError, reset, handleScreenshot,
  }
}

function PaymentMethodPicker({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
      {REF_MODES.map(mode => {
        const Icon   = mode.icon
        const active = value === mode.value
        return (
          <button key={mode.value} type="button" onClick={() => onChange(mode.value)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, fontSize:12.5, cursor:'pointer', fontWeight:active?700:400, border:`1.5px solid ${active?'var(--primary)':'var(--border)'}`, background:active?'var(--primary-light)':'transparent', color:active?'var(--primary)':'var(--text-secondary)' }}>
            <Icon size={13}/>{mode.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Partner Payment Modal ─────────────────────────────────────────────────────
function PartnerPaymentModal({ partner, form, onClose, onSave, onWriteOff, saving, canWriteOff }) {
  const pending      = partner?.pending || 0
  const entered      = Number(form.amount) || 0
  const afterPending = Math.max(0, pending - entered)
  const selectedMethod = REF_MODES.find(r => r.value === form.method)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:580 }}>
        <div className="modal-header">
          <IndianRupee size={18} color="var(--primary)"/>
          <div className="modal-title">Record Payment — {partner.partnerName}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="modal-body" style={{ overflowY:'auto', maxHeight:'72vh' }}>
          <div style={{ background:'var(--bg)', borderRadius:10, padding:16, marginBottom:18, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:12 }}>
            <div><div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>Total Amount</div><div style={{ fontWeight:800 }}>{money(partner.total)}</div></div>
            <div><div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>Paid So Far</div><div style={{ fontWeight:800, color:'var(--secondary)' }}>{money(partner.paid)}</div></div>
            <div><div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>Pending</div><div style={{ fontWeight:800, color: pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>{money(pending)}</div></div>
          </div>

          {pending <= 0 && !form.writeOff && (
            <div className="alert-strip alert-success" style={{ marginBottom:16 }}>
              <CheckCircle size={14}/> This partner has no pending dues.
            </div>
          )}

          {canWriteOff && pending > 0 && (
            <div style={{ marginBottom:16, padding:'12px 14px', background: form.writeOff ? 'var(--danger-bg)' : 'var(--bg)', borderRadius:10, border:`1.5px solid ${form.writeOff ? 'var(--danger)' : 'var(--border-light)'}`, transition:'all 0.15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'space-between', flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color: form.writeOff ? 'var(--danger)' : 'var(--text-primary)' }}>Write Off Balance</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Mark {money(pending)} as non-recoverable. This cannot be undone.</div>
                </div>
                <button type="button" onClick={() => { form.setWriteOff(wo => !wo); form.setError('') }}
                  style={{ padding:'6px 14px', borderRadius:8, fontSize:12.5, cursor:'pointer', fontWeight:700, border:`1.5px solid ${form.writeOff ? 'var(--danger)' : 'var(--border)'}`, background: form.writeOff ? 'var(--danger)' : 'transparent', color: form.writeOff ? 'white' : 'var(--danger)', transition:'all 0.15s' }}>
                  {form.writeOff ? '✓ Write Off Selected' : 'Select Write Off'}
                </button>
              </div>
              {form.writeOff && (
                <div className="alert-strip alert-danger" style={{ marginTop:10, marginBottom:0 }}>
                  <AlertTriangle size={13}/> All pending transactions will be marked as <strong>Write Off</strong>.
                </div>
              )}
            </div>
          )}

          {!form.writeOff && (
            <div className="form-grid">
              <div className="form-group full">
                <label>Amount Received Now (₹) <span className="required">*</span></label>
                <input type="number" min={0} max={pending} inputMode="decimal"
                  value={form.amount} onChange={e => { form.setAmount(e.target.value); form.setError('') }}
                  placeholder={`Max ${money(pending)}`} disabled={pending <= 0} autoFocus/>
                {entered > 0 && (
                  <div style={{ marginTop:8, padding:'9px 12px', background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:8, fontSize:12.5, display:'flex', gap:12, flexWrap:'wrap' }}>
                    <span>Remaining: <strong style={{ color: afterPending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>{money(afterPending)}</strong></span>
                    <span>Status: <strong>{afterPending > 0 ? 'Partial' : 'Completed'}</strong></span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Payment Date <span className="required">*</span></label>
                <input type="date" value={form.date} onChange={e => form.setDate(e.target.value)}/>
              </div>
              <div className="form-group full">
                <label>Payment Method <span className="required">*</span></label>
                <PaymentMethodPicker value={form.method} onChange={m => { form.setMethod(m); form.setReference(''); form.setScreenshot(null); form.setError('') }}/>
              </div>
              <div className="form-group full">
                <label>{refModeLabel(form.method)} Reference {form.method !== 'cash' && <span className="required">*</span>}</label>
                <input value={form.reference} onChange={e => { form.setReference(e.target.value); form.setError('') }}
                  placeholder={selectedMethod?.placeholder || 'Reference'}/>
              </div>
              {form.method === 'upi' && (
                <div className="form-group full">
                  <label style={{ display:'flex', alignItems:'center', gap:6 }}><Image size={13} color="var(--info)"/>UPI Screenshot</label>
                  {form.screenshot ? (
                    <div style={{ position:'relative', display:'inline-block' }}>
                      <img src={form.screenshot} alt="UPI screenshot" style={{ maxWidth:220, maxHeight:180, borderRadius:8, border:'1px solid var(--border)', display:'block' }}/>
                      <button type="button" onClick={() => form.setScreenshot(null)} style={{ position:'absolute', top:6, right:6, width:24, height:24, borderRadius:8, border:'none', background:'var(--danger)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={12}/></button>
                    </div>
                  ) : (
                    <label className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', borderStyle:'dashed' }}>
                      <Upload size={15}/> Upload Screenshot
                      <input type="file" accept="image/*" style={{ display:'none' }} onChange={form.handleScreenshot}/>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="form-group" style={{ marginTop: form.writeOff ? 0 : 8 }}>
            <label>Notes {form.writeOff && <span style={{ fontSize:11, fontWeight:400, color:'var(--danger)' }}>(required for write-off)</span>}</label>
            <textarea value={form.notes} onChange={e => form.setNotes(e.target.value)}
              placeholder={form.writeOff ? 'Reason for writing off this balance…' : 'Payment notes…'}
              style={{ minHeight:70 }}/>
          </div>

          {form.error && (
            <div style={{ fontSize:12, color:'var(--danger)', marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
              <AlertCircle size={13}/>{form.error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {form.writeOff ? (
            <button className="btn btn-danger" onClick={onWriteOff} disabled={saving || !form.notes.trim()}>
              {saving ? 'Processing…' : `✗ Write Off ${money(pending)}`}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onSave} disabled={saving || pending <= 0 || entered <= 0}>
              {saving ? 'Saving…' : afterPending === 0 ? '✓ Clear Partner Balance' : 'Record Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Payment History Modal ─────────────────────────────────────────────────────
function PaymentHistoryModal({ partner, onClose }) {
  const entries = partner.history || []
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:620 }}>
        <div className="modal-header">
          <History size={18} color="var(--info)"/>
          <div className="modal-title">Payment History — {partner.partnerName}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding:28 }}><p>No payment history recorded.</p></div>
          ) : entries.map((entry, i) => (
            <div key={`${entry.pickupId}-${entry.date}-${i}`} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom: i < entries.length-1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ width:38, height:38, borderRadius:8, background: entry.refMode === 'writeoff' ? 'var(--danger-bg)' : 'var(--secondary-light)', color: entry.refMode === 'writeoff' ? 'var(--danger)' : 'var(--secondary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {entry.refMode === 'writeoff' ? <AlertTriangle size={16}/> : <IndianRupee size={16}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <strong style={{ color: entry.refMode === 'writeoff' ? 'var(--danger)' : 'var(--secondary)' }}>
                    {entry.refMode === 'writeoff' ? 'Write-off' : money(entry.amount)}
                  </strong>
                  <span className="badge badge-muted">{entry.refMode === 'writeoff' ? 'Write Off' : refModeLabel(entry.refMode)}</span>
                  <OrderIdChip orderId={entry.orderId} id={entry.pickupId}/>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                  {entry.donorName || 'Unknown donor'}{entry.refValue ? ` — Ref: ${entry.refValue}` : ''}
                </div>
                {entry.notes && <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4 }}>{entry.notes}</div>}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtDate(entry.date)}</div>
            </div>
          ))}
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}

// ── NEW: Partner Detail Modal — per-pickup breakdown ──────────────────────────
function PartnerDetailModal({ partner, onClose }) {
  const [sortKey,      setSortKey]      = useState('date')
  const [sortDir,      setSortDir]      = useState('desc')
  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')

  const records = partner.records || []

  const enriched = useMemo(() => {
    const q = search.toLowerCase().trim()
    return records
      .map(p => {
        const total   = Number(p.totalValue) || 0
        const paid    = Math.min(total, Number(p.amountPaid) || 0)
        const pending = Math.max(0, total - paid)
        const ps      = p.paymentStatus || (total === 0 ? 'Not Paid' : paid >= total ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Not Paid')
        return { ...p, _total: total, _paid: paid, _pending: pending, _ps: ps }
      })
      .filter(r => {
        const mS = !q ||
          (r.donorName || '').toLowerCase().includes(q) ||
          (r.society   || '').toLowerCase().includes(q) ||
          (r.sector    || '').toLowerCase().includes(q) ||
          (r.orderId   || '').toLowerCase().includes(q) ||
          (r.mobile    || '').includes(q)
        const mP = !filterStatus || r._ps === filterStatus
        return mS && mP
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
        if (['_total','_paid','_pending'].includes(sortKey))
          return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
  }, [records, search, filterStatus, sortKey, sortDir])

  const totals = useMemo(() => ({
    total:   enriched.reduce((s, r) => s + r._total,   0),
    paid:    enriched.reduce((s, r) => s + r._paid,    0),
    pending: enriched.reduce((s, r) => s + r._pending, 0),
  }), [enriched])

  const pendingCount = enriched.filter(r => r._pending > 0).length

  const toggleSort = k => {
    setSortDir(d => sortKey === k ? (d === 'asc' ? 'desc' : 'asc') : 'desc')
    setSortKey(k)
  }

  const SortTh = ({ k, children, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor:'pointer', userSelect:'none', textAlign: align || 'left' }}>
      {children}
      <span style={{ marginLeft:4, opacity: sortKey === k ? 0.7 : 0.2 }}>
        {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )

  // Status color map for inline badge
  const statusStyle = (ps) => ({
    'Paid':           { bg:'var(--secondary-light)', color:'var(--secondary)' },
    'Not Paid':       { bg:'var(--danger-bg)',        color:'var(--danger)' },
    'Partially Paid': { bg:'var(--warning-bg)',       color:'#92400E' },
    'Write Off':      { bg:'var(--border-light)',     color:'var(--text-muted)' },
  }[ps] || { bg:'var(--border-light)', color:'var(--text-muted)' })

  const exportDetail = () => exportToExcel(
    enriched.map(r => ({
      'Order ID':       r.orderId || r.id || '—',
      'Donor Name':     r.donorName || '—',
      'Mobile':         r.mobile || '—',
      'Society':        r.society || '—',
      'Sector':         r.sector || '—',
      'City':           r.city || '—',
      'Pickup Date':    r.date || '—',
      'RST Items':      (r.rstItems || []).join(', ') || '—',
      'SKS Items':      (r.sksItems || []).join(', ') || '—',
      'Total (₹)':      r._total,
      'Paid (₹)':       r._paid,
      'Pending (₹)':    r._pending,
      'Payment Status': r._ps,
    })),
    `${partner.partnerName}_Pickup_Details`
  )

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: 960, width: '96vw' }}>
        {/* Header */}
        <div className="modal-header">
          <BarChart3 size={18} color="var(--primary)" />
          <div className="modal-title">Pickup Details — {partner.partnerName}</div>
          {partner.mobile && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{partner.mobile}</span>
          )}
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={16}/></button>
        </div>

        {/* Summary strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'var(--border-light)', borderBottom:'1px solid var(--border-light)' }}>
          {[
            { label:'Total RST Value',  val: money(partner.total),   color:'var(--primary)',   bg:'var(--primary-light)' },
            { label:'Amount Received',  val: money(partner.paid),    color:'var(--secondary)', bg:'var(--secondary-light)' },
            { label:'Outstanding',      val: money(partner.pending), color: partner.pending > 0 ? 'var(--danger)' : 'var(--secondary)', bg: partner.pending > 0 ? 'var(--danger-bg)' : 'var(--secondary-light)' },
          ].map(item => (
            <div key={item.label} style={{ padding:'14px 18px', background: item.bg, textAlign:'center' }}>
              <div style={{ fontSize:10.5, color: item.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4, opacity:0.8 }}>
                {item.label}
              </div>
              <div style={{ fontSize:22, fontWeight:800, color: item.color, fontFamily:'var(--font-display)' }}>
                {item.val}
              </div>
            </div>
          ))}
        </div>

        {/* Alert if pending exists */}
        {partner.pending > 0 && (
          <div style={{ padding:'10px 18px', background:'var(--danger-bg)', borderBottom:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--danger)' }}>
            <AlertCircle size={13} style={{ flexShrink:0 }}/>
            <span><strong>{pendingCount} pickup{pendingCount !== 1 ? 's' : ''}</strong> with outstanding amounts — totalling {money(partner.pending)}</span>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:8, padding:'10px 16px', borderBottom:'1px solid var(--border-light)', flexWrap:'wrap', alignItems:'center', background:'var(--surface)' }}>
          <div style={{ position:'relative', flex:'1 1 200px', minWidth:0 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search donor, society, sector, order ID…"
              style={{ paddingLeft:32, fontSize:12.5, width:'100%' }}
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize:12.5 }}>
            <option value="">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Not Paid">Not Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Write Off">Write Off</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportDetail} style={{ flexShrink:0 }}>
            <Download size={13}/> Export
          </button>
          <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, marginLeft:'auto' }}>
            {enriched.length} of {records.length} records
          </span>
        </div>

        {/* Table */}
        <div className="modal-body" style={{ padding:0, overflowY:'auto', maxHeight:'52vh' }}>
          {enriched.length === 0 ? (
            <div className="empty-state" style={{ padding:36 }}><p>No records match your search or filters.</p></div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="table-wrap" style={{ border:'none', boxShadow:'none', borderRadius:0 }}>
                <table>
                  <thead>
                    <tr>
                      <SortTh k="orderId">Order ID</SortTh>
                      <SortTh k="donorName">Donor</SortTh>
                      <SortTh k="society">Society</SortTh>
                      <SortTh k="sector">Sector</SortTh>
                      <SortTh k="date">Pickup Date</SortTh>
                      <th>RST Items</th>
                      <SortTh k="_total" align="right">Total ₹</SortTh>
                      <SortTh k="_paid" align="right">Paid ₹</SortTh>
                      <SortTh k="_pending" align="right">Pending ₹</SortTh>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map(r => {
                      const sc = statusStyle(r._ps)
                      return (
                        <tr key={r.id || r.orderId} style={{ background: r._pending > 0 ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                          <td>
                            <span style={{ fontFamily:'monospace', fontSize:10.5, fontWeight:700, color:'var(--primary)', background:'var(--primary-light)', padding:'2px 7px', borderRadius:5, whiteSpace:'nowrap' }}>
                              {r.orderId || r.id || '—'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight:600, fontSize:13 }}>{r.donorName || '—'}</div>
                            {r.mobile && <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{r.mobile}</div>}
                          </td>
                          <td style={{ fontSize:12.5, fontWeight:500, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.society || '—'}
                          </td>
                          <td style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{r.sector || '—'}</td>
                          <td style={{ whiteSpace:'nowrap', fontSize:12.5, fontWeight:600 }}>{fmtDate(r.date)}</td>
                          <td>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:3, maxWidth:140 }}>
                              {(r.rstItems || []).slice(0,3).map(item => (
                                <span key={item} style={{ fontSize:9.5, padding:'1px 5px', borderRadius:20, background:'var(--secondary-light)', color:'var(--secondary)', fontWeight:600, whiteSpace:'nowrap' }}>{item}</span>
                              ))}
                              {(r.rstItems || []).length > 3 && <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>+{r.rstItems.length - 3}</span>}
                              {!(r.rstItems || []).length && <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>—</span>}
                            </div>
                          </td>
                          <td style={{ textAlign:'right', fontWeight:800, color: r._total > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {r._total > 0 ? money(r._total) : '—'}
                          </td>
                          <td style={{ textAlign:'right', fontWeight:700, color: r._paid > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                            {r._paid > 0 ? money(r._paid) : '—'}
                          </td>
                          <td style={{ textAlign:'right', fontWeight:800, color: r._pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {r._pending > 0 ? money(r._pending) : '—'}
                          </td>
                          <td>
                            <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap', background:sc.bg, color:sc.color }}>
                              {r._ps}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'var(--secondary-light)', fontWeight:800 }}>
                      <td colSpan={6}>Totals ({enriched.length} records)</td>
                      <td style={{ textAlign:'right', color:'var(--primary)' }}>{money(totals.total)}</td>
                      <td style={{ textAlign:'right', color:'var(--secondary)' }}>{money(totals.paid)}</td>
                      <td style={{ textAlign:'right', color: totals.pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                        {totals.pending > 0 ? money(totals.pending) : 'All clear ✓'}
                      </td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="mobile-cards" style={{ padding:'10px 12px' }}>
                {enriched.map(r => {
                  const sc = statusStyle(r._ps)
                  return (
                    <div key={r.id || r.orderId} className="card" style={{ marginBottom:10, padding:12, borderLeft:`3px solid ${sc.color}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                        <div>
                          <span style={{ fontFamily:'monospace', fontSize:10.5, fontWeight:700, color:'var(--primary)', background:'var(--primary-light)', padding:'1px 6px', borderRadius:4 }}>
                            {r.orderId || r.id}
                          </span>
                          <div style={{ fontWeight:700, fontSize:13.5, marginTop:4 }}>{r.donorName || '—'}</div>
                          {r.mobile && <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{r.mobile}</div>}
                        </div>
                        <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:20, fontSize:10.5, fontWeight:700, whiteSpace:'nowrap', background:sc.bg, color:sc.color, alignSelf:'flex-start' }}>
                          {r._ps}
                        </span>
                      </div>
                      {(r.society || r.sector) && (
                        <div style={{ fontSize:12, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                          <MapPin size={10}/>{[r.society, r.sector].filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>📅 {fmtDate(r.date)}</div>
                      {(r.rstItems || []).length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}>
                          {r.rstItems.map(item => (
                            <span key={item} style={{ fontSize:9.5, padding:'1px 6px', borderRadius:20, background:'var(--secondary-light)', color:'var(--secondary)', fontWeight:600 }}>{item}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:10, fontSize:12.5, flexWrap:'wrap' }}>
                        {r._total > 0 && <span style={{ color:'var(--primary)', fontWeight:700 }}>{money(r._total)}</span>}
                        {r._paid  > 0 && <span style={{ color:'var(--secondary)', fontWeight:700 }}>Paid {money(r._paid)}</span>}
                        {r._pending > 0 && <span style={{ color:'var(--danger)', fontWeight:700 }}>Due {money(r._pending)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Kabadiwala Payment Tracking ───────────────────────────────────────────────
function KabadiwalaTracking({ pickups, kabadiwalas, recordKabadiwalaPayment, clearPartnerBalance }) {
  const { role } = useRole()
  const isAdmin  = role === 'admin'

  const [datePreset,    setDatePreset]    = useState('all')
  const [customFrom,    setCustomFrom]    = useState('')
  const [customTo,      setCustomTo]      = useState('')
  const [filterKab,     setFilterKab]     = useState('All')
  const [filterStatus,  setFilterStatus]  = useState('All')
  const [search,        setSearch]        = useState('')
  const [modalPartner,  setModalPartner]  = useState(null)
  const [historyPartner,setHistPart]      = useState(null)
  const [detailPartner, setDetailPartner] = useState(null)   // ← NEW
  const [saving,        setSaving]        = useState(false)
  const form = usePaymentForm()

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  const kabNames = useMemo(() =>
    [...new Set(pickups.map(p => p.kabadiwala).filter(Boolean))].sort(),
    [pickups]
  )

  function pickupPayStatus(total, paid) {
    const t = Number(total)||0, p = Number(paid)||0
    if (t === 0) return 'Not Paid'
    if (p >= t)  return 'Paid'
    if (p > 0)   return 'Partially Paid'
    return 'Not Paid'
  }

  function partnerStatus(total, paid) {
    if ((Number(total)||0) <= 0) return 'Pending'
    if ((Number(paid)||0) >= (Number(total)||0)) return 'Completed'
    if ((Number(paid)||0) > 0) return 'Partial'
    return 'Pending'
  }

  const partnerRows = useMemo(() => {
    const q = search.toLowerCase().trim()
    const filteredPickups = pickups.filter(p => {
      if (p.status !== 'Completed') return false
      if (!p.kabadiwala) return false
      if ((Number(p.totalValue)||0) <= 0 && (Number(p.amountPaid)||0) <= 0) return false
      const inDate   = (!dateFrom || (p.date||'') >= dateFrom) && (!dateTo || (p.date||'') <= dateTo)
      const inKab    = filterKab === 'All' || p.kabadiwala === filterKab
      const status   = pickupPayStatus(p.totalValue, p.amountPaid)
      const inStatus = filterStatus === 'All' || status === filterStatus
      const inSearch = !q || (p.kabadiwala||'').toLowerCase().includes(q) || (p.donorName||'').toLowerCase().includes(q) || (p.society||'').toLowerCase().includes(q) || (p.orderId||'').toLowerCase().includes(q)
      return inDate && inKab && inStatus && inSearch
    })

    const map = {}
    filteredPickups.forEach(p => {
      const name = p.kabadiwala || 'Unassigned'
      const kab  = kabadiwalas.find(k => k.name === name) || {}
      if (!map[name]) {
        map[name] = { kabId:name, partnerName:name, mobile:kab.mobile||p.kabadiMobile||'', total:0, paid:0, pending:0, lastPaymentDate:'', count:0, records:[], history:[] }
        if (kab.id) map[name].kabId = kab.id
      }
      const total = Number(p.totalValue)||0
      const paid  = Math.min(total, Number(p.amountPaid)||0)
      const pend  = Math.max(0, total - paid)
      const history = (p.payHistory||[]).map(h => ({ ...h, pickupId:p.id, orderId:p.orderId, donorName:p.donorName }))
      const fallback = history.length===0 && paid>0
        ? [{ date:p.date, amount:paid, refMode:'recorded', pickupId:p.id, orderId:p.orderId, donorName:p.donorName }]
        : []
      const allH = [...history, ...fallback]

      map[name].total   += total
      map[name].paid    += paid
      map[name].pending += pend
      map[name].count   += 1
      map[name].records.push(p)
      map[name].history.push(...allH)
      allH.forEach(h => {
        if (h.date && (!map[name].lastPaymentDate || h.date > map[name].lastPaymentDate))
          map[name].lastPaymentDate = h.date
      })
    })

    return Object.values(map)
      .map(row => ({ ...row, status:partnerStatus(row.total, row.paid), history:row.history.sort((a,b)=>(b.date||'').localeCompare(a.date||'')) }))
      .sort((a,b) => { if (b.pending!==a.pending) return b.pending-a.pending; return a.partnerName.localeCompare(b.partnerName) })
  }, [pickups, kabadiwalas, dateFrom, dateTo, filterKab, filterStatus, search])

  const totals = useMemo(() => ({
    total:   partnerRows.reduce((s,r)=>s+r.total,0),
    paid:    partnerRows.reduce((s,r)=>s+r.paid,0),
    pending: partnerRows.reduce((s,r)=>s+r.pending,0),
  }), [partnerRows])

  const openPayment = (partner) => {
    setModalPartner(partner)
    form.reset(partner.pending > 0 ? String(partner.pending) : '')
  }

  const savePayment = async () => {
    if (!modalPartner) return
    const amount = Number(form.amount) || 0
    if (modalPartner.pending <= 0)            { form.setError('No pending amount for this partner.'); return }
    if (amount <= 0)                          { form.setError('Enter a valid payment amount.'); return }
    if (amount > modalPartner.pending + 0.01) { form.setError('Amount cannot exceed pending balance.'); return }
    if (form.method !== 'cash' && !form.reference.trim()) { form.setError(`Enter ${refModeLabel(form.method)} reference.`); return }

    setSaving(true)
    try {
      const isFullClear = amount >= modalPartner.pending
      if (isFullClear) {
        await clearPartnerBalance(
          { kabId: modalPartner.kabId, kabName: modalPartner.partnerName },
          { refMode:form.method, refValue:form.reference.trim(), notes:form.notes.trim(), date:form.date, screenshot:form.screenshot, writeOff:false }
        )
      } else {
        await recordKabadiwalaPayment(modalPartner.kabId, {
          amount, date:form.date, refMode:form.method,
          refValue:form.reference.trim(), notes:form.notes.trim(), screenshot:form.screenshot,
        })
      }
      setModalPartner(null)
    } catch (e) {
      form.setError('Failed to save payment. Please try again.')
    } finally { setSaving(false) }
  }

  const handleWriteOff = async () => {
    if (!modalPartner || !isAdmin) return
    if (!form.notes.trim()) { form.setError('Please provide a reason for the write-off.'); return }
    setSaving(true)
    try {
      await clearPartnerBalance(
        { kabId: modalPartner.kabId, kabName: modalPartner.partnerName },
        { refMode:'writeoff', refValue:'', notes:form.notes.trim(), date:form.date, writeOff:true }
      )
      setModalPartner(null)
    } catch (e) {
      form.setError('Write-off failed. Please try again.')
    } finally { setSaving(false) }
  }

  const exportRows = () => exportToExcel(
    partnerRows.map(r => ({
      'Pickup Partner': r.partnerName,
      'Total (₹)':      r.total,
      'Paid (₹)':       r.paid,
      'Pending (₹)':    r.pending,
      'Last Payment':   r.lastPaymentDate || '',
      'Status':         r.status,
      'Records':        r.count,
      'Mobile':         r.mobile,
    })),
    'Pickup_Partner_Payments'
  )

  const pBadge = (s) => ({ Completed:'badge-success', Partial:'badge-warning', Pending:'badge-danger' }[s] || 'badge-muted')

  return (
    <div>
      {/* Filter bar */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius)', padding:'14px 16px', marginBottom:16, boxShadow:'var(--shadow)' }}>
        <DateBar preset={datePreset} setPreset={setDatePreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo}/>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:10 }}>
          <div style={{ position:'relative', flex:'2 1 200px', minWidth:0 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partner, donor…" style={{ paddingLeft:32, fontSize:12.5, width:'100%' }}/>
          </div>
          <select value={filterKab} onChange={e => setFilterKab(e.target.value)} style={{ flex:'1 1 150px', fontSize:12.5 }}>
            <option value="All">All Partners</option>
            {kabNames.map(n => <option key={n}>{n}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex:'1 1 140px', fontSize:12.5 }}>
            <option value="All">All Statuses</option>
            <option value="Not Paid">Pending</option>
            <option value="Partially Paid">Partial</option>
            <option value="Paid">Completed</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportRows}><Download size={13}/> Export</button>
        </div>
      </div>

      {/* Totals strip */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:12.5, color:'var(--text-muted)', marginBottom:10 }}>
        <span><strong style={{ color:'var(--text-primary)' }}>{partnerRows.length}</strong> partners</span>
        <span>Total {money(totals.total)}</span>
        <span style={{ color:'var(--secondary)', fontWeight:700 }}>Paid {money(totals.paid)}</span>
        <span style={{ color: totals.pending > 0 ? 'var(--danger)' : 'var(--secondary)', fontWeight:700 }}>Pending {money(totals.pending)}</span>
      </div>

      {partnerRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><IndianRupee size={24}/></div>
          <h3>No payment records</h3>
          <p>Try adjusting the date range or filters.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pickup Partner</th>
                  <th style={{ textAlign:'right' }}>Total ₹</th>
                  <th style={{ textAlign:'right' }}>Paid ₹</th>
                  <th style={{ textAlign:'right' }}>Pending ₹</th>
                  <th>Last Payment</th>
                  <th>Status</th>
                  <th style={{ textAlign:'center' }}>Pickups</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {partnerRows.map(row => {
                  const paidOut = row.status === 'Completed'
                  return (
                    <tr key={row.partnerName}>
                      {/* Clickable partner name → opens detail modal */}
                      <td
                        onClick={() => setDetailPartner(row)}
                        style={{ cursor:'pointer' }}
                        title="Click to see pickup breakdown"
                      >
                        <div style={{ fontWeight:800, fontSize:13.5, color:'var(--primary)', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:3 }}>
                          {row.partnerName}
                        </div>
                        <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{row.mobile || '—'}</div>
                      </td>
                      <td style={{ textAlign:'right', fontWeight:800, color:'var(--primary)' }}>{money(row.total)}</td>
                      <td style={{ textAlign:'right', fontWeight:700, color:'var(--secondary)' }}>{money(row.paid)}</td>
                      <td style={{ textAlign:'right', fontWeight:800, color: row.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {row.pending > 0 ? money(row.pending) : '—'}
                      </td>
                      <td>{row.lastPaymentDate ? fmtDate(row.lastPaymentDate) : '—'}</td>
                      <td><span className={`badge ${pBadge(row.status)}`}>{row.status}</span></td>
                      <td style={{ textAlign:'center' }}>{row.count}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          {/* View Details button */}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="View pickup breakdown"
                            onClick={() => setDetailPartner(row)}
                          >
                            <BarChart3 size={13}/>
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="History" onClick={() => setHistPart(row)}>
                            <History size={13}/>
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openPayment(row)}
                            disabled={paidOut && !isAdmin}
                            style={{ fontSize:11.5 }}
                          >
                            <Plus size={11}/> Record Payment
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:'var(--secondary-light)', fontWeight:800 }}>
                  <td>Total</td>
                  <td style={{ textAlign:'right', color:'var(--primary)' }}>{money(totals.total)}</td>
                  <td style={{ textAlign:'right', color:'var(--secondary)' }}>{money(totals.paid)}</td>
                  <td style={{ textAlign:'right', color: totals.pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                    {totals.pending > 0 ? money(totals.pending) : 'All clear ✓'}
                  </td>
                  <td colSpan={4}/>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mobile-cards">
            {partnerRows.map(row => (
              <div key={row.partnerName} className="card" style={{ marginBottom:10, padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:10 }}>
                  <div>
                    <div
                      style={{ fontWeight:800, fontSize:14, color:'var(--primary)', cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:3 }}
                      onClick={() => setDetailPartner(row)}
                    >
                      {row.partnerName}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{row.count} pickups</div>
                  </div>
                  <span className={`badge ${pBadge(row.status)}`}>{row.status}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
                  <div><div style={{ fontSize:10, color:'var(--text-muted)' }}>Total</div><strong>{money(row.total)}</strong></div>
                  <div><div style={{ fontSize:10, color:'var(--text-muted)' }}>Paid</div><strong style={{ color:'var(--secondary)' }}>{money(row.paid)}</strong></div>
                  <div><div style={{ fontSize:10, color:'var(--text-muted)' }}>Pending</div><strong style={{ color: row.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{row.pending > 0 ? money(row.pending) : '—'}</strong></div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetailPartner(row)} style={{ flex:1, justifyContent:'center' }}>
                    <BarChart3 size={12}/> View Details
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setHistPart(row)}><History size={12}/> History</button>
                  <button className="btn btn-outline btn-sm" onClick={() => openPayment(row)} style={{ flex:1, justifyContent:'center' }}>
                    <Plus size={12}/> Payment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalPartner && (
        <PartnerPaymentModal
          partner={modalPartner}
          form={form}
          onClose={() => setModalPartner(null)}
          onSave={savePayment}
          onWriteOff={handleWriteOff}
          saving={saving}
          canWriteOff={isAdmin}
        />
      )}
      {historyPartner && <PaymentHistoryModal partner={historyPartner} onClose={() => setHistPart(null)}/>}

      {/* ← NEW: Partner Detail Modal */}
      {detailPartner && (
        <PartnerDetailModal
          partner={detailPartner}
          onClose={() => setDetailPartner(null)}
        />
      )}
    </div>
  )
}

// ── Main Payments page ────────────────────────────────────────────────────────
export default function Payments() {
  const { pickups, raddiRecords, kabadiwalas, recordKabadiwalaPayment, clearPartnerBalance } = useApp()
  const [view, setView] = useState('analytics')

  return (
    <div className="page-body">
      <div style={{ marginBottom:24 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          <button className={`tab ${view==='analytics'?'active':''}`} onClick={() => setView('analytics')}>
            <BarChart3 size={13} style={{ marginRight:4 }}/> RST Revenue Analytics
          </button>
          <button className={`tab ${view==='kabadiwala'?'active':''}`} onClick={() => setView('kabadiwala')}>
            <IndianRupee size={13} style={{ marginRight:4 }}/> Pickup Partner Payments
          </button>
        </div>
      </div>

      {view === 'analytics' && (
        <RSTAnalytics raddiRecords={raddiRecords} pickups={pickups}/>
      )}
      {view === 'kabadiwala' && (
        <KabadiwalaTracking
          pickups={pickups}
          kabadiwalas={kabadiwalas}
          recordKabadiwalaPayment={recordKabadiwalaPayment}
          clearPartnerBalance={clearPartnerBalance}
        />
      )}
    </div>
  )
}