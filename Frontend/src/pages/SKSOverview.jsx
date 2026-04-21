// Frontend/src/pages/SKSOverview.jsx
// SKS Warehouse — Stock In | Stock In History | In Warehouse
import { useState, useMemo, useCallback } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Package, Boxes,
  Plus, X, CheckCircle, Download, Trash2,
  MapPin, Calendar, Search,
  ShoppingBag, Shirt, Footprints, Gift, Dumbbell, BookOpen,
  UtensilsCrossed, Armchair, Monitor, Laptop, Wind, Microwave,
  AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'
import { CITIES, CITY_SECTORS, GURGAON_SOCIETIES, SKS_ITEMS } from '../data/mockData'
import { fmtDate, exportToExcel } from '../utils/helpers'

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10)

let _inSeq = 0, _outSeq = 0
const nextInId  = () => `IN-${String(++_inSeq).padStart(4, '0')}`
const nextOutId = () => `OUT-${String(++_outSeq).padStart(4, '0')}`

const SKS_ITEM_CONFIG = {
  'Kids Clothes':    { icon: Shirt,           category: 'Clothing' },
  'Kids Shoes':      { icon: Footprints,      category: 'Clothing' },
  'Adult Clothes':   { icon: Shirt,           category: 'Clothing' },
  'Adult Shoes':     { icon: Footprints,      category: 'Clothing' },
  'Toys':            { icon: Gift,            category: 'Children' },
  'Sports Items':    { icon: Dumbbell,        category: 'Children' },
  'New Stationery':  { icon: BookOpen,        category: 'Education' },
  'Utensils':        { icon: UtensilsCrossed, category: 'Household' },
  'Furniture':       { icon: Armchair,        category: 'Household' },
  'TV':              { icon: Monitor,         category: 'Electronics' },
  'Laptop / PC':     { icon: Laptop,          category: 'Electronics' },
  'Purifier':        { icon: Wind,            category: 'Electronics' },
  'Microwave / OTG': { icon: Microwave,       category: 'Electronics' },
  'Others':          { icon: ShoppingBag,     category: 'Misc' },
}

function computeStock(inflows, outflows) {
  const stock = {}
  inflows.forEach(inf =>
    (inf.items || []).forEach(({ name, qty }) => { stock[name] = (stock[name] || 0) + (qty || 0) })
  )
  outflows.forEach(out =>
    (out.items || []).forEach(({ name, qty }) => { stock[name] = Math.max(0, (stock[name] || 0) - (qty || 0)) })
  )
  return stock
}

