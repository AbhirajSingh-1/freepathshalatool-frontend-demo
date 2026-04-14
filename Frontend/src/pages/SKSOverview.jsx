// Frontend/src/pages/SKSOverview.jsx
// SKS Warehouse System — Inflow / Outflow / Stock
import { useState, useMemo, useCallback } from 'react'
import {
  Plus, X, Save, CheckCircle, Package, Boxes,
  ArrowDownCircle, ArrowUpCircle, Shirt, Monitor, Laptop,
  Wind, Microwave, Footprints, Dumbbell, UtensilsCrossed,
  BookOpen, Armchair, ShoppingBag, Gift, Download, Trash2,
  MapPin, Calendar, User, Phone, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, exportToExcel } from '../utils/helpers'

// ── SKS item config ───────────────────────────────────────────────────────────
const SKS_ITEM_CONFIG = {
  'Kids Clothes':    { icon: Shirt,           category: 'Clothing',      unit: 'pieces' },
  'Kids Shoes':      { icon: Footprints,      category: 'Clothing',      unit: 'pairs'  },
  'Adult Clothes':   { icon: Shirt,           category: 'Clothing',      unit: 'pieces' },
  'Adult Shoes':     { icon: Footprints,      category: 'Clothing',      unit: 'pairs'  },
  'Toys':            { icon: Gift,            category: 'Children',      unit: 'pieces' },
  'Sports Items':    { icon: Dumbbell,        category: 'Children',      unit: 'pieces' },
  'New Stationery':  { icon: BookOpen,        category: 'Education',     unit: 'pieces' },
  'Utensils':        { icon: UtensilsCrossed, category: 'Household',     unit: 'pieces' },
  'Furniture':       { icon: Armchair,        category: 'Household',     unit: 'pieces' },
  'TV':              { icon: Monitor,         category: 'Electronics',   unit: 'units'  },
  'Laptop / PC':     { icon: Laptop,          category: 'Electronics',   unit: 'units'  },
  'Purifier':        { icon: Wind,            category: 'Electronics',   unit: 'units'  },
  'Microwave / OTG': { icon: Microwave,       category: 'Electronics',   unit: 'units'  },
  'Others':          { icon: ShoppingBag,     category: 'Miscellaneous', unit: 'pieces' },
}
const ALL_SKS_ITEMS = Object.keys(SKS_ITEM_CONFIG)

// initial warehouse stock (all 0)
const initStock = () => {
  const s = {}
  ALL_SKS_ITEMS.forEach(item => { s[item] = 0 })
  return s
}

let _inflowId  = 1
let _outflowId = 1
const nextInflowId  = () => `IN-${String(_inflowId++).padStart(4, '0')}`
const nextOutflowId = () => `OUT-${String(_outflowId++).padStart(4, '0')}`

// ── Warehouse stock = inflows - outflows ──────────────────────────────────────
function computeStock(inflows, outflows) {
  const stock = initStock()
  inflows.forEach(inf => {
    ;(inf.items || []).forEach(({ name, qty }) => {
      if (name in stock) stock[name] += qty || 0
    })
  })
  outflows.forEach(out => {
    ;(out.items || []).forEach(({ name, qty }) => {
      if (name in stock) stock[name] = Math.max(0, (stock[name] || 0) - (qty || 0))
    })
  })
  return stock
}

