// Frontend/src/pages/Payments.jsx
// RST Revenue Analytics: Clean, simple professional view — no charts
import { useState, useMemo } from 'react'
import {
  IndianRupee, X, Clock, CheckCircle, AlertCircle,
  Download, History, TrendingUp, Plus, Copy, Check,
  Hash, FileText, CreditCard, Smartphone, BarChart3,
  MapPin, Layers, List, Building2, ChevronDown, Users,
  Truck, Filter, Package, Weight, ArrowRight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, fmtCurrency, paymentStatusColor, exportToExcel } from '../utils/helpers'
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
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontFamily:'monospace', fontSize:10.5, fontWeight:700, color:'var(--primary)', background:'var(--primary-light)', padding:'2px 7px', borderRadius:5, border:'1px solid rgba(232,82,26,0.2)', whiteSpace:'nowrap' }}>
      <Hash size={9} />{display}
    </span>
  )
}

// ── Date range helper ─────────────────────────────────────────────────────────
function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  const y = now.getFullYear(), m = now.getMonth()
  if (preset === 'today')      return { from: fmt(now), to: fmt(now) }
  if (preset === 'week')       { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: fmt(d), to: fmt(now) } }
  if (preset === 'month')      return { from: `${y}-${String(m+1).padStart(2,'0')}-01`, to: fmt(now) }
  if (preset === 'last_month') {
    const lm = m === 0 ? 11 : m - 1
    const ly = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${String(lm+1).padStart(2,'0')}-01`, to: `${ly}-${String(lm+1).padStart(2,'0')}-${String(last).padStart(2,'0')}` }
  }
  if (preset === 'quarter')    { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: fmt(d), to: fmt(now) } }
  if (preset === 'custom')     return { from: customFrom || '', to: customTo || '' }
  return { from: '', to: '' }
}

// ── Stat KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'var(--text-primary)', bg = 'var(--surface)', icon: Icon, accent }) {
  return (
    <div style={{ background: bg, borderRadius:'var(--radius)', padding:'16px 20px', border:'1px solid var(--border-light)', boxShadow:'var(--shadow)', borderTop:`3px solid ${accent || 'var(--primary)'}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color, lineHeight:1.1 }}>{value}</div>
          {sub && <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{ width:38, height:38, borderRadius:10, background:`${accent || 'var(--primary)'}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon size={18} color={accent || 'var(--primary)'} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── RST Revenue Analytics ─────────────────────────────────────────────────────
function RSTAnalytics({ raddiRecords, pickups }) {
  const [datePreset,    setDatePreset]    = useState('month')
  const [customFrom,    setCustomFrom]    = useState('')
  const [customTo,      setCustomTo]      = useState('')
  const [groupMode,     setGroupMode]     = useState('sector')
  const [filterCity,    setFilterCity]    = useState('')
  const [filterSector,  setFilterSector]  = useState('')
  const [filterSociety, setFilterSociety] = useState('')
  const [filterMode,    setFilterMode]    = useState('')
  const [filterPay,     setFilterPay]     = useState('')
  const [showFilters,   setShowFilters]   = useState(false)
  const [sortBy,        setSortBy]        = useState('revenue')
  const [sortDir,       setSortDir]       = useState('desc')

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  const uniqueCities   = useMemo(() => [...new Set(raddiRecords.map(r => r.city).filter(Boolean))].sort(), [raddiRecords])
  const uniqueSectors  = useMemo(() => {
    if (filterCity && CITY_SECTORS[filterCity]) return CITY_SECTORS[filterCity]
    return [...new Set(raddiRecords.filter(r => !filterCity || r.city === filterCity).map(r => r.sector).filter(Boolean))].sort()
  }, [raddiRecords, filterCity])
  const uniqueSocieties = useMemo(() => {
    if (filterCity === 'Gurgaon' && filterSector && GURGAON_SOCIETIES[filterSector]) return GURGAON_SOCIETIES[filterSector]
    return [...new Set(raddiRecords.filter(r => (!filterCity || r.city === filterCity) && (!filterSector || r.sector === filterSector)).map(r => r.society).filter(Boolean))].sort()
  }, [raddiRecords, filterCity, filterSector])

  const filtered = useMemo(() => {
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

  const kpis = useMemo(() => {
    const revenue  = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const kg       = filtered.reduce((s, r) => s + (r.totalKg     || 0), 0)
    const received = filtered.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)
    const pending  = filtered.filter(r => r.paymentStatus === 'Yet to Receive').reduce((s, r) => s + (r.totalAmount || 0), 0)
    const drives   = filtered.filter(r => r._pickupMode === 'Drive').length
    const indivs   = filtered.filter(r => r._pickupMode !== 'Drive').length
    return { revenue, kg, orders: filtered.length, received, pending, drives, indivs, avgRate: kg > 0 ? Math.round(revenue / kg) : 0, collPct: revenue > 0 ? Math.round((received / revenue) * 100) : 0 }
  }, [filtered])

  const groupedData = useMemo(() => {
    const m = {}
    filtered.forEach(r => {
      let key, label, sub
      if (groupMode === 'society')    { key = r.society || 'Unknown'; label = key; sub = r.sector || '—' }
      else if (groupMode === 'drive') { key = r._pickupMode || 'Individual'; label = key; sub = '' }
      else if (groupMode === 'kabadiwala') { key = r.kabadiwalaName || 'Unassigned'; label = key; sub = '' }
      else                            { key = r.sector || 'Unknown'; label = key; sub = r.city || '' }
      if (!m[key]) m[key] = { key, label, sub, revenue: 0, kg: 0, orders: 0, received: 0, pending: 0 }
      m[key].revenue  += r.totalAmount || 0
      m[key].kg       += r.totalKg     || 0
      m[key].orders   += 1
      m[key].received += r.paymentStatus === 'Received' ? (r.totalAmount || 0) : 0
      m[key].pending  += r.paymentStatus === 'Yet to Receive' ? (r.totalAmount || 0) : 0
    })
    const arr = Object.values(m)
    arr.sort((a, b) => {
      const av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return arr
  }, [filtered, groupMode, sortBy, sortDir])

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const activeFilterCount = [filterCity, filterSector, filterSociety, filterMode, filterPay].filter(Boolean).length
  const clearFilters = () => { setFilterCity(''); setFilterSector(''); setFilterSociety(''); setFilterMode(''); setFilterPay('') }

  const PRESETS = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'quarter', label: 'Last 3 Months' },
    { id: '', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ]

  const SortTh = ({ k, children, style: s }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor:'pointer', userSelect:'none', ...s }}>
      {children}
      {sortBy === k
        ? <span style={{ marginLeft:4, opacity:0.6, fontSize:10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
        : <span style={{ marginLeft:4, opacity:0.2, fontSize:10 }}>↕</span>}
    </th>
  )

  return (
    <div>

      {/* ── Period Selector ── */}
      <div style={{ marginBottom:20, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius)', boxShadow:'var(--shadow)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
          <Clock size={13} color="var(--primary)" /> Time Period
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize:12 }} onClick={() => setDatePreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginTop:10, flexWrap:'wrap' }}>
            <div className="form-group" style={{ margin:0 }}>
              <label style={{ fontSize:11, fontWeight:600 }}>From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width:145 }} />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label style={{ fontSize:11, fontWeight:600 }}>To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width:145 }} />
            </div>
          </div>
        )}
      </div>

      {/* ── KPI Summary ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:20 }}>
        <KpiCard label="Total RST Value"  value={fmtCurrency(kpis.revenue)}  sub={`${kpis.orders} orders`}             icon={IndianRupee}  accent="var(--primary)"   />
        <KpiCard label="Raddi Collected"  value={`${kpis.kg.toFixed(1)} kg`} sub={`₹${kpis.avgRate}/kg avg`}           icon={Package}      accent="var(--secondary)" />
        <KpiCard label="Amount Received"  value={fmtCurrency(kpis.received)} sub={`${kpis.collPct}% collected`}        icon={CheckCircle}  accent="var(--secondary)" />
        <KpiCard label="Pending"          value={fmtCurrency(kpis.pending)}  sub={`${100 - kpis.collPct}% outstanding`} icon={AlertCircle}  accent="var(--danger)"   />
        <KpiCard label="Individual"       value={kpis.indivs}                sub={`${kpis.drives} drives`}             icon={Truck}        accent="var(--info)"     />
      </div>

      {/* ── Collection Progress Bar ── */}
      {kpis.revenue > 0 && (
        <div style={{ marginBottom:20, padding:'14px 18px', background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius)', boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Payment Collection Status</div>
            <div style={{ fontSize:12, fontWeight:700, color: kpis.collPct === 100 ? 'var(--secondary)' : 'var(--warning)' }}>{kpis.collPct}% collected</div>
          </div>
          <div style={{ height:8, background:'var(--border-light)', borderRadius:4, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:'100%', width:`${kpis.collPct}%`, background: kpis.collPct === 100 ? 'var(--secondary)' : kpis.collPct > 60 ? 'var(--warning)' : 'var(--danger)', borderRadius:4, transition:'width 0.5s ease' }} />
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:12.5 }}>
            {[
              { label:'Received',  value: fmtCurrency(kpis.received), color:'var(--secondary)' },
              { label:'Pending',   value: fmtCurrency(kpis.pending),  color:'var(--danger)' },
              { label:'Write-off', value: fmtCurrency(Math.max(0, kpis.revenue - kpis.received - kpis.pending)), color:'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                <span style={{ color:'var(--text-muted)' }}>{s.label}:</span>
                <span style={{ fontWeight:700, color:s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ marginBottom:16, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius)', boxShadow:'var(--shadow)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: showFilters ? 14 : 0, cursor:'pointer' }} onClick={() => setShowFilters(f => !f)}>
          <Filter size={14} color="var(--primary)" />
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Filters</span>
          {activeFilterCount > 0 && (
            <span style={{ background:'var(--primary)', color:'#fff', borderRadius:'50%', width:18, height:18, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{activeFilterCount}</span>
          )}
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'var(--text-muted)' }}>
            {filtered.length} records match
          </span>
          {activeFilterCount > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={e => { e.stopPropagation(); clearFilters() }}>
              <X size={10} /> Clear
            </button>
          )}
          <ChevronDown size={14} color="var(--text-muted)" style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }} />
        </div>

        {showFilters && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>
            <div>
              <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:4, marginBottom:5 }}><Building2 size={10} /> City</label>
              <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterSector(''); setFilterSociety('') }} style={{ fontSize:12.5, width:'100%' }}>
                <option value="">All Cities</option>
                {(uniqueCities.length > 0 ? uniqueCities : CITIES).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:4, marginBottom:5 }}><MapPin size={10} /> Sector</label>
              <select value={filterSector} onChange={e => { setFilterSector(e.target.value); setFilterSociety('') }} disabled={!filterCity} style={{ fontSize:12.5, width:'100%' }}>
                <option value="">{filterCity ? 'All Sectors' : 'Select city first'}</option>
                {uniqueSectors.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:4, marginBottom:5 }}><List size={10} /> Society</label>
              <select value={filterSociety} onChange={e => setFilterSociety(e.target.value)} disabled={!filterSector} style={{ fontSize:12.5, width:'100%' }}>
                <option value="">{filterSector ? 'All Societies' : 'Select sector first'}</option>
                {uniqueSocieties.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:4, marginBottom:5 }}><Truck size={10} /> Mode</label>
              <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ fontSize:12.5, width:'100%' }}>
                <option value="">All Modes</option>
                <option value="Individual">Individual</option>
                <option value="Drive">Drive / Campaign</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:4, marginBottom:5 }}><IndianRupee size={10} /> Payment</label>
              <select value={filterPay} onChange={e => setFilterPay(e.target.value)} style={{ fontSize:12.5, width:'100%' }}>
                <option value="">All Statuses</option>
                <option value="Received">Received</option>
                <option value="Yet to Receive">Yet to Receive</option>
                <option value="Write-off">Write-off</option>
              </select>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
            {[
              { val: filterCity,    label: filterCity,    clear: () => { setFilterCity(''); setFilterSector(''); setFilterSociety('') } },
              { val: filterSector,  label: filterSector,  clear: () => { setFilterSector(''); setFilterSociety('') } },
              { val: filterSociety, label: filterSociety, clear: () => setFilterSociety('') },
              { val: filterMode,    label: filterMode,    clear: () => setFilterMode('') },
              { val: filterPay,     label: filterPay,     clear: () => setFilterPay('') },
            ].filter(c => c.val).map((c, i) => (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--primary-light)', color:'var(--primary)', fontSize:11.5, fontWeight:600, border:'1px solid rgba(232,82,26,0.2)' }}>
                {c.label}
                <button onClick={c.clear} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--primary)', padding:0, display:'flex' }}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Grouped Breakdown Table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap:'wrap', gap:10 }}>
          <div className="card-title">Revenue Breakdown</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginLeft:'auto', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>Group by:</span>
            {[
              { id: 'sector',     label: 'Sector',  icon: <Layers size={11} /> },
              { id: 'society',    label: 'Society', icon: <List size={11} /> },
              { id: 'drive',      label: 'Mode',    icon: <Truck size={11} /> },
              { id: 'kabadiwala', label: 'Partner', icon: <Users size={11} /> },
            ].map(g => (
              <button key={g.id} className={`btn btn-sm ${groupMode === g.id ? 'btn-outline' : 'btn-ghost'}`} onClick={() => setGroupMode(g.id)} style={{ fontSize:11.5, display:'flex', alignItems:'center', gap:4 }}>
                {g.icon}{g.label}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft:4 }} onClick={() => exportToExcel(filtered.map(r => ({ 'Pickup Date':r.pickupDate, 'City':r.city, 'Sector':r.sector, 'Society':r.society, 'Mode':r._pickupMode, 'Kabadiwala':r.kabadiwalaName, 'Total KG':r.totalKg, 'Revenue (₹)':r.totalAmount, 'Amount Paid (₹)':r.amountPaid || 0, 'Payment Status':r.paymentStatus })), 'RST_Revenue_Analytics')}>
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="table-wrap" style={{ border:'none', boxShadow:'none', borderRadius:0 }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{groupMode === 'society' ? 'Society' : groupMode === 'drive' ? 'Mode' : groupMode === 'kabadiwala' ? 'Partner' : 'Sector'}</th>
                {groupMode === 'society' && <th>Sector</th>}
                <SortTh k="orders">Orders</SortTh>
                <SortTh k="kg">Weight (kg)</SortTh>
                <SortTh k="revenue">Revenue</SortTh>
                <SortTh k="received">Received</SortTh>
                <SortTh k="pending">Pending</SortTh>
                <th>Collection</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:28, color:'var(--text-muted)' }}>No data for selected filters</td></tr>
              ) : groupedData.map((g, idx) => {
                const collPct = g.revenue > 0 ? Math.round((g.received / g.revenue) * 100) : 0
                const isTop   = idx === 0 && g.revenue > 0
                return (
                  <tr key={g.key} style={{ background: isTop ? 'rgba(27,94,53,0.03)' : 'transparent' }}>
                    <td style={{ color:'var(--text-muted)', fontSize:12, fontWeight:600, width:32 }}>
                      {isTop ? <span style={{ color:'var(--secondary)', fontWeight:800 }}>🏆</span> : idx + 1}
                    </td>
                    <td style={{ fontWeight:600, fontSize:13 }}>{g.label}</td>
                    {groupMode === 'society' && <td style={{ fontSize:12, color:'var(--text-muted)' }}><MapPin size={10} style={{ verticalAlign:'middle', marginRight:3 }} />{g.sub}</td>}
                    <td style={{ fontWeight:600 }}>{g.orders}</td>
                    <td style={{ color:'var(--text-secondary)' }}>{g.kg.toFixed(1)} kg</td>
                    <td style={{ fontWeight:700, color:'var(--primary)' }}>{fmtCurrency(g.revenue)}</td>
                    <td style={{ color:'var(--secondary)', fontWeight:700 }}>{g.received > 0 ? fmtCurrency(g.received) : <span style={{ color:'var(--text-muted)', fontWeight:400 }}>—</span>}</td>
                    <td style={{ color: g.pending > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: g.pending > 0 ? 700 : 400 }}>
                      {g.pending > 0 ? fmtCurrency(g.pending) : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:100 }}>
                        <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:3, background: collPct === 100 ? 'var(--secondary)' : collPct > 50 ? 'var(--warning)' : 'var(--danger)', width:`${collPct}%`, transition:'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', flexShrink:0 }}>{collPct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* Grand Total row */}
              {groupedData.length > 0 && (() => {
                const collPct = kpis.revenue > 0 ? Math.round((kpis.received / kpis.revenue) * 100) : 0
                return (
                  <tr style={{ background:'var(--secondary-light)', fontWeight:700, borderTop:'2px solid var(--secondary)' }}>
                    <td style={{ fontWeight:800, fontSize:13 }} colSpan={groupMode === 'society' ? 3 : 2}>Grand Total</td>
                    <td style={{ fontWeight:800 }}>{kpis.orders}</td>
                    <td>{kpis.kg.toFixed(1)} kg</td>
                    <td style={{ color:'var(--primary)', fontWeight:800 }}>{fmtCurrency(kpis.revenue)}</td>
                    <td style={{ color:'var(--secondary)', fontWeight:800 }}>{fmtCurrency(kpis.received)}</td>
                    <td style={{ color: kpis.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{kpis.pending > 0 ? fmtCurrency(kpis.pending) : '—'}</td>
                    <td style={{ fontSize:12, fontWeight:800, color: collPct === 100 ? 'var(--secondary)' : 'var(--text-secondary)' }}>{collPct}% rcvd</td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="mobile-cards" style={{ padding:'0 0 8px' }}>
          {groupedData.length === 0 ? (
            <div style={{ padding:'28px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No data for selected filters</div>
          ) : groupedData.map((g, idx) => {
            const collPct = g.revenue > 0 ? Math.round((g.received / g.revenue) * 100) : 0
            return (
              <div key={g.key} style={{ margin:'0 14px 10px', padding:'12px 14px', background:'var(--surface)', borderRadius:10, border:'1px solid var(--border-light)', boxShadow:'var(--shadow)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{g.label}</div>
                    {g.sub && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{g.sub}</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'var(--primary)', fontFamily:'var(--font-display)' }}>{fmtCurrency(g.revenue)}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{g.orders} orders · {g.kg.toFixed(1)} kg</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:12, marginBottom:8 }}>
                  <span style={{ color:'var(--secondary)', fontWeight:600 }}>Rcvd: {fmtCurrency(g.received)}</span>
                  {g.pending > 0 && <span style={{ color:'var(--danger)', fontWeight:600 }}>Due: {fmtCurrency(g.pending)}</span>}
                </div>
                <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${collPct}%`, background: collPct === 100 ? 'var(--secondary)' : collPct > 50 ? 'var(--warning)' : 'var(--danger)', borderRadius:3 }} />
                </div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:3 }}>{collPct}% collected</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Kabadiwala Payment Tracking ───────────────────────────────────────────────
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
    setModal(p); setEditAmt(String(Math.max(0, (p.totalValue || 0) - (p.amountPaid || 0)))); setEditDate(new Date().toISOString().slice(0, 10))
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
        <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(filtered.map(p => ({ 'Order ID': p.orderId || p.id, 'Donor': p.donorName, 'Society': p.society, 'Sector': p.sector, 'Kabadiwala': p.kabadiwala || '—', 'Date': p.date, 'Total Value (₹)': p.totalValue, 'Amount Paid (₹)': p.amountPaid, 'Remaining (₹)': (p.totalValue||0)-(p.amountPaid||0), 'Payment Status': p.paymentStatus })),'Payments_Report')} style={{ marginLeft:'auto' }}>
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
                    <span style={{ fontSize:11.5, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><MapPin size={10} />{[modal.society, modal.sector].filter(Boolean).join(' · ')}</span>
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
                  <input type="number" min={0} max={prevAmt} inputMode="numeric" value={editAdditional} onChange={e => { setEditAmt(e.target.value); setRefError('') }} placeholder={`Max ₹${prevAmt}`} autoFocus />
                  {editAdditional !== '' && (
                    <div style={{ marginTop:10, padding:'10px 14px', background:'var(--bg)', borderRadius:8, display:'flex', gap:16, flexWrap:'wrap', fontSize:13 }}>
                      <div>New total: <strong style={{ color:'var(--secondary)' }}>{fmtCurrency(previewNewTotal)}</strong></div>
                      <div>Remaining: <strong style={{ color:previewRemaining>0?'var(--danger)':'var(--secondary)' }}>{previewRemaining>0?fmtCurrency(previewRemaining):'₹0 ✓'}</strong></div>
                      <div>Status: <span className={`badge ${paymentStatusColor(previewStatus)}`}>{previewStatus}</span></div>
                    </div>
                  )}
                </div>
                <div className="form-group"><label>Payment Date <span className="required">*</span></label><input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></div>
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
                <div className="form-group full"><label>Notes</label><textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes about this payment…" style={{ minHeight:60 }} /></div>
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
                    <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:'var(--secondary-light)', display:'flex', alignItems:'center', justifyContent:'center' }}><RefIcon size={16} color="var(--secondary)"/></div>
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
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setHistModal(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
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