function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  const y = now.getFullYear(), m = now.getMonth()
  if (preset === 'today') return { from: fmt(now), to: fmt(now) }
  if (preset === 'week') {
    const daysSinceMon = now.getDay() === 0 ? 6 : now.getDay() - 1
    const mon = new Date(now); mon.setDate(now.getDate() - daysSinceMon)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: fmt(mon), to: fmt(sun) }
  }
  if (preset === 'month') return { from: `${y}-${String(m + 1).padStart(2,'0')}-01`, to: fmt(now) }
  if (preset === 'last_month') {
    const lm = m === 0 ? 11 : m - 1; const ly = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${String(lm + 1).padStart(2,'0')}-01`, to: `${ly}-${String(lm + 1).padStart(2,'0')}-${String(last).padStart(2,'0')}` }
  }
  if (preset === 'custom') return { from: customFrom || '', to: customTo || '' }
  return { from: '', to: '' }
}

const DATE_PRESETS = [
  { id: '', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
]

// ── Stock In Form ─────────────────────────────────────────────────────────────
function StockInForm({ allSKSItems, onAdd, onAddCustomItem }) {
  const [date,           setDate]           = useState(todayStr())
  const [city,           setCity]           = useState('Gurgaon')
  const [sector,         setSector]         = useState('')
  const [society,        setSociety]        = useState('')
  const [showNewSociety, setShowNewSociety] = useState(false)
  const [newSocietyVal,  setNewSocietyVal]  = useState('')
  const [itemQty,        setItemQty]        = useState({})
  const [newItemName,    setNewItemName]    = useState('')
  const [notes,          setNotes]          = useState('')
  const [error,          setError]          = useState('')
  const [saved,          setSaved]          = useState(false)

  const sectorOptions  = CITY_SECTORS[city] || []
  const societyOptions = useMemo(() => {
    if (city === 'Gurgaon' && sector && GURGAON_SOCIETIES[sector]) return GURGAON_SOCIETIES[sector]
    return []
  }, [city, sector])

  const totalQty = Object.values(itemQty).reduce((s, v) => s + (Number(v) || 0), 0)

  const handleCityChange = (c) => { setCity(c); setSector(''); setSociety(''); setShowNewSociety(false) }
  const handleSectorChange = (s) => { setSector(s); setSociety(''); setShowNewSociety(false) }

  const handleSocietySelect = (v) => {
    if (v === '__add__') { setShowNewSociety(true); setSociety('') }
    else setSociety(v)
  }

  const confirmNewSociety = () => {
    const v = newSocietyVal.trim()
    if (!v) return
    setSociety(v); setShowNewSociety(false); setNewSocietyVal('')
  }

  const handleAddCustomItem = () => {
    const name = newItemName.trim()
    if (!name || allSKSItems.includes(name)) { setNewItemName(''); return }
    onAddCustomItem(name)
    setNewItemName('')
  }

  const handleSubmit = () => {
    if (!date)      { setError('Please select a date.'); return }
    if (!city)      { setError('Please select a city.'); return }
    if (totalQty < 1) { setError('Enter quantity for at least one item.'); return }
    setError('')

    const items = Object.entries(itemQty)
      .filter(([, q]) => (Number(q) || 0) > 0)
      .map(([name, qty]) => ({ name, qty: Number(qty) }))

    onAdd({
      id: nextInId(), date, city, sector,
      society: showNewSociety ? newSocietyVal.trim() : society,
      items, notes: notes.trim(),
    })

    setItemQty({}); setNotes('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="card">
      <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--secondary-light), var(--surface))' }}>
        <ArrowDownCircle size={18} color="var(--secondary)" />
        <div className="card-title" style={{ color: 'var(--secondary)' }}>Record Stock In</div>
        {saved && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '3px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle size={12} /> Entry Saved!
          </span>
        )}
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Location ── */}
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={12} color="var(--primary)" /> Location Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>

            {/* Date */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Date <span className="required">*</span></label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {/* City */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>City <span className="required">*</span></label>
              <select value={city} onChange={e => handleCityChange(e.target.value)}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Sector */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Sector / Area</label>
              <select value={sector} onChange={e => handleSectorChange(e.target.value)} disabled={!city}>
                <option value="">— Select Sector —</option>
                {sectorOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Society */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Society / Colony</label>
              {showNewSociety ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input autoFocus value={newSocietyVal} onChange={e => setNewSocietyVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmNewSociety()}
                    placeholder="Enter society name…" style={{ flex: 1 }} />
                  <button type="button" onClick={confirmNewSociety} className="btn btn-secondary btn-sm">✓</button>
                  <button type="button" onClick={() => { setShowNewSociety(false); setNewSocietyVal('') }} className="btn btn-ghost btn-sm"><X size={12} /></button>
                </div>
              ) : societyOptions.length > 0 ? (
                <select value={society} onChange={e => handleSocietySelect(e.target.value)}>
                  <option value="">— Select Society —</option>
                  {societyOptions.map(s => <option key={s}>{s}</option>)}
                  <option value="__add__">✏️ Add New Society…</option>
                </select>
              ) : (
                <input value={society} onChange={e => setSociety(e.target.value)}
                  placeholder={sector ? 'Type society name…' : 'Select sector first…'} />
              )}
            </div>
          </div>

          {/* Location preview */}
          {(sector || society) && !showNewSociety && (
            <div style={{ marginTop: 10, padding: '6px 12px', background: 'var(--secondary-light)', borderRadius: 6, fontSize: 12, color: 'var(--secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={11} />
              {[society, sector, city].filter(Boolean).join(' › ')}
            </div>
          )}
        </div>

        {/* ── Items ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SKS Items — Enter Quantities
            </div>
            {totalQty > 0 && (
              <span style={{ background: 'var(--secondary)', color: 'white', borderRadius: 20, fontSize: 11, padding: '2px 10px', fontWeight: 700 }}>
                {totalQty} items total
              </span>
            )}
          </div>

          <div style={{ border: '1.5px solid var(--secondary)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', padding: '7px 14px', background: 'var(--secondary-light)', fontSize: 10.5, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Item</span><span style={{ textAlign: 'right' }}>Qty</span>
            </div>
            {allSKSItems.map((item, idx) => {
              const cfg  = SKS_ITEM_CONFIG[item] || { icon: ShoppingBag, category: 'Custom' }
              const Icon = cfg.icon
              const qty  = Number(itemQty[item]) || 0
              return (
                <div key={item} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', alignItems: 'center', padding: '9px 14px', borderTop: '1px solid var(--border-light)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Icon size={14} color={qty > 0 ? 'var(--secondary)' : 'var(--text-muted)'} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: qty > 0 ? 700 : 500, color: qty > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cfg.category}</div>
                    </div>
                  </div>
                  <input
                    type="number" min={0} inputMode="numeric"
                    value={itemQty[item] || ''}
                    onChange={e => setItemQty(q => ({ ...q, [item]: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 14, fontWeight: 700, textAlign: 'right', border: `1.5px solid ${qty > 0 ? 'var(--secondary)' : 'var(--border)'}`, borderRadius: 6 }}
                  />
                </div>
              )
            })}
            {/* Total row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', padding: '9px 14px', background: 'var(--secondary-light)', borderTop: '1.5px solid rgba(27,94,53,0.2)', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--secondary)' }}>Total Items</span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: totalQty > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                {totalQty || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Add Custom Item ── */}
        <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={12} color="var(--secondary)" />
            Add New Item Type
            <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>Persists for future entries this session</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="e.g. Blankets, School Bags, Winter Jackets…"
              onKeyDown={e => e.key === 'Enter' && handleAddCustomItem()}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button type="button" onClick={handleAddCustomItem} className="btn btn-secondary btn-sm" disabled={!newItemName.trim()}>
              + Add
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="form-group" style={{ margin: 0 }}>
          <label>Notes <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Donor name, drive details, remarks…" style={{ minHeight: 60, resize: 'vertical' }} />
        </div>

        {error && (
          <div style={{ fontSize: 12.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <button className="btn btn-secondary" onClick={handleSubmit}
          style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, fontWeight: 700, background: 'var(--secondary)', color: 'white' }}>
          <ArrowDownCircle size={16} /> Record Stock In
        </button>
      </div>
    </div>
  )
}

// ── Stock In History ──────────────────────────────────────────────────────────
function HistoryView({ inflows, isAdmin, onDelete }) {
  const [datePreset, setDatePreset] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [search,     setSearch]     = useState('')
  const [expanded,   setExpanded]   = useState({})

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return inflows.filter(r => {
      const inDate   = (!dateFrom || (r.date || '') >= dateFrom) && (!dateTo || (r.date || '') <= dateTo)
      const inSearch = !q || (r.society || '').toLowerCase().includes(q) || (r.sector || '').toLowerCase().includes(q) || (r.city || '').toLowerCase().includes(q) || (r.id || '').toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q)
      return inDate && inSearch
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [inflows, dateFrom, dateTo, search])

  const totalQty    = filtered.reduce((s, r) => s + (r.items || []).reduce((a, it) => a + it.qty, 0), 0)
  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleExport = () => exportToExcel(
    filtered.flatMap(r => (r.items || []).map(it => ({
      'ID': r.id, 'Date': r.date, 'City': r.city || '',
      'Sector': r.sector || '', 'Society': r.society || '',
      'Item': it.name, 'Qty': it.qty, 'Notes': r.notes || '',
    }))),
    'SKS_StockIn_History'
  )

  return (
    <div>
      {/* Filters */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <Calendar size={13} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', flexShrink: 0 }}>Date:</span>
          {DATE_PRESETS.map(p => (
            <button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11.5 }} onClick={() => setDatePreset(p.id)}>
              {p.label}
            </button>
          ))}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 140, fontSize: 12 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
              <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   style={{ width: 140, fontSize: 12 }} />
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by society, sector, city, ID…"
            style={{ paddingLeft: 32, fontSize: 12.5, width: '100%' }} />
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 12.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span><strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> entries ·</span>
        <span><strong style={{ color: 'var(--secondary)' }}>{totalQty}</strong> items received</span>
        {!isAdmin && (
          <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 10px', background: 'var(--border-light)', borderRadius: 20, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            🔒 Delete: Admin only
          </span>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleExport} style={{ marginLeft: isAdmin ? 'auto' : 0 }}>
          <Download size={12} /> Export
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
            <ArrowDownCircle size={24} />
          </div>
          <h3>No Stock In Records</h3>
          <p>Stock In entries appear here once recorded.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const rowTotal   = (r.items || []).reduce((s, it) => s + it.qty, 0)
            const isOpen     = !!expanded[r.id]
            const hasDetails = (r.items || []).length > 1 || !!r.notes

            return (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', cursor: hasDetails ? 'pointer' : 'default' }}
                  onClick={() => hasDetails && toggleExpand(r.id)}>

                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowDownCircle size={18} color="var(--secondary)" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'white', background: 'var(--secondary)', padding: '2px 7px', borderRadius: 4 }}>{r.id}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{fmtDate(r.date)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                      <MapPin size={11} />
                      {[r.society, r.sector, r.city].filter(Boolean).join(', ') || '—'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(r.items || []).slice(0, 4).map(it => (
                        <span key={it.name} style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 20, background: 'var(--secondary-light)', color: 'var(--secondary)', fontWeight: 600 }}>
                          {it.name} ×{it.qty}
                        </span>
                      ))}
                      {(r.items || []).length > 4 && <span style={{ fontSize: 10.5, color: 'var(--text-muted)', padding: '2px 4px' }}>+{r.items.length - 4} more</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--secondary)', lineHeight: 1 }}>+{rowTotal}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>items</div>
                    </div>
                    {hasDetails && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); if (window.confirm('Delete this Stock In record?')) onDelete(r.id) }}
                        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--danger)', background: 'var(--danger-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}
                        title="Delete record (Admin only)"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px 16px', background: 'var(--bg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                      {(r.items || []).map(it => {
                        const cfg  = SKS_ITEM_CONFIG[it.name] || { icon: ShoppingBag }
                        const Icon = cfg.icon
                        return (
                          <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                            <Icon size={13} color="var(--secondary)" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">{it.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 700 }}>×{it.qty}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {r.notes && (
                      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--surface)', borderRadius: 6 }}>
                        📝 {r.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── In Warehouse ──────────────────────────────────────────────────────────────
function WarehouseView({ stock, allSKSItems, outflows, isAdmin, onAddOutflow, onDeleteOutflow }) {
  const [showDispatch,  setShowDispatch]  = useState(false)
  const [partnerName,   setPartnerName]   = useState('')
  const [partnerPhone,  setPartnerPhone]  = useState('')
  const [dispDate,      setDispDate]      = useState(todayStr())
  const [dispQty,       setDispQty]       = useState({})
  const [dispNotes,     setDispNotes]     = useState('')
  const [dispSaved,     setDispSaved]     = useState(false)

  const availableItems = allSKSItems.filter(i => (stock[i] || 0) > 0)
  const totalInStock   = Object.values(stock).reduce((s, v) => s + v, 0)
  const totalDispatch  = Object.values(dispQty).reduce((s, v) => s + (Number(v) || 0), 0)
  const canDispatch    = partnerName.trim() && dispDate && totalDispatch > 0

  const handleDispatch = () => {
    if (!canDispatch) return
    const items = Object.entries(dispQty).filter(([, q]) => (Number(q) || 0) > 0).map(([name, qty]) => ({ name, qty: Number(qty) }))
    onAddOutflow({ id: nextOutId(), date: dispDate, partnerName: partnerName.trim(), partnerPhone: partnerPhone.trim(), items, notes: dispNotes.trim() })
    setDispQty({}); setPartnerName(''); setPartnerPhone(''); setDispNotes('')
    setDispSaved(true)
    setTimeout(() => { setDispSaved(false); setShowDispatch(false) }, 2200)
  }

  const handleExportStock = () => exportToExcel(
    allSKSItems.map(item => ({
      Item: item,
      Category: (SKS_ITEM_CONFIG[item] || {}).category || '—',
      'In Stock': stock[item] || 0,
    })),
    'SKS_Warehouse_Stock'
  )

  return (
    <div>
      {/* KPIs */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon"><Boxes size={18} /></div>
          <div className="stat-value">{totalInStock}</div>
          <div className="stat-label">Total In Warehouse</div>
          <div className="stat-change up">{availableItems.length} item types</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><ArrowUpCircle size={18} /></div>
          <div className="stat-value">{outflows.reduce((s, r) => s + (r.items || []).reduce((a, it) => a + it.qty, 0), 0)}</div>
          <div className="stat-label">Total Dispatched</div>
          <div className="stat-change up">{outflows.length} dispatches</div>
        </div>
      </div>

      {/* Current stock table */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <Boxes size={16} color="var(--secondary)" />
          <div className="card-title">Current Stock</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleExportStock}>
              <Download size={13} /> Export
            </button>
            <button className={`btn btn-sm ${showDispatch ? 'btn-danger' : 'btn-primary'}`} onClick={() => setShowDispatch(s => !s)}>
              {showDispatch ? <><X size={13} /> Cancel</> : <><ArrowUpCircle size={13} /> Stock Out</>}
            </button>
          </div>
        </div>
        <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>In Stock</th>
                {showDispatch && <th style={{ textAlign: 'right' }}>Dispatch Qty</th>}
              </tr>
            </thead>
            <tbody>
              {allSKSItems.map(item => {
                const cfg  = SKS_ITEM_CONFIG[item] || { icon: ShoppingBag, category: 'Custom' }
                const Icon = cfg.icon
                const qty  = stock[item] || 0
                return (
                  <tr key={item} style={{ opacity: qty === 0 ? 0.4 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} color={qty > 0 ? 'var(--secondary)' : 'var(--text-muted)'} />
                        <span style={{ fontWeight: 600 }}>{item}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-muted" style={{ fontSize: 10 }}>{cfg.category}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: qty > 10 ? 'var(--secondary)' : qty > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {qty}
                      </span>
                    </td>
                    {showDispatch && (
                      <td style={{ textAlign: 'right' }}>
                        {qty > 0 ? (
                          <input type="number" min={0} max={qty} inputMode="numeric"
                            value={dispQty[item] || ''}
                            onChange={e => setDispQty(q => ({ ...q, [item]: Math.min(qty, parseInt(e.target.value) || 0) }))}
                            placeholder="0"
                            style={{ width: 82, padding: '5px 9px', fontSize: 13, fontWeight: 700, textAlign: 'right', border: `1.5px solid ${(dispQty[item] || 0) > 0 ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6 }}
                          />
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch form */}
      {showDispatch && (
        <div className="card" style={{ marginBottom: 16, border: '2px solid var(--primary)' }}>
          <div className="card-header" style={{ background: 'var(--primary-light)' }}>
            <ArrowUpCircle size={16} color="var(--primary)" />
            <div className="card-title" style={{ color: 'var(--primary)' }}>Dispatch Details</div>
            {dispSaved && <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={12} /> Dispatched!</span>}
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>SKS Partner Name <span className="required">*</span></label>
                <input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="e.g. Teach for India" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Contact Number</label>
                <input value={partnerPhone} onChange={e => setPartnerPhone(e.target.value)} placeholder="10-digit" maxLength={10} inputMode="numeric" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Dispatch Date <span className="required">*</span></label>
                <input type="date" value={dispDate} onChange={e => setDispDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ margin: '0 0 12px' }}>
              <label>Notes</label>
              <textarea value={dispNotes} onChange={e => setDispNotes(e.target.value)} placeholder="Purpose, receipt reference…" style={{ minHeight: 52 }} />
            </div>
            {totalDispatch > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--primary-light)', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={14} /> Dispatching {totalDispatch} items
              </div>
            )}
            <button className="btn btn-primary" onClick={handleDispatch} disabled={!canDispatch}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: canDispatch ? 1 : 0.5 }}>
              <ArrowUpCircle size={15} /> Confirm Dispatch
            </button>
          </div>
        </div>
      )}

      {/* Dispatch history */}
      {outflows.length > 0 && (
        <div className="card">
          <div className="card-header">
            <ArrowUpCircle size={16} color="var(--primary)" />
            <div className="card-title">Dispatch History</div>
            {!isAdmin && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', padding: '2px 9px', background: 'var(--border-light)', borderRadius: 20 }}>🔒 Delete: Admin only</span>}
          </div>
          <div>
            {[...outflows].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((r, i) => {
              const totalQ = (r.items || []).reduce((s, it) => s + it.qty, 0)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < outflows.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowUpCircle size={15} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'white', background: 'var(--primary)', padding: '1px 6px', borderRadius: 4 }}>{r.id}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{r.partnerName}</span>
                      {r.partnerPhone && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.partnerPhone}</span>}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{fmtDate(r.date)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {(r.items || []).map(it => (
                        <span key={it.name} style={{ fontSize: 10.5, padding: '1px 8px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
                          {it.name} ×{it.qty}
                        </span>
                      ))}
                    </div>
                    {r.notes && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 3 }}>{r.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>-{totalQ}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>items</div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => { if (window.confirm('Delete this dispatch record?')) onDeleteOutflow(r.id) }}
                        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--danger)', background: 'var(--danger-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}
                        title="Delete (Admin only)"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function SKSOverview() {
  const { pickups } = useApp()
  const { role }    = useRole()
  const isAdmin     = role === 'admin'

  const [section,     setSection]     = useState('stockin')  // 'stockin' | 'history' | 'warehouse'
  const [inflows,     setInflows]     = useState([])
  const [outflows,    setOutflows]    = useState([])
  const [customItems, setCustomItems] = useState([])

  const allSKSItems = useMemo(() => {
    const base = new Set(SKS_ITEMS)
    return [...SKS_ITEMS, ...customItems.filter(c => !base.has(c))]
  }, [customItems])

  const stock = useMemo(() => computeStock(inflows, outflows), [inflows, outflows])

  const addInflow       = useCallback(r => setInflows(prev => [r, ...prev]), [])
  const addOutflow      = useCallback(r => setOutflows(prev => [r, ...prev]), [])
  const deleteInflow    = useCallback(id => setInflows(prev => prev.filter(r => r.id !== id)), [])
  const deleteOutflow   = useCallback(id => setOutflows(prev => prev.filter(r => r.id !== id)), [])
  const addCustomItem   = useCallback(name => setCustomItems(prev => prev.includes(name) ? prev : [...prev, name]), [])

  const totalInStock    = Object.values(stock).reduce((s, v) => s + v, 0)
  const totalReceived   = inflows.reduce((s, r)  => s + (r.items  || []).reduce((a, it) => a + it.qty, 0), 0)
  const totalDispatched = outflows.reduce((s, r) => s + (r.items  || []).reduce((a, it) => a + it.qty, 0), 0)

  const TABS = [
    { id: 'stockin',   label: '↓ Stock In',          count: null },
    { id: 'history',   label: '📋 Stock In History',  count: inflows.length  || null },
    { id: 'warehouse', label: '📦 In Warehouse',      count: totalInStock > 0 ? totalInStock : null },
  ]

  return (
    <div className="page-body">

      {/* Global KPIs */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon"><Boxes size={18} /></div>
          <div className="stat-value">{totalInStock}</div>
          <div className="stat-label">In Warehouse Now</div>
          <div className="stat-change up">{inflows.length} inflow entries</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><ArrowDownCircle size={18} /></div>
          <div className="stat-value">{totalReceived}</div>
          <div className="stat-label">Total Received</div>
          <div className="stat-change up">across all entries</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><ArrowUpCircle size={18} /></div>
          <div className="stat-value">{totalDispatched}</div>
          <div className="stat-label">Total Dispatched</div>
          <div className="stat-change up">{outflows.length} dispatches</div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 6px', background: 'var(--border-light)', borderRadius: 12, width: 'fit-content', marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setSection(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 9, border: 'none',
              cursor: 'pointer', fontSize: 13,
              fontWeight: section === tab.id ? 700 : 500,
              color: section === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              background: section === tab.id ? 'var(--surface)' : 'transparent',
              boxShadow: section === tab.id ? 'var(--shadow)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{ background: section === tab.id ? 'var(--secondary)' : 'var(--border)', color: section === tab.id ? 'white' : 'var(--text-muted)', borderRadius: 20, fontSize: 10.5, padding: '1px 7px', fontWeight: 700 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {section === 'stockin' && (
        <StockInForm
          allSKSItems={allSKSItems}
          onAdd={addInflow}
          onAddCustomItem={addCustomItem}
        />
      )}
      {section === 'history' && (
        <HistoryView
          inflows={inflows}
          isAdmin={isAdmin}
          onDelete={deleteInflow}
        />
      )}
      {section === 'warehouse' && (
        <WarehouseView
          stock={stock}
          allSKSItems={allSKSItems}
          outflows={outflows}
          isAdmin={isAdmin}
          onAddOutflow={addOutflow}
          onDeleteOutflow={deleteOutflow}
        />
      )}
    </div>
  )
}