// ── Record Inflow panel ───────────────────────────────────────────────────────
function RecordInflowPanel({ pickups, inflows, onAdd }) {
  const [selectedSociety, setSelectedSociety] = useState('')
  const [selectedPickup,  setSelectedPickup]  = useState('')
  const [itemQty,         setItemQty]         = useState({})
  const [notes,           setNotes]           = useState('')
  const [saved,           setSaved]           = useState(false)

  // Unique societies with SKS pickups
  const societies = useMemo(() => {
    const seen = new Set()
    return pickups
      .filter(p => p.sksItems?.length > 0 && p.status === 'Completed')
      .map(p => p.society || p.donorName || '—')
      .filter(s => { if (seen.has(s)) return false; seen.add(s); return true })
  }, [pickups])

  // Pickups for selected society
  const societyPickups = useMemo(() => {
    if (!selectedSociety) return []
    return pickups.filter(p =>
      p.sksItems?.length > 0 &&
      p.status === 'Completed' &&
      (p.society === selectedSociety || p.donorName === selectedSociety)
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [pickups, selectedSociety])

  // SKS items from selected pickup
  const pickupObj     = useMemo(() => societyPickups.find(p => p.id === selectedPickup), [societyPickups, selectedPickup])
  const sksItemsInPkp = useMemo(() => {
    if (!pickupObj) return []
    return (pickupObj.sksItems || []).map(item => {
      const key = ALL_SKS_ITEMS.find(k => item.startsWith(k)) || 'Others'
      return key
    }).filter((v, i, a) => a.indexOf(v) === i) // dedupe
  }, [pickupObj])

  const canAdd = selectedSociety && selectedPickup && sksItemsInPkp.some(i => (itemQty[i] || 0) > 0)

  const handleAdd = () => {
    const items = sksItemsInPkp.filter(i => (itemQty[i] || 0) > 0).map(name => ({ name, qty: Number(itemQty[name]) }))
    if (!items.length) return
    onAdd({
      id:       nextInflowId(),
      date:     new Date().toISOString().slice(0, 10),
      society:  selectedSociety,
      pickupId: selectedPickup,
      donorName: pickupObj?.donorName || '',
      items,
      notes,
    })
    setItemQty({}); setNotes(''); setSelectedPickup(''); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card" style={{ height:'100%' }}>
      <div className="card-header" style={{ background:'linear-gradient(135deg,#E8F5EE 0%,#f8fff9 100%)' }}>
        <ArrowDownCircle size={18} color="var(--secondary)" />
        <div className="card-title" style={{ color:'var(--secondary)' }}>Record Inflow</div>
        {saved && (
          <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'var(--secondary)', background:'var(--secondary-light)', padding:'3px 10px', borderRadius:20 }}>
            <CheckCircle size={12} /> Saved!
          </span>
        )}
      </div>
      <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* 1. Society select */}
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ display:'flex', alignItems:'center', gap:5 }}>
            <MapPin size={12} color="var(--secondary)" />
            Society / Drive
          </label>
          <select
            value={selectedSociety}
            onChange={e => { setSelectedSociety(e.target.value); setSelectedPickup(''); setItemQty({}) }}
            style={{ fontSize:13 }}
          >
            <option value="">Select society with SKS pickups…</option>
            {societies.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {societies.length === 0 && (
            <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:4 }}>No completed SKS pickups yet. Record a pickup with SKS items first.</div>
          )}
        </div>

        {/* 2. Pickup select */}
        {selectedSociety && (
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ display:'flex', alignItems:'center', gap:5 }}>
              <Calendar size={12} color="var(--secondary)" />
              Select Pickup
            </label>
            <select
              value={selectedPickup}
              onChange={e => { setSelectedPickup(e.target.value); setItemQty({}) }}
              style={{ fontSize:13 }}
            >
              <option value="">Choose a pickup…</option>
              {societyPickups.map(p => (
                <option key={p.id} value={p.id}>
                  {fmtDate(p.date)} — {p.donorName} ({(p.sksItems||[]).length} items)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Pickup info */}
        {pickupObj && (
          <div style={{ padding:'10px 12px', background:'var(--secondary-light)', borderRadius:8, fontSize:12, color:'var(--secondary)', display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <User size={11} /> {pickupObj.donorName}
            </div>
            {pickupObj.mobile && (
              <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--secondary)' }}>
                <Phone size={11} /> {pickupObj.mobile}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <MapPin size={11} /> {[pickupObj.society, pickupObj.sector].filter(Boolean).join(', ')}
            </div>
          </div>
        )}

        {/* 4. Item quantities */}
        {sksItemsInPkp.length > 0 && (
          <div>
            <label style={{ fontSize:12.5, fontWeight:700, color:'var(--secondary)', marginBottom:8, display:'block' }}>
              Enter Qty for Each SKS Item Received
            </label>
            <div style={{ border:'1.5px solid var(--secondary)', borderRadius:8, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 12px', background:'var(--secondary-light)', fontSize:10.5, fontWeight:700, color:'var(--secondary)', textTransform:'uppercase' }}>
                <span>Item</span><span style={{ textAlign:'right' }}>Quantity</span>
              </div>
              {sksItemsInPkp.map((item, idx) => {
                const Icon = SKS_ITEM_CONFIG[item]?.icon || Package
                return (
                  <div key={item} style={{ display:'grid', gridTemplateColumns:'1fr 100px', alignItems:'center', padding:'8px 12px', borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Icon size={14} color="var(--secondary)" />
                      <span style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{item}</span>
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>{SKS_ITEM_CONFIG[item]?.unit}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={itemQty[item] || ''}
                      onChange={e => setItemQty(q => ({ ...q, [item]: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      style={{ width:'100%', padding:'5px 8px', fontSize:14, fontWeight:700, textAlign:'right', border:`1.5px solid ${itemQty[item] > 0 ? 'var(--secondary)' : 'var(--border)'}`, borderRadius:6, background:'var(--surface)' }}
                    />
                  </div>
                )
              })}
              {/* Total */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'8px 12px', background:'var(--secondary-light)', borderTop:'1px solid rgba(27,94,53,0.2)' }}>
                <span style={{ fontSize:12.5, fontWeight:700, color:'var(--secondary)' }}>Total Items</span>
                <span style={{ textAlign:'right', fontWeight:800, fontSize:14, color:'var(--secondary)' }}>
                  {sksItemsInPkp.reduce((s, i) => s + (itemQty[i] || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {selectedPickup && (
          <div className="form-group" style={{ margin:0 }}>
            <label>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any observations…" style={{ minHeight:60 }} />
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={handleAdd}
          disabled={!canAdd}
          style={{ width:'100%', justifyContent:'center', padding:'10px', fontSize:14, fontWeight:700, background: canAdd ? 'var(--secondary)' : 'var(--border)', opacity: canAdd ? 1 : 0.5 }}
        >
          <ArrowDownCircle size={16} /> Record Inflow
        </button>
      </div>
    </div>
  )
}

// ── Record Outflow panel ──────────────────────────────────────────────────────
function RecordOutflowPanel({ stock, outflows, onAdd }) {
  const [partnerName,   setPartnerName]   = useState('')
  const [partnerPhone,  setPartnerPhone]  = useState('')
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10))
  const [itemQty,       setItemQty]       = useState({})
  const [notes,         setNotes]         = useState('')
  const [saved,         setSaved]         = useState(false)

  const availableItems = useMemo(() => ALL_SKS_ITEMS.filter(i => (stock[i] || 0) > 0), [stock])
  const totalOut = Object.values(itemQty).reduce((s, v) => s + (v || 0), 0)
  const canAdd   = partnerName.trim() && date && totalOut > 0

  const handleAdd = () => {
    const items = Object.entries(itemQty).filter(([, qty]) => qty > 0).map(([name, qty]) => ({ name, qty: Number(qty) }))
    if (!items.length) return
    onAdd({
      id:          nextOutflowId(),
      date,
      partnerName: partnerName.trim(),
      partnerPhone: partnerPhone.trim(),
      items,
      notes,
    })
    setItemQty({}); setNotes(''); setPartnerName(''); setPartnerPhone(''); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card" style={{ height:'100%' }}>
      <div className="card-header" style={{ background:'linear-gradient(135deg,#FDE7DA 0%,#fff9f7 100%)' }}>
        <ArrowUpCircle size={18} color="var(--primary)" />
        <div className="card-title" style={{ color:'var(--primary)' }}>Record Outflow</div>
        {saved && (
          <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'var(--primary)', background:'var(--primary-light)', padding:'3px 10px', borderRadius:20 }}>
            <CheckCircle size={12} /> Dispatched!
          </span>
        )}
      </div>
      <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>

        <div className="form-grid">
          <div className="form-group" style={{ margin:0 }}>
            <label><User size={12} style={{ verticalAlign:'middle', marginRight:4 }} />SKS Partner Name <span className="required">*</span></label>
            <input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="e.g. Teach for India…" />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label><Phone size={12} style={{ verticalAlign:'middle', marginRight:4 }} />Contact Number</label>
            <input value={partnerPhone} onChange={e => setPartnerPhone(e.target.value)} placeholder="10-digit" maxLength={10} inputMode="numeric" />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label><Calendar size={12} style={{ verticalAlign:'middle', marginRight:4 }} />Dispatch Date <span className="required">*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Items to dispatch */}
        <div>
          <label style={{ fontSize:12.5, fontWeight:700, color:'var(--primary)', marginBottom:8, display:'block' }}>
            Items to Dispatch (from current stock)
          </label>
          {availableItems.length === 0 ? (
            <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:13, background:'var(--bg)', borderRadius:8 }}>
              No items in stock yet. Record inflow first.
            </div>
          ) : (
            <div style={{ border:'1.5px solid var(--primary)', borderRadius:8, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px', padding:'6px 12px', background:'var(--primary-light)', fontSize:10.5, fontWeight:700, color:'var(--primary)', textTransform:'uppercase' }}>
                <span>Item</span><span style={{ textAlign:'center' }}>In Stock</span><span style={{ textAlign:'right' }}>Dispatch</span>
              </div>
              {availableItems.map((item, idx) => {
                const Icon   = SKS_ITEM_CONFIG[item]?.icon || Package
                const inStk  = stock[item] || 0
                return (
                  <div key={item} style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px', alignItems:'center', padding:'8px 12px', borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <Icon size={14} color="var(--primary)" />
                      <span style={{ fontSize:13, fontWeight:500 }}>{item}</span>
                    </div>
                    <div style={{ textAlign:'center', fontWeight:700, fontSize:13, color:'var(--secondary)' }}>{inStk}</div>
                    <input
                      type="number"
                      min={0}
                      max={inStk}
                      value={itemQty[item] || ''}
                      onChange={e => setItemQty(q => ({ ...q, [item]: Math.min(inStk, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      style={{ width:'100%', padding:'5px 8px', fontSize:14, fontWeight:700, textAlign:'right', border:`1.5px solid ${itemQty[item] > 0 ? 'var(--primary)' : 'var(--border)'}`, borderRadius:6, background:'var(--surface)' }}
                    />
                  </div>
                )
              })}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px', padding:'8px 12px', background:'var(--primary-light)', borderTop:'1px solid rgba(232,82,26,0.2)' }}>
                <span style={{ fontSize:12.5, fontWeight:700, color:'var(--primary)' }}>Total Dispatching</span>
                <span />
                <span style={{ textAlign:'right', fontWeight:800, fontSize:14, color:'var(--primary)' }}>{totalOut}</span>
              </div>
            </div>
          )}
        </div>

        <div className="form-group" style={{ margin:0 }}>
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purpose, receipt details…" style={{ minHeight:60 }} />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!canAdd}
          style={{ width:'100%', justifyContent:'center', padding:'10px', fontSize:14, fontWeight:700, opacity: canAdd ? 1 : 0.5 }}
        >
          <ArrowUpCircle size={16} /> Record Outflow
        </button>
      </div>
    </div>
  )
}

// ── Warehouse table ───────────────────────────────────────────────────────────
function WarehouseTable({ stock, totalInflow, totalOutflow }) {
  const rows = useMemo(() =>
    ALL_SKS_ITEMS.map(item => {
      const cfg  = SKS_ITEM_CONFIG[item] || {}
      const Icon = cfg.icon || Package
      return { item, Icon, category: cfg.category, unit: cfg.unit, inStock: stock[item] || 0 }
    }),
    [stock]
  )
  const totalInStock = rows.reduce((s, r) => s + r.inStock, 0)

  return (
    <div className="card">
      <div className="card-header">
        <Boxes size={18} color="var(--secondary)" />
        <div className="card-title">Warehouse Stock</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:16, fontSize:12 }}>
          <span style={{ color:'var(--secondary)', fontWeight:700 }}>↓ {totalInflow} received</span>
          <span style={{ color:'var(--primary)', fontWeight:700 }}>↑ {totalOutflow} dispatched</span>
          <span style={{ color:'var(--text-secondary)', fontWeight:700 }}>📦 {totalInStock} in stock</span>
        </div>
      </div>
      <div className="table-wrap" style={{ border:'none', boxShadow:'none', borderRadius:0 }}>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Unit</th>
              <th style={{ textAlign:'right' }}>In Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.item}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <r.Icon size={14} color={r.inStock > 0 ? 'var(--secondary)' : 'var(--text-muted)'} />
                    <span style={{ fontWeight:600, color: r.inStock > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{r.item}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-info" style={{ fontSize:10 }}>{r.category}</span>
                </td>
                <td style={{ fontSize:12, color:'var(--text-muted)' }}>{r.unit}</td>
                <td style={{ textAlign:'right' }}>
                  <span style={{
                    fontFamily:'var(--font-display)', fontSize:16, fontWeight:700,
                    color: r.inStock > 10 ? 'var(--secondary)' : r.inStock > 0 ? 'var(--warning)' : 'var(--text-muted)',
                  }}>
                    {r.inStock}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── History log ───────────────────────────────────────────────────────────────
function HistoryLog({ inflows, outflows, onDeleteInflow, onDeleteOutflow }) {
  const [tab, setTab] = useState('inflow')

  const combined = useMemo(() => {
    const all = [
      ...inflows.map(i => ({ ...i, _type: 'inflow' })),
      ...outflows.map(o => ({ ...o, _type: 'outflow' })),
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return all
  }, [inflows, outflows])

  const rows = tab === 'all' ? combined : combined.filter(r => r._type === tab)

  return (
    <div className="card" style={{ marginTop:20 }}>
      <div className="card-header">
        <div className="card-title">Transaction History</div>
        <div className="tabs" style={{ margin:0, background:'transparent' }}>
          {['all','inflow','outflow'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ fontSize:12, padding:'5px 12px' }}>
              {t === 'all' ? 'All' : t === 'inflow' ? '↓ Inflow' : '↑ Outflow'}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding:'32px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No records yet.</div>
      ) : (
        <div>
          {rows.map((r, i) => {
            const isInflow = r._type === 'inflow'
            const total    = (r.items || []).reduce((s, it) => s + (it.qty || 0), 0)
            return (
              <div key={r.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 20px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background: isInflow ? 'var(--secondary-light)' : 'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {isInflow ? <ArrowDownCircle size={16} color="var(--secondary)" /> : <ArrowUpCircle size={16} color="var(--primary)" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    <span style={{ fontSize:10.5, fontFamily:'monospace', fontWeight:700, color: isInflow ? 'var(--secondary)' : 'var(--primary)', background: isInflow ? 'var(--secondary-light)' : 'var(--primary-light)', padding:'1px 7px', borderRadius:4 }}>{r.id}</span>
                    <span style={{ fontWeight:700, fontSize:13 }}>{isInflow ? r.society || r.donorName : r.partnerName}</span>
                    {!isInflow && r.partnerPhone && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{r.partnerPhone}</span>}
                    <span style={{ fontSize:11.5, color:'var(--text-muted)', marginLeft:'auto' }}>{fmtDate(r.date)}</span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:r.notes ? 4 : 0 }}>
                    {(r.items || []).map(it => (
                      <span key={it.name} style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: isInflow ? 'var(--secondary-light)' : 'var(--primary-light)', color: isInflow ? 'var(--secondary)' : 'var(--primary)', fontWeight:600 }}>
                        {it.name} ×{it.qty}
                      </span>
                    ))}
                  </div>
                  {r.notes && <div style={{ fontSize:11.5, color:'var(--text-muted)', fontStyle:'italic' }}>{r.notes}</div>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color: isInflow ? 'var(--secondary)' : 'var(--primary)' }}>
                    {isInflow ? '+' : '-'}{total}
                  </span>
                  <button
                    onClick={() => isInflow ? onDeleteInflow(r.id) : onDeleteOutflow(r.id)}
                    style={{ width:26, height:26, borderRadius:6, border:'1px solid var(--danger)', background:'var(--danger-bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)' }}
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function SKSOverview() {
  const { pickups } = useApp()

  const [inflows,  setInflows]  = useState([])
  const [outflows, setOutflows] = useState([])
  const [section,  setSection]  = useState('record') // 'record' | 'warehouse'

  const sksPickups = useMemo(() =>
    pickups.filter(p => p.sksItems?.length > 0 && p.status === 'Completed'),
    [pickups]
  )

  const stock        = useMemo(() => computeStock(inflows, outflows), [inflows, outflows])
  const totalInflow  = useMemo(() => inflows.reduce((s, i)  => s + (i.items||[]).reduce((a, it) => a + it.qty, 0), 0), [inflows])
  const totalOutflow = useMemo(() => outflows.reduce((s, o) => s + (o.items||[]).reduce((a, it) => a + it.qty, 0), 0), [outflows])
  const totalInStock = useMemo(() => Object.values(stock).reduce((s, v) => s + v, 0), [stock])

  const addInflow    = useCallback(r => setInflows(prev => [r, ...prev]), [])
  const addOutflow   = useCallback(r => setOutflows(prev => [r, ...prev]), [])
  const delInflow    = useCallback(id => setInflows(prev => prev.filter(r => r.id !== id)), [])
  const delOutflow   = useCallback(id => setOutflows(prev => prev.filter(r => r.id !== id)), [])

  const handleExport = () => exportToExcel(
    Object.entries(stock).map(([item, qty]) => ({
      Item: item,
      Category: SKS_ITEM_CONFIG[item]?.category || '—',
      Unit: SKS_ITEM_CONFIG[item]?.unit || '—',
      'In Stock': qty,
    })),
    'SKS_Warehouse_Stock'
  )

  return (
    <div className="page-body">
      {/* Summary KPIs */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        <div className="stat-card blue">
          <div className="stat-icon"><Boxes size={18}/></div>
          <div className="stat-value">{sksPickups.length}</div>
          <div className="stat-label">SKS Pickups Done</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><ArrowDownCircle size={18}/></div>
          <div className="stat-value">{totalInflow}</div>
          <div className="stat-label">Items Received</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><Package size={18}/></div>
          <div className="stat-value">{totalInStock}</div>
          <div className="stat-label">In Warehouse</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon"><ArrowUpCircle size={18}/></div>
          <div className="stat-value">{totalOutflow}</div>
          <div className="stat-label">Dispatched</div>
        </div>
      </div>

      {/* Section toggle */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          <button className={`tab ${section === 'record' ? 'active' : ''}`} onClick={() => setSection('record')}>
            📋 Record Inflow / Outflow
          </button>
          <button className={`tab ${section === 'warehouse' ? 'active' : ''}`} onClick={() => setSection('warehouse')}>
            📦 Warehouse & History
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport}>
          <Download size={13} /> Export Stock
        </button>
      </div>

      {/* ── RECORD SECTION ── */}
      {section === 'record' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="two-col-sks">
          <style>{`@media (max-width: 860px) { .two-col-sks { grid-template-columns: 1fr !important; } }`}</style>
          <RecordInflowPanel  pickups={sksPickups} inflows={inflows}   onAdd={addInflow} />
          <RecordOutflowPanel stock={stock}        outflows={outflows}  onAdd={addOutflow} />
        </div>
      )}

      {/* ── WAREHOUSE SECTION ── */}
      {section === 'warehouse' && (
        <>
          <WarehouseTable stock={stock} totalInflow={totalInflow} totalOutflow={totalOutflow} />
          <HistoryLog
            inflows={inflows}
            outflows={outflows}
            onDeleteInflow={delInflow}
            onDeleteOutflow={delOutflow}
          />
        </>
      )}
    </div>
  )
}