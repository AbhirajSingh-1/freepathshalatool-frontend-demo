// Frontend/src/pages/Pickups.jsx — Fixed: uses kabadiwalas as partners
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Search, Plus, X, CheckSquare, Square,
  IndianRupee, MapPin, Phone,
  CheckCircle, Truck, Clock,
  AlertCircle, Package, Weight, Hash, UserCheck, ChevronDown,
  History, Star, Trash2,
} from 'lucide-react'
import { useApp }   from '../context/AppContext'
import DonorModal   from '../components/DonorModal'
import { RST_ITEMS, SKS_ITEMS, PICKUP_MODES } from '../data/mockData'
import { fmtDate, fmtCurrency, generateOrderId, pickupStatusColor, paymentStatusColor } from '../utils/helpers'

const todayStr = () => new Date().toISOString().slice(0, 10)
const PAYMENT_STATUS_OPTIONS = ['Paid', 'Not Paid', 'Partially Paid', 'Write Off']
let _otherId = 0
const nextOtherId = () => ++_otherId

const EMPTY_FORM = {
  donorId: '', pickupMode: 'Drive',
  kabadiwala: '', kabadiMobile: '',
  rstItems: [], rstItemWeights: {},
  rstOthers: [],
  sksItems: [], sksOtherText: '',
  totalValue: '', amountPaid: '', paymentStatus: 'Not Paid', notes: '',
}

function derivePayStatus(total, paid) {
  const t = Number(total) || 0; const p = Number(paid) || 0
  if (t === 0) return 'Not Paid'
  if (p >= t)  return 'Paid'
  if (p > 0)   return 'Partially Paid'
  return 'Not Paid'
}

function toKg(value, unit) {
  const n = parseFloat(value) || 0
  return unit === 'gm' ? n / 1000 : n
}

// ─── Donor search dropdown ────────────────────────────────────────────────────
function DonorSearch({ donors, selectedId, onSelect, onAddNew }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const selected = useMemo(() => donors.find(d => d.id === selectedId), [donors, selectedId])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return donors.slice(0, 30)
    return donors.filter(d => d.name.toLowerCase().includes(q) || (d.mobile || '').includes(q))
  }, [donors, query])
  const choose   = (d)  => { onSelect(d.id); setOpen(false); setQuery('') }
  const clear    = (e)  => { e.stopPropagation(); onSelect(''); setQuery('') }
  const handleBlur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }

  return (
    <div style={{ position: 'relative' }} onBlur={handleBlur}>
      <div onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border)'}`, boxShadow: open ? '0 0 0 3px rgba(232,82,26,0.1)' : 'none', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'text', transition: 'all 0.15s' }}>
        <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        {selected && !open ? (
          <>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{selected.name}<span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>{selected.mobile}</span></span>
            <button type="button" onMouseDown={clear} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>
          </>
        ) : (
          <input autoFocus={open} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or mobile…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, padding: 0, color: 'var(--text-primary)' }} />
        )}
      </div>
      {open && (
        <div tabIndex={-1} style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 80, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', maxHeight: 260, overflowY: 'auto' }}>
          <button type="button" tabIndex={0} onMouseDown={e => { e.preventDefault(); setOpen(false); onAddNew() }} style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border-light)', background: 'var(--primary-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
            <Plus size={14} /> Add New Donor
          </button>
          {filtered.length === 0 ? (
            <div style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No donors match "{query}"</div>
          ) : filtered.map(d => (
            <div key={d.id} tabIndex={0} onMouseDown={e => { e.preventDefault(); choose(d) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: d.id === selectedId ? 'var(--primary-light)' : 'transparent' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>{d.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'white', background: 'var(--primary)', padding: '1px 5px', borderRadius: 3 }}>{d.id}</span>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  <span>{d.mobile}</span>
                  {d.society && <span>· {d.society}</span>}
                </div>
              </div>
              {d.id === selectedId && <CheckCircle size={12} color="var(--primary)" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pickup Partner dropdown — FIXED sector matching ──────────────────────────
function PartnerSearch({ partners, donorSector, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const rootRef = useRef(null)
  // FIX: partners comes from kabadiwalas — handle undefined/null safely
  const safePartners = useMemo(() => Array.isArray(partners) ? partners : [], [partners])
  const selected = useMemo(() => safePartners.find(k => k.name === value), [safePartners, value])

  // FIX: Correct sector matching
  const { recommended, others } = useMemo(() => {
    if (!donorSector) return { recommended: [], others: safePartners }
    const rec = safePartners.filter(p => {
      const secs = Array.isArray(p.sectors) ? p.sectors : []
      return secs.some(s => s === donorSector)
    })
    const recNames = new Set(rec.map(p => p.name))
    return { recommended: rec, others: safePartners.filter(p => !recNames.has(p.name)) }
  }, [safePartners, donorSector])

  const filterList = (list) => {
    const q = query.toLowerCase().trim()
    if (!q) return list
    return list.filter(k => k.name.toLowerCase().includes(q) || (k.mobile || '').includes(q))
  }

  useEffect(() => {
    const h = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const choose = (k) => { onChange(k.name); setOpen(false); setQuery('') }

  const PartnerOption = ({ k, isRec }) => (
    <div onMouseDown={() => choose(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: k.name === value ? 'var(--secondary-light)' : 'transparent', transition: 'background 0.1s' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: isRec ? 'var(--secondary-light)' : 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: isRec ? 'var(--secondary)' : 'var(--text-muted)', fontSize: 14 }}>{(k.name || '?')[0]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {k.id && <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, color: 'white', background: 'var(--secondary)', padding: '1px 5px', borderRadius: 3 }}>{k.id}</span>}
          <div style={{ fontWeight: 700, fontSize: 13 }}>{k.name}</div>
          {isRec && <span style={{ fontSize: 10, background: 'var(--secondary)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontWeight: 600 }}>✓ Recommended</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {k.mobile}
          {k.sectors?.length ? ` · ${k.sectors.slice(0, 2).join(', ')}` : ''}
        </div>
      </div>
      {k.name === value && <CheckCircle size={13} color="var(--secondary)" style={{ flexShrink: 0 }} />}
    </div>
  )

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${open ? 'var(--secondary)' : selected ? 'var(--secondary)' : 'var(--border)'}`, boxShadow: open ? '0 0 0 3px rgba(27,94,53,0.12)' : 'none', borderRadius: 'var(--radius-sm)', background: selected ? 'var(--secondary-light)' : 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
        <UserCheck size={14} color={selected ? 'var(--secondary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
        {selected ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--secondary)' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: 'var(--secondary)', opacity: 0.7 }}>{selected.mobile}</div>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--secondary)', display: 'flex', flexShrink: 0 }}><X size={14} /></button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: 13.5 }}>
              {donorSector ? `Partners for ${donorSector}…` : 'Search pickup partner…'}
            </span>
            <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </>
        )}
      </div>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 80, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Type name or mobile…" style={{ paddingLeft: 28, width: '100%', fontSize: 13, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)' }} />
          </div>
          <div onMouseDown={() => { onChange(''); setOpen(false); setQuery('') }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            <X size={12} /> None / Unassigned
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {donorSector && filterList(recommended).length > 0 && (
              <>
                <div style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Star size={10} fill="var(--secondary)" /> Recommended for {donorSector}
                </div>
                {filterList(recommended).map(k => <PartnerOption key={k.id || k.name} k={k} isRec />)}
              </>
            )}
            {filterList(donorSector ? others : safePartners).length > 0 && (
              <>
                {donorSector && filterList(recommended).length > 0 && filterList(others).length > 0 && (
                  <div style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--border-light)' }}>Other Available</div>
                )}
                {filterList(donorSector ? others : safePartners).map(k => <PartnerOption key={k.id || k.name} k={k} isRec={false} />)}
              </>
            )}
            {safePartners.length === 0 && (
              <div style={{ padding: '16px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No pickup partners found. Add one first.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RST Item Chips ────────────────────────────────────────────────────────────
function RSTItemChips({ items, selected, weights, onToggle, onWeight, rstOthers, onOthersChange }) {
  const fmt = (n) => n % 1 === 0 ? String(n) : n.toFixed(3)
  const totalWeight = selected.filter(i => i !== 'Others').reduce((sum, item) => {
    const w = weights[item] || { value: '', unit: 'kg' }
    return sum + toKg(w.value, w.unit || 'kg')
  }, 0)

  const addOther = () => {
    onOthersChange([...rstOthers, { id: nextOtherId(), name: '', weight: '', unit: 'kg', amount: '' }])
  }

  const removeOther = (id) => {
    const next = rstOthers.filter(o => o.id !== id)
    onOthersChange(next)
    if (next.length === 0) onToggle('Others')
  }

  const updateOther = (id, key, val) => {
    onOthersChange(rstOthers.map(o => o.id === id ? { ...o, [key]: val } : o))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
        {items.map(item => {
          const isOn = selected.includes(item)
          return (
            <button key={item} type="button" onClick={() => onToggle(item)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: `1.5px solid ${isOn ? 'var(--primary)' : 'var(--border)'}`, background: isOn ? 'var(--primary-light)' : 'transparent', color: isOn ? 'var(--primary-dark)' : 'var(--text-secondary)', fontWeight: isOn ? 700 : 400, transition: 'all 0.13s', whiteSpace: 'nowrap' }}>
              {isOn ? <CheckSquare size={12} style={{ flexShrink: 0 }} /> : <Square size={12} style={{ flexShrink: 0 }} />}
              {item}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div style={{ marginTop: 12, border: '1.5px solid var(--primary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
          {selected.filter(i => i !== 'Others').length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px', padding: '7px 14px', background: 'var(--primary-light)', fontSize: 10.5, fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Item</span><span style={{ textAlign: 'center' }}>Weight</span><span style={{ textAlign: 'center' }}>Unit</span><span style={{ textAlign: 'right' }}>Remove</span>
              </div>
              {selected.filter(i => i !== 'Others').map((item, idx) => {
                const w  = weights[item] || { value: '', unit: 'kg' }
                const kg = toKg(w.value, w.unit || 'kg')
                return (
                  <div key={item} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px', alignItems: 'center', padding: '9px 14px', borderTop: '1px solid var(--border-light)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item}</span>
                      {kg > 0 && <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 600, marginLeft: 4 }}>= {fmt(kg)} kg</span>}
                    </div>
                    <input type="text" inputMode="decimal" value={w.value || ''} onChange={e => onWeight(item, { ...w, value: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="0" style={{ width: '100%', padding: '6px 10px', fontSize: 13, fontWeight: 700, textAlign: 'right', border: `1.5px solid ${w.value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--surface)', outline: 'none' }} />
                    <select value={w.unit || 'kg'} onChange={e => onWeight(item, { ...w, unit: e.target.value })} style={{ width: '100%', padding: '6px 8px', fontSize: 12, fontWeight: 600, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer' }}>
                      <option value="kg">kg</option>
                      <option value="gm">gm</option>
                    </select>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => onToggle(item)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--danger)', background: 'var(--danger-bg)', cursor: 'pointer', color: 'var(--danger)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: '1px solid var(--border-light)', background: totalWeight > 0 ? 'var(--secondary-light)' : 'var(--bg)', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Weight size={14} color={totalWeight > 0 ? 'var(--secondary)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>Total RST Weight (excl. Others)</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: totalWeight > 0 ? 'var(--secondary)' : 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                  {totalWeight > 0 ? `${fmt(totalWeight)} kg` : '—'}
                </span>
              </div>
            </>
          )}

          {selected.includes('Others') && (
            <div style={{ borderTop: '1px solid var(--border-light)', background: 'var(--primary-light)' }}>
              <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)' }}>"Others" — Custom items</div>
                  <div style={{ fontSize: 11, color: 'var(--primary)', opacity: 0.8, marginTop: 2 }}>Weight + negotiated amount per item</div>
                </div>
                <button type="button" onClick={addOther} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Plus size={12} /> Add Item
                </button>
              </div>
              {rstOthers.length === 0 ? (
                <div style={{ padding: '10px 14px 12px', fontSize: 12.5, color: 'var(--primary)', opacity: 0.7, fontStyle: 'italic' }}>Click "Add Item" to add a custom item →</div>
              ) : rstOthers.map((entry, i) => (
                <div key={entry.id} style={{ margin: '0 14px 10px', padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, border: '1.5px solid rgba(232,82,26,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)' }}>Other Item #{i + 1}</span>
                    <button type="button" onClick={() => removeOther(entry.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--danger)', background: 'var(--danger-bg)', cursor: 'pointer', fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>
                      <Trash2 size={10} /> Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 75px 100px', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Item Name</label>
                      <input type="text" value={entry.name} onChange={e => updateOther(entry.id, 'name', e.target.value)} placeholder="e.g. Broken mirror…" style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Weight</label>
                      <input type="text" inputMode="decimal" value={entry.weight} onChange={e => updateOther(entry.id, 'weight', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ width: '100%', padding: '6px 10px', fontSize: 13, fontWeight: 700, border: `1.5px solid ${entry.weight ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--surface)', outline: 'none', textAlign: 'right' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Unit</label>
                      <select value={entry.unit || 'kg'} onChange={e => updateOther(entry.id, 'unit', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, fontWeight: 600, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer' }}>
                        <option value="kg">kg</option>
                        <option value="gm">gm</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Amount (₹) *</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>₹</span>
                        <input type="text" inputMode="numeric" value={entry.amount} onChange={e => updateOther(entry.id, 'amount', e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" style={{ width: '100%', paddingLeft: 24, padding: '6px 10px 6px 24px', fontSize: 13, fontWeight: 700, border: `1.5px solid ${entry.amount ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--surface)', outline: 'none' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RateBreakdown({ rstItems, rstItemWeights, rateChart, rstOthers }) {
  if (!rateChart || rstItems.length === 0) return null
  const rows = rstItems.filter(i => i !== 'Others').map(item => {
    const w    = rstItemWeights[item] || { value: '', unit: 'kg' }
    const kg   = toKg(w.value, w.unit || 'kg')
    const rate = rateChart[item] ?? null
    const amt  = rate !== null && kg > 0 ? Math.round(kg * rate) : null
    return { item, kg, rate, amt }
  }).filter(r => r.rate !== null)
  const othersTotal = (rstOthers || []).reduce((s, o) => s + (Number(o.amount) || 0), 0)
  if (rows.length === 0 && !othersTotal) return null
  const totalAmt = rows.reduce((s, r) => s + (r.amt || 0), 0) + othersTotal
  const totalKg  = rows.reduce((s, r) => s + r.kg, 0)
  const fmt = (n) => n % 1 === 0 ? String(n) : n.toFixed(3)
  return (
    <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(27,94,53,0.25)', background: 'var(--secondary-light)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', padding: '6px 12px', background: 'rgba(27,94,53,0.12)', fontSize: 10.5, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>
        <span>Item</span><span>Kg</span><span>Rate</span><span>Amount</span>
      </div>
      {rows.map((r, idx) => (
        <div key={r.item} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', padding: '7px 12px', fontSize: 12.5, borderTop: idx > 0 ? '1px solid rgba(27,94,53,0.1)' : 'none' }}>
          <span style={{ fontWeight: 600, color: 'var(--secondary-dark)' }}>{r.item}</span>
          <span>{r.kg > 0 ? fmt(r.kg) : '—'}</span>
          <span style={{ color: 'var(--text-muted)' }}>₹{r.rate}/kg</span>
          <span style={{ fontWeight: 700, color: r.amt ? 'var(--secondary)' : 'var(--text-muted)' }}>{r.amt ? `₹${r.amt.toLocaleString('en-IN')}` : '—'}</span>
        </div>
      ))}
      {(rstOthers || []).filter(o => o.amount).map((o, i) => (
        <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', padding: '7px 12px', fontSize: 12.5, borderTop: '1px solid rgba(27,94,53,0.1)' }}>
          <span style={{ fontWeight: 600 }}>{o.name || `Others #${i + 1}`}</span>
          <span>{o.weight ? `${toKg(o.weight, o.unit || 'kg').toFixed(3)}` : '—'}</span>
          <span style={{ fontSize: 10.5, color: 'var(--info)' }}>Manual</span>
          <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>₹{Number(o.amount).toLocaleString('en-IN')}</span>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', padding: '8px 12px', fontSize: 13, fontWeight: 700, borderTop: '1px solid rgba(27,94,53,0.2)', background: 'rgba(27,94,53,0.15)', color: 'var(--secondary)' }}>
        <span>Total</span>
        <span>{totalKg > 0 ? totalKg.toFixed(3) : '—'} kg</span>
        <span />
        <span>₹{totalAmt.toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}

function SKSItemChips({ items, selected, otherText, onChange, onOtherText }) {
  const toggle = (item) => onChange(selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item])
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => {
          const on = selected.includes(item)
          return (
            <button key={item} type="button" onClick={() => toggle(item)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: `1.5px solid ${on ? 'var(--info)' : 'var(--border)'}`, background: on ? 'var(--info-bg)' : 'transparent', color: on ? '#1E3A8A' : 'var(--text-secondary)', fontWeight: on ? 700 : 400, transition: 'all 0.13s' }}>
              {on ? <CheckSquare size={12} /> : <Square size={12} />}{item}
            </button>
          )
        })}
      </div>
      {selected.includes('Others') && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', background: 'var(--info-bg)', border: '1.5px solid var(--info)', borderRadius: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', flexShrink: 0 }}>Specify:</span>
          <input type="text" value={otherText} onChange={e => onOtherText(e.target.value)} placeholder="e.g. Broken mirror, Mattress…" autoFocus style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, padding: 0 }} />
          {otherText && <button type="button" onClick={() => onOtherText('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}><X size={13} /></button>}
        </div>
      )}
    </div>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 24, zIndex: 200, background: 'var(--secondary)', color: 'white', padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.25s ease', fontSize: 13.5, fontWeight: 600, pointerEvents: 'none' }}>
      <CheckCircle size={16} /> {msg}
    </div>
  )
}

function SectionLabel({ badge, badgeClass, title, count }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <span className={`badge ${badgeClass}`} style={{ fontSize: 10 }}>{badge}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
      {count > 0 && <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 20, fontSize: 10, padding: '1px 7px', fontWeight: 700 }}>{count} selected</span>}
    </label>
  )
}

function PayStatusBadge({ status }) {
  const map = { 'Paid': 'badge-success', 'Not Paid': 'badge-danger', 'Partially Paid': 'badge-warning', 'Write Off': 'badge-muted' }
  return <span className={`badge ${map[status] || 'badge-muted'}`} style={{ fontSize: 11 }}>{status}</span>
}

function DonorPickupHistory({ donor, pickups }) {
  if (!donor) {
    return (
      <div className="card">
        <div className="card-header">
          <History size={15} color="var(--text-muted)" />
          <div className="card-title" style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Donor Pickup History</div>
        </div>
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Select a donor to see their pickup history.</div>
      </div>
    )
  }
  const history = [...(pickups || [])].filter(p => p.donorId === donor.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <div className="card">
      <div className="card-header">
        <History size={15} color="var(--primary)" />
        <div className="card-title" style={{ fontSize: 13.5 }}>{donor.name}'s Pickups</div>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>{history.length} records</span>
      </div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-light)', background: 'var(--secondary-light)' }}>
        {[
          { label: 'Total RST',   value: fmtCurrency(donor.totalRST || 0), color: 'var(--secondary)' },
          { label: 'SKS Pickups', value: donor.totalSKS || 0,              color: 'var(--info)' },
          { label: 'Last Pickup', value: donor.lastPickup ? fmtDate(donor.lastPickup) : '—', color: 'var(--text-primary)' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(27,94,53,0.15)' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: 'var(--secondary)', textTransform: 'uppercase', opacity: 0.7 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {history.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No pickups yet.</div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {history.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: p.status === 'Completed' ? 'var(--secondary)' : p.status === 'Pending' ? 'var(--info)' : 'var(--warning)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                  {(p.orderId || p.id) && <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'white', background: 'var(--primary)', padding: '1px 6px', borderRadius: 4 }}>{p.orderId || p.id}</span>}
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{fmtDate(p.date)}</span>
                  <span className={`badge ${p.status === 'Completed' ? 'badge-success' : p.status === 'Pending' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 9.5 }}>{p.status}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {(p.totalValue || 0) > 0 ? <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--primary)' }}>{fmtCurrency(p.totalValue)}</div> : <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function Pickups() {
  // FIX: Use kabadiwalas (aliased as partners in AppContext) — both work now
  const { donors, kabadiwalas: partners, pickups, addDonor, createPickup } = useApp()

  const [form,       setForm]       = useState({ ...EMPTY_FORM })
  const [saving,     setSaving]     = useState(false)
  const [errors,     setErrors]     = useState({})
  const [toast,      setToast]      = useState(null)
  const [donorModal, setDonorModal] = useState(false)

  const activeDonors  = useMemo(() => (donors || []).filter(d => d.status !== 'Lost'), [donors])
  const selectedDonor = useMemo(() => activeDonors.find(d => d.id === form.donorId) || null, [activeDonors, form.donorId])
  const selectedKab   = useMemo(() => (partners || []).find(k => k.name === form.kabadiwala) || null, [partners, form.kabadiwala])
  const rateChart     = selectedKab?.rateChart || null

  const rstTotalWeight = useMemo(() =>
    form.rstItems.filter(i => i !== 'Others').reduce((sum, item) => {
      const w = form.rstItemWeights[item] || { value: '', unit: 'kg' }
      return sum + toKg(w.value, w.unit || 'kg')
    }, 0),
    [form.rstItems, form.rstItemWeights]
  )

  const rstOthersWeight = useMemo(() =>
    form.rstOthers.reduce((sum, o) => sum + toKg(o.weight, o.unit || 'kg'), 0),
    [form.rstOthers]
  )

  const rstEstimatedValue = useMemo(() => {
    const rateBasedVal = rateChart
      ? form.rstItems.filter(i => i !== 'Others').reduce((sum, item) => {
          const w  = form.rstItemWeights[item] || { value: '', unit: 'kg' }
          const kg = toKg(w.value, w.unit || 'kg')
          return sum + Math.round(kg * (rateChart[item] ?? 0))
        }, 0)
      : 0
    const othersVal = form.rstOthers.reduce((s, o) => s + (Number(o.amount) || 0), 0)
    return rateBasedVal + othersVal
  }, [form.rstItems, form.rstItemWeights, form.rstOthers, rateChart])

  useEffect(() => {
    if (rstEstimatedValue > 0) {
      setForm(f => ({ ...f, totalValue: String(rstEstimatedValue) }))
    }
  }, [rstEstimatedValue])

  const set = useCallback((key, val) => {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'kabadiwala') {
        const kab = (partners || []).find(k => k.name === val)
        next.kabadiMobile = kab?.mobile || ''
      }
      return next
    })
    setErrors(e => ({ ...e, [key]: '' }))
  }, [partners])

  const toggleRSTItem = useCallback((item) => {
    setForm(f => {
      const isOn = f.rstItems.includes(item)
      let next = isOn ? f.rstItems.filter(i => i !== item) : [...f.rstItems, item]
      const newWeights = {}
      next.filter(i => i !== 'Others').forEach(i => { newWeights[i] = f.rstItemWeights[i] || { value: '', unit: 'kg' } })
      const newOthers = !isOn && item === 'Others'
        ? [...f.rstOthers, { id: nextOtherId(), name: '', weight: '', unit: 'kg', amount: '' }]
        : isOn && item === 'Others' ? [] : f.rstOthers
      return { ...f, rstItems: next, rstItemWeights: newWeights, rstOthers: newOthers }
    })
  }, [])

  const updateRstWeight = useCallback((itemName, data) => {
    setForm(f => ({ ...f, rstItemWeights: { ...f.rstItemWeights, [itemName]: data } }))
  }, [])

  const handleAddDonor = useCallback(async (data) => {
    const newDonor = await addDonor(data)
    setForm(f => ({ ...f, donorId: newDonor.id }))
    setDonorModal(false)
    setToast(`${newDonor.name} added and selected`)
  }, [addDonor])

  const validate = () => {
    const e = {}
    if (!form.donorId) e.donorId = 'Please select a donor'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const donor = activeDonors.find(d => d.id === form.donorId)
      if (!donor) throw new Error('Donor not found')
      const totalValue    = Number(form.totalValue) || 0
      const amountPaid    = Number(form.amountPaid)  || 0
      const finalRST = form.rstItems.map(i => {
        if (i === 'Others') return form.rstOthers.map(o => o.name?.trim() ? `Others (${o.name.trim()})` : 'Others').join(', ') || 'Others'
        return i
      }).filter(Boolean)
      const finalSKS      = form.sksItems.map(i => i === 'Others' && form.sksOtherText?.trim() ? `Others (${form.sksOtherText.trim()})` : i)
      const type          = finalRST.length > 0 && finalSKS.length > 0 ? 'RST+SKS' : finalSKS.length > 0 ? 'SKS' : 'RST'
      const paymentStatus = form.paymentStatus === 'Write Off' ? 'Write Off' : derivePayStatus(totalValue, amountPaid)
      const orderId       = generateOrderId()
      const combinedKg    = rstTotalWeight + rstOthersWeight

      await createPickup({
        orderId, donorId: donor.id, donorName: donor.name,
        mobile: donor.mobile || '', society: donor.society || '',
        sector: donor.sector || '', city: donor.city || '',
        date: todayStr(), pickupMode: form.pickupMode, status: 'Completed', type,
        rstItems: finalRST, sksItems: finalSKS,
        rstItemWeights: form.rstItemWeights, rstOthers: form.rstOthers,
        rstTotalWeight: combinedKg > 0 ? combinedKg.toFixed(3) : '',
        rstWeightUnit: 'kg', totalKg: combinedKg,
        totalValue, amountPaid, paymentStatus,
        kabadiwala: form.kabadiwala || '', kabadiMobile: form.kabadiMobile || '',
        notes: form.notes,
      })
      setForm({ ...EMPTY_FORM })
      setErrors({})
      setToast(`Pickup recorded! Order ID: ${orderId}`)
    } catch (err) {
      console.error('Save error:', err)
      setErrors({ general: 'Failed to save pickup. Please try again.' })
    } finally { setSaving(false) }
  }

  const payStatus = form.paymentStatus === 'Write Off' ? 'Write Off' : derivePayStatus(form.totalValue, form.amountPaid)
  const remaining = Math.max(0, (Number(form.totalValue) || 0) - (Number(form.amountPaid) || 0))
  const formDirty = form.donorId || form.rstItems.length > 0 || form.sksItems.length > 0 || form.totalValue

  return (
    <div className="page-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--secondary-light)', borderRadius: 'var(--radius)', border: '1px solid rgba(27,94,53,0.15)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={18} color="white" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--secondary)' }}>Record a Pickup</div>
          <div style={{ fontSize: 12, color: 'var(--secondary)', opacity: 0.7 }}>
            Field staff use only · Pickup date: <strong>{todayStr()}</strong> (today)
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)', gap: 20, alignItems: 'start' }} className="two-col-form">
        <style>{`@media (max-width: 820px) { .two-col-form { grid-template-columns: 1fr !important; } }`}</style>

        {/* ── LEFT: form ── */}
        <div className="card">
          <div className="card-header">
            <Package size={16} color="var(--primary)" />
            <div className="card-title">Collection Details</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {errors.general && <div className="alert-strip alert-danger"><AlertCircle size={13} />{errors.general}</div>}

            {/* 1. Donor */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Donor <span className="required">*</span></label>
              <DonorSearch donors={activeDonors} selectedId={form.donorId} onSelect={id => { set('donorId', id); setErrors(e => ({ ...e, donorId: '' })) }} onAddNew={() => setDonorModal(true)} />
              {errors.donorId && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {errors.donorId}</div>}
            </div>

            {selectedDonor && (
              <div style={{ padding: '9px 13px', background: 'var(--secondary-light)', borderRadius: 8, fontSize: 12.5, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <MapPin size={13} style={{ flexShrink: 0 }} />
                <span>{[selectedDonor.society, selectedDonor.sector, selectedDonor.city].filter(Boolean).join(', ')}</span>
                {selectedDonor.id && <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--primary)', padding: '1px 7px', borderRadius: 4 }}>{selectedDonor.id}</span>}
              </div>
            )}

            {/* 2. Date + Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Pickup Date <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--info)', marginLeft: 6 }}>🔒 Today only</span></label>
                <input type="date" value={todayStr()} readOnly style={{ background: 'var(--bg)', cursor: 'not-allowed', color: 'var(--text-muted)', fontWeight: 600 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Mode</label>
                <div style={{ display: 'flex', gap: 6, height: 40 }}>
                  {PICKUP_MODES.map(m => (
                    <button key={m} type="button" onClick={() => set('pickupMode', m)} style={{ flex: 1, borderRadius: 8, fontSize: 12.5, cursor: 'pointer', border: `1.5px solid ${form.pickupMode === m ? 'var(--primary)' : 'var(--border)'}`, background: form.pickupMode === m ? 'var(--primary-light)' : 'transparent', color: form.pickupMode === m ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: form.pickupMode === m ? 700 : 400 }}>{m}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Pickup Partner — now with fixed sector matching */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={13} color="var(--secondary)" />
                Assign Pickup Partner
                {selectedDonor?.sector && <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--secondary)', marginLeft: 2 }}>— filtered for {selectedDonor.sector}</span>}
              </label>
              <PartnerSearch
                partners={partners || []}
                donorSector={selectedDonor?.sector || ''}
                value={form.kabadiwala}
                onChange={val => {
                  const kab = (partners || []).find(k => k.name === val)
                  setForm(f => ({ ...f, kabadiwala: val, kabadiMobile: kab?.mobile || '' }))
                }}
              />
              {selectedKab && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '7px 12px', background: 'var(--secondary-light)', borderRadius: 8, fontSize: 12, color: 'var(--secondary)' }}>
                  <Phone size={11} />
                  <span>{selectedKab.mobile}</span>
                  <span style={{ marginLeft: 'auto', background: 'var(--secondary)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Rates loaded · Auto-fill ON</span>
                </div>
              )}
            </div>

            {/* 4. RST Items */}
            <div className="form-group" style={{ margin: 0 }}>
              <SectionLabel badge="RST" badgeClass="badge-success" title="Raddi Se Tarakki — Scrap Items" count={form.rstItems.length} />
              <RSTItemChips items={RST_ITEMS} selected={form.rstItems} weights={form.rstItemWeights} onToggle={toggleRSTItem} onWeight={updateRstWeight} rstOthers={form.rstOthers} onOthersChange={others => setForm(f => ({ ...f, rstOthers: others }))} />
              {rateChart && form.rstItems.length > 0 && (
                <>
                  <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 600, color: 'var(--secondary)' }}>Rate breakdown — {selectedKab?.name}</div>
                  <RateBreakdown rstItems={form.rstItems} rstItemWeights={form.rstItemWeights} rateChart={rateChart} rstOthers={form.rstOthers} />
                </>
              )}
            </div>

            {/* 5. SKS Items */}
            <div className="form-group" style={{ margin: 0 }}>
              <SectionLabel badge="SKS" badgeClass="badge-info" title="Sammaan Ka Saaman — Goods Donated" count={form.sksItems.length} />
              <SKSItemChips items={SKS_ITEMS} selected={form.sksItems} otherText={form.sksOtherText} onChange={items => setForm(f => ({ ...f, sksItems: items, sksOtherText: items.includes('Others') ? f.sksOtherText : '' }))} onOtherText={v => set('sksOtherText', v)} />
            </div>

            {/* 6. Payment */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IndianRupee size={13} color="var(--warning)" /> Payment Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Total Value (₹) {rstEstimatedValue > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--secondary)', marginLeft: 6, background: 'var(--secondary-light)', padding: '1px 6px', borderRadius: 4 }}>Auto-filled ✓</span>}</label>
                  <input type="text" inputMode="numeric" placeholder="0" value={form.totalValue} onChange={e => set('totalValue', e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Amount Paid (₹)</label>
                  <input type="text" inputMode="numeric" placeholder="0" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
              </div>
              <div className="form-group" style={{ margin: '12px 0 0' }}>
                <label>Payment Status</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {PAYMENT_STATUS_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => set('paymentStatus', s)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1.5px solid ${form.paymentStatus === s ? 'var(--primary)' : 'var(--border)'}`, background: form.paymentStatus === s ? 'var(--primary-light)' : 'transparent', color: form.paymentStatus === s ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: form.paymentStatus === s ? 700 : 400 }}>{s}</button>
                  ))}
                </div>
              </div>
              {(form.totalValue || form.amountPaid) && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-light)', display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12.5, alignItems: 'center' }}>
                  <PayStatusBadge status={payStatus} />
                  {remaining > 0 && payStatus !== 'Write Off' && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Due: {fmtCurrency(remaining)}</span>}
                  {payStatus === 'Paid' && <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Fully paid ✓</span>}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Notes <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(optional)</span></label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any observations or remarks…" style={{ minHeight: 62, resize: 'vertical' }} />
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, fontWeight: 700 }}>
              {saving ? <><span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%' }} /> Saving…</> : <><CheckCircle size={16} /> Save Pickup Record</>}
            </button>

            {formDirty && (
              <button type="button" onClick={() => { setForm({ ...EMPTY_FORM }); setErrors({}) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', width: '100%', padding: 4, textDecoration: 'underline' }}>
                Clear form
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <Clock size={15} color="var(--info)" />
              <div className="card-title" style={{ fontSize: 13.5 }}>Quick Guide</div>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8, padding: '12px 16px' }}>
              {[
                ['1.', 'Search or add a donor.'],
                ['2.', 'Pickup date is locked to today.'],
                ['3.', 'Assign a partner — sector-matched partners shown first.'],
                ['4.', 'Tick RST items, fill weights. "Others" supports multiple entries.'],
                ['5.', 'Total Value auto-fills from rates × weights.'],
                ['6.', 'Tick SKS items (checkbox only).'],
                ['7.', 'Set payment details and hit Save.'],
              ].map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{n}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <DonorPickupHistory donor={selectedDonor} pickups={pickups} />
        </div>
      </div>

      {donorModal && <DonorModal onClose={() => setDonorModal(false)} onAdd={handleAddDonor} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}