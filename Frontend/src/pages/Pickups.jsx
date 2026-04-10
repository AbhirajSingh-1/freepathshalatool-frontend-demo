// Frontend/src/pages/Pickups.jsx
// ─── Field Staff: Record Pickup ───────────────────────────────────────────────

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Search, Plus, X, CheckSquare, Square,
  IndianRupee, MapPin, Phone,
  CheckCircle, Truck, Clock,
  AlertCircle, Package, Weight, Hash, UserCheck, ChevronDown,
  History,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import DonorModal from '../components/DonorModal'
import { RST_ITEMS, SKS_ITEMS, PICKUP_MODES } from '../data/mockData'
import { fmtDate, fmtCurrency, generateOrderId, pickupStatusColor, paymentStatusColor } from '../utils/helpers'

const todayStr = () => new Date().toISOString().slice(0, 10)

const SKS_PACKAGING_OPTIONS = [
  { value: 'individual', label: 'Individual items' },
  { value: 'small_bag',  label: 'Small bag' },
  { value: 'large_bag',  label: 'Large bag' },
  { value: 'small_box',  label: 'Small box' },
  { value: 'large_box',  label: 'Large box' },
]

const PAYMENT_STATUS_OPTIONS = ['Paid', 'Not Paid', 'Partially Paid', 'Write Off']

const EMPTY_FORM = {
  donorId:        '',
  date:           todayStr(),
  pickupMode:     'Individual',
  kabadiwala:     '',
  kabadiMobile:   '',
  rstItems:       [],
  rstOtherText:   '',
  rstItemWeights: {},
  sksItems:       [],
  sksItemDetails: {},
  sksOtherText:   '',
  totalValue:     '',
  amountPaid:     '',
  paymentStatus:  'Not Paid',
  notes:          '',
}

function derivePayStatus(total, paid) {
  const t = Number(total) || 0
  const p = Number(paid)  || 0
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
  const [open,  setOpen]  = useState(false)
  const selected = useMemo(() => donors.find(d => d.id === selectedId), [donors, selectedId])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return donors.slice(0, 30)
    return donors.filter(d => d.name.toLowerCase().includes(q) || (d.mobile || '').includes(q))
  }, [donors, query])
  const choose = (d) => { onSelect(d.id); setOpen(false); setQuery('') }
  const clear  = (e) => { e.stopPropagation(); onSelect(''); setQuery('') }
  const handleBlur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }

  return (
    <div style={{ position: 'relative' }} onBlur={handleBlur}>
      <div onClick={() => setOpen(true)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
        border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
        boxShadow: open ? '0 0 0 3px rgba(232,82,26,0.1)' : 'none',
        borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'text', transition: 'all 0.15s',
      }}>
        <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        {selected && !open ? (
          <>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>
              {selected.name}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>{selected.mobile}</span>
            </span>
            <button type="button" onMouseDown={clear} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}>
              <X size={14} />
            </button>
          </>
        ) : (
          <input autoFocus={open} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or mobile…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, padding: 0, color: 'var(--text-primary)' }} />
        )}
      </div>
      {open && (
        <div tabIndex={-1} style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 80,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', maxHeight: 260, overflowY: 'auto',
        }}>
          <button type="button" tabIndex={0} onMouseDown={e => { e.preventDefault(); setOpen(false); onAddNew() }}
            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border-light)', background: 'var(--primary-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
            <Plus size={14} /> Add New Donor
          </button>
          {filtered.length === 0 ? (
            <div style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No donors match "{query}"</div>
          ) : filtered.map(d => (
            <div key={d.id} tabIndex={0} onMouseDown={e => { e.preventDefault(); choose(d) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: d.id === selectedId ? 'var(--primary-light)' : 'transparent' }}
              onMouseEnter={e => { if (d.id !== selectedId) e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = d.id === selectedId ? 'var(--primary-light)' : 'transparent' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                {d.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
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

// ─── Kabadiwala search & select ───────────────────────────────────────────────
function KabadiwalaSearch({ kabadiwalas, value, onChange }) {
  const [query, setQuery]   = useState('')
  const [open,  setOpen]    = useState(false)
  const rootRef             = useRef(null)

  const selected = useMemo(() => kabadiwalas.find(k => k.name === value), [kabadiwalas, value])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return kabadiwalas
    return kabadiwalas.filter(k =>
      k.name.toLowerCase().includes(q) ||
      (k.mobile || '').includes(q) ||
      (k.area || '').toLowerCase().includes(q)
    )
  }, [kabadiwalas, query])

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const choose = (k) => { onChange(k.name); setOpen(false); setQuery('') }
  const clear  = (e) => { e.stopPropagation(); onChange(''); setQuery('') }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
          border: `1.5px solid ${open ? 'var(--secondary)' : selected ? 'var(--secondary)' : 'var(--border)'}`,
          boxShadow: open ? '0 0 0 3px rgba(27,94,53,0.12)' : 'none',
          borderRadius: 'var(--radius-sm)', background: selected ? 'var(--secondary-light)' : 'var(--surface)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <UserCheck size={14} color={selected ? 'var(--secondary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
        {selected ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--secondary)' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: 'var(--secondary)', opacity: 0.7, display: 'flex', gap: 6 }}>
                <span>{selected.mobile}</span>
                {selected.area && <span>· {selected.area}</span>}
              </div>
            </div>
            <button type="button" onClick={clear}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--secondary)', display: 'flex', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: 13.5 }}>
              Search kabadiwala by name, mobile, or area…
            </span>
            <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 80,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type name, mobile or area…"
              style={{ paddingLeft: 28, width: '100%', fontSize: 13, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)' }}
            />
          </div>

          <div
            onMouseDown={() => { onChange(''); setOpen(false); setQuery('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
              borderBottom: '1px solid var(--border-light)', cursor: 'pointer',
              background: !value ? 'var(--bg)' : 'transparent',
              fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = !value ? 'var(--bg)' : 'transparent' }}
          >
            <X size={13} /> None / Unassigned
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No kabadiwalas match "{query}"
              </div>
            ) : filtered.map(k => (
              <div key={k.id} onMouseDown={() => choose(k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderBottom: '1px solid var(--border-light)', cursor: 'pointer',
                  background: k.name === value ? 'var(--secondary-light)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (k.name !== value) e.currentTarget.style.background = 'var(--bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = k.name === value ? 'var(--secondary-light)' : 'transparent' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'var(--secondary-light)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, color: 'var(--secondary)', fontSize: 15,
                }}>
                  {k.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{k.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 1 }}>
                    <span>{k.mobile}</span>
                    {k.area && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {k.area}</span>}
                  </div>
                  {k.rateChart && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                      {Object.entries(k.rateChart).filter(([, v]) => v > 0).slice(0, 4).map(([item, rate]) => (
                        <span key={item} style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 20,
                          background: 'var(--secondary-light)', color: 'var(--secondary)',
                          fontWeight: 600, border: '1px solid rgba(27,94,53,0.15)',
                        }}>
                          {item} ₹{rate}/kg
                        </span>
                      ))}
                      {Object.entries(k.rateChart).filter(([, v]) => v > 0).length > 4 && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '1px 4px' }}>
                          +{Object.entries(k.rateChart).filter(([, v]) => v > 0).length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {k.name === value && <CheckCircle size={14} color="var(--secondary)" style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RST Item Chips ───────────────────────────────────────────────────────────
function RSTItemChips({ items, selected, weights, onToggle, onWeight, otherText, onOtherText }) {
  const fmt = (n) => n % 1 === 0 ? n.toString() : n.toFixed(3)
  const totalWeight = selected.reduce((sum, item) => sum + toKg(weights[item]?.value, weights[item]?.unit || 'kg'), 0)

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
        {items.map(item => {
          const isOn = selected.includes(item)
          return (
            <button key={item} type="button" onClick={() => onToggle(item)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
              border: `1.5px solid ${isOn ? 'var(--primary)' : 'var(--border)'}`,
              background: isOn ? 'var(--primary-light)' : 'transparent',
              color: isOn ? 'var(--primary-dark)' : 'var(--text-secondary)',
              fontWeight: isOn ? 700 : 400, transition: 'all 0.13s', whiteSpace: 'nowrap',
            }}>
              {isOn ? <CheckSquare size={12} style={{ flexShrink: 0 }} /> : <Square size={12} style={{ flexShrink: 0 }} />}
              {item}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div style={{
          marginTop: 12, border: '1.5px solid var(--primary)',
          borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px',
            padding: '7px 14px', background: 'var(--primary-light)',
            fontSize: 10.5, fontWeight: 700, color: 'var(--primary-dark)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Item</span>
            <span style={{ textAlign: 'center' }}>Weight</span>
            <span style={{ textAlign: 'center' }}>Unit</span>
            <span style={{ textAlign: 'right' }}>Remove</span>
          </div>

          {selected.map((item, idx) => {
            const w = weights[item] || { value: '', unit: 'kg' }
            const kg = toKg(w.value, w.unit || 'kg')
            return (
              <div key={item} style={{
                display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px',
                alignItems: 'center', padding: '9px 14px',
                borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none',
                background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item}</span>
                  {kg > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 600, marginLeft: 4 }}>
                      = {fmt(kg)} kg
                    </span>
                  )}
                </div>
                <div>
                  <input type="text" inputMode="decimal" value={w.value || ''}
                    onChange={e => onWeight(item, { ...w, value: e.target.value.replace(/[^0-9.]/g, '') })}
                    placeholder="0"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 13, fontWeight: 700, textAlign: 'right', border: `1.5px solid ${w.value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--surface)', outline: 'none', color: 'var(--text-primary)' }} />
                </div>
                <select value={w.unit || 'kg'} onChange={e => onWeight(item, { ...w, unit: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12, fontWeight: 600, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <option value="kg">kg</option>
                  <option value="gm">gm</option>
                </select>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => onToggle(item)} title={`Remove ${item}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--danger)', background: 'var(--danger-bg)', cursor: 'pointer', color: 'var(--danger)', transition: 'all 0.13s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            )
          })}

          {selected.includes('Others') && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-light)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 }}>Specify "Others":</span>
              <input type="text" value={otherText} onChange={e => onOtherText(e.target.value)} placeholder="e.g. Broken mirror, Mattress…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, padding: 0, color: 'var(--text-primary)' }} />
              {otherText && <button type="button" onClick={() => onOtherText('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}><X size={13} /></button>}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: '1px solid var(--border-light)', background: totalWeight > 0 ? 'var(--secondary-light)' : 'var(--bg)', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Weight size={14} color={totalWeight > 0 ? 'var(--secondary)' : 'var(--text-muted)'} />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>Total RST Weight</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>(auto-calculated)</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: totalWeight > 0 ? 'var(--secondary)' : 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              {totalWeight > 0 ? `${totalWeight % 1 === 0 ? totalWeight : totalWeight.toFixed(3)} kg` : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rate Breakdown ───────────────────────────────────────────────────────────
function RateBreakdown({ rstItems, rstItemWeights, rateChart }) {
  if (!rateChart || rstItems.length === 0) return null
  const rows = rstItems.map(item => {
    const w = rstItemWeights[item] || { value: '', unit: 'kg' }
    const kg = toKg(w.value, w.unit || 'kg')
    const rate = rateChart[item] ?? null
    const amt = rate !== null && kg > 0 ? Math.round(kg * rate) : null
    return { item, kg, rate, amt }
  }).filter(r => r.rate !== null)
  if (rows.length === 0) return null
  const totalKg  = rows.reduce((s, r) => s + r.kg, 0)
  const totalAmt = rows.reduce((s, r) => s + (r.amt || 0), 0)
  return (
    <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(27,94,53,0.25)', background: 'var(--secondary-light)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', padding: '6px 12px', background: 'rgba(27,94,53,0.12)', fontSize: 10.5, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <span>Item</span><span>Kg</span><span>Rate (₹/kg)</span><span>Amount</span>
      </div>
      {rows.map((r, idx) => (
        <div key={r.item} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', padding: '7px 12px', fontSize: 12.5, borderTop: idx > 0 ? '1px solid rgba(27,94,53,0.1)' : 'none' }}>
          <span style={{ fontWeight: 600, color: 'var(--secondary-dark)' }}>{r.item}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{r.kg > 0 ? r.kg.toFixed(3) : '—'}</span>
          <span style={{ color: 'var(--text-muted)' }}>₹{r.rate}</span>
          <span style={{ fontWeight: 700, color: r.amt ? 'var(--secondary)' : 'var(--text-muted)' }}>{r.amt ? `₹${r.amt.toLocaleString('en-IN')}` : '—'}</span>
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

// ─── SKS Item chips ───────────────────────────────────────────────────────────
function ItemChips({ items, selected, otherText, color, colorBg, colorText, onChange, onOtherText }) {
  const toggle = (item) => onChange(selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item])
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => {
          const on = selected.includes(item)
          return (
            <button key={item} type="button" onClick={() => toggle(item)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1.5px solid ${on ? color : 'var(--border)'}`, background: on ? colorBg : 'transparent', color: on ? colorText : 'var(--text-secondary)', fontWeight: on ? 600 : 400, transition: 'all 0.13s' }}>
              {on ? <CheckSquare size={11} /> : <Square size={11} />}{item}
            </button>
          )
        })}
      </div>
      {selected.includes('Others') && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', background: colorBg, border: `1.5px solid ${color}`, borderRadius: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colorText, flexShrink: 0 }}>Specify:</span>
          <input type="text" value={otherText} onChange={e => onOtherText(e.target.value)} placeholder="e.g. Broken mirror, Mattress…" autoFocus style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, padding: 0, color: 'var(--text-primary)' }} />
          {otherText && <button type="button" onClick={() => onOtherText('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}><X size={13} /></button>}
        </div>
      )}
    </div>
  )
}

// ─── SKS details ─────────────────────────────────────────────────────────────
function SKSDetails({ sksItems, sksItemDetails, onChangeDetail }) {
  if (sksItems.length === 0) return null
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)', overflow: 'hidden', marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr', padding: '6px 12px', background: 'var(--info-bg)', fontSize: 10.5, fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <span>Item</span><span>Count</span><span>Packaging</span>
      </div>
      {sksItems.map((item, idx) => {
        const det = sksItemDetails[item] || { quantity: '', packaging: 'individual' }
        return (
          <div key={item} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr', padding: '8px 12px', alignItems: 'center', borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{item}</span>
            <input type="number" min={1} step={1} inputMode="numeric" placeholder="1" value={det.quantity} onChange={e => onChangeDetail(item, { ...det, quantity: e.target.value })} style={{ width: '100%', padding: '5px 8px', fontSize: 13, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }} />
            <select value={det.packaging} onChange={e => onChangeDetail(item, { ...det, packaging: e.target.value })} style={{ marginLeft: 8, padding: '5px 7px', fontSize: 12, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}>
              {SKS_PACKAGING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )
      })}
      <div style={{ padding: '7px 12px', borderTop: '1px solid var(--border-light)', background: 'var(--info-bg)', fontSize: 12, color: 'var(--info)' }}>
        Total items: <strong>{sksItems.reduce((s, item) => s + (Number(sksItemDetails[item]?.quantity) || 0), 0)}</strong>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useState(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) })
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 24, zIndex: 200, background: 'var(--secondary)', color: 'white', padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.25s ease', fontSize: 13.5, fontWeight: 600, pointerEvents: 'none' }}>
      <CheckCircle size={16} /> {msg}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ badge, badgeClass, title, count }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <span className={`badge ${badgeClass}`} style={{ fontSize: 10 }}>{badge}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
      {count > 0 && (
        <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 20, fontSize: 10, padding: '1px 7px', fontWeight: 700 }}>
          {count} selected
        </span>
      )}
    </label>
  )
}

function PayStatusBadge({ status }) {
  const map = { 'Paid': 'badge-success', 'Not Paid': 'badge-danger', 'Partially Paid': 'badge-warning', 'Write Off': 'badge-muted' }
  return <span className={`badge ${map[status] || 'badge-muted'}`} style={{ fontSize: 11 }}>{status}</span>
}

// ─── Donor Pickup History Panel ───────────────────────────────────────────────
function DonorPickupHistory({ donor, pickups }) {
  if (!donor) {
    return (
      <div className="card">
        <div className="card-header">
          <History size={15} color="var(--text-muted)" />
          <div className="card-title" style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Donor Pickup History</div>
        </div>
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Select a donor above to see their pickup history.
        </div>
      </div>
    )
  }

  const history = [...pickups]
    .filter(p => p.donorId === donor.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="card">
      <div className="card-header">
        <History size={15} color="var(--primary)" />
        <div className="card-title" style={{ fontSize: 13.5 }}>
          {donor.name}'s Pickups
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {history.length} record{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Donor quick stats */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--border-light)',
        background: 'var(--secondary-light)',
      }}>
        {[
          { label: 'Total RST', value: fmtCurrency(donor.totalRST || 0), color: 'var(--secondary)' },
          { label: 'SKS Pickups', value: donor.totalSKS || 0, color: 'var(--info)' },
          { label: 'Last Pickup', value: donor.lastPickup ? fmtDate(donor.lastPickup) : '—', color: 'var(--text-primary)' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '8px 4px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(27,94,53,0.15)' : 'none',
          }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: 'var(--secondary)', textTransform: 'uppercase', opacity: 0.7 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {history.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No pickups recorded for this donor yet.
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {history.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
              borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none',
              background: p.status === 'Completed' ? 'transparent' : 'var(--bg)',
            }}>
              {/* Status dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                background: p.status === 'Completed' ? 'var(--secondary)'
                  : p.status === 'Pending' ? 'var(--info)'
                  : p.status === 'Postponed' ? 'var(--warning)'
                  : 'var(--danger)',
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Order ID + date row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                  {(p.orderId || p.id) && (
                    <span style={{
                      fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700,
                      color: 'var(--primary)', background: 'var(--primary-light)',
                      padding: '1px 6px', borderRadius: 4,
                      border: '1px solid rgba(232,82,26,0.2)',
                    }}>
                      <Hash size={9} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                      {p.orderId || p.id}
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {fmtDate(p.date)}
                  </span>
                  <span className={`badge ${p.status === 'Completed' ? 'badge-success' : p.status === 'Pending' ? 'badge-info' : p.status === 'Postponed' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 9.5 }}>
                    {p.status}
                  </span>
                </div>

                {/* Type + items */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {p.type && (
                    <span className={`badge ${p.type === 'RST' ? 'badge-success' : p.type === 'SKS' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 9.5 }}>
                      {p.type}
                    </span>
                  )}
                  {p.pickupMode && (
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{p.pickupMode}</span>
                  )}
                  {p.kabadiwala && (
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>· {p.kabadiwala}</span>
                  )}
                </div>
              </div>

              {/* Amount + payment status */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {p.totalValue > 0 ? (
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--primary)' }}>
                    {fmtCurrency(p.totalValue)}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</div>
                )}
                <span className={`badge ${p.paymentStatus === 'Paid' ? 'badge-success' : p.paymentStatus === 'Partially Paid' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 9 }}>
                  {p.paymentStatus}
                </span>
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
  const { donors, kabadiwalas, pickups, raddiRecords, addDonor, createPickup } = useApp()

  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [errors,     setErrors]     = useState({})
  const [toast,      setToast]      = useState(null)
  const [donorModal, setDonorModal] = useState(false)

  const activeDonors  = useMemo(() => donors.filter(d => d.status !== 'Lost'), [donors])
  const selectedDonor = useMemo(() => activeDonors.find(d => d.id === form.donorId) || null, [activeDonors, form.donorId])
  const selectedKab   = useMemo(() => kabadiwalas.find(k => k.name === form.kabadiwala) || null, [kabadiwalas, form.kabadiwala])
  const rateChart     = selectedKab?.rateChart || null

  const rstTotalWeight = useMemo(() =>
    form.rstItems.reduce((sum, item) => {
      const w = form.rstItemWeights[item] || { value: '', unit: 'kg' }
      return sum + toKg(w.value, w.unit || 'kg')
    }, 0),
    [form.rstItems, form.rstItemWeights]
  )

  const rstEstimatedValue = useMemo(() => {
    if (!rateChart) return 0
    return form.rstItems.reduce((sum, item) => {
      const w = form.rstItemWeights[item] || { value: '', unit: 'kg' }
      const kg = toKg(w.value, w.unit || 'kg')
      return sum + Math.round(kg * (rateChart[item] ?? 0))
    }, 0)
  }, [form.rstItems, form.rstItemWeights, rateChart])

  const set = useCallback((key, val) => {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'kabadiwala') {
        const kab = kabadiwalas.find(k => k.name === val)
        next.kabadiMobile = kab?.mobile || ''
      }
      return next
    })
    setErrors(e => ({ ...e, [key]: '' }))
  }, [kabadiwalas])

  const toggleRSTItem = useCallback((item) => {
    setForm(f => {
      const next = f.rstItems.includes(item)
        ? f.rstItems.filter(i => i !== item)
        : [...f.rstItems, item]
      const newWeights = {}
      next.forEach(i => { newWeights[i] = f.rstItemWeights[i] || { value: '', unit: 'kg' } })
      return { ...f, rstItems: next, rstOtherText: next.includes('Others') ? f.rstOtherText : '', rstItemWeights: newWeights }
    })
  }, [])

  const updateRstWeight = useCallback((itemName, data) => {
    setForm(f => ({ ...f, rstItemWeights: { ...f.rstItemWeights, [itemName]: data } }))
  }, [])

  const setSKS = useCallback((items) =>
    setForm(f => ({ ...f, sksItems: items, sksOtherText: items.includes('Others') ? f.sksOtherText : '' }))
  , [])

  const setSKSDetail = useCallback((item, detail) =>
    setForm(f => ({ ...f, sksItemDetails: { ...f.sksItemDetails, [item]: detail } }))
  , [])

  const handleAddDonor = useCallback(async (data) => {
    const newDonor = await addDonor(data)
    setForm(f => ({ ...f, donorId: newDonor.id }))
    setDonorModal(false)
    setToast(`${newDonor.name} added and selected`)
  }, [addDonor])

  const autoFillValue = () => {
    if (rstEstimatedValue > 0) set('totalValue', String(rstEstimatedValue))
  }

  const validate = () => {
    const e = {}
    if (!form.donorId) e.donorId = 'Please select a donor'
    if (!form.date)    e.date    = 'Pickup date is required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const donor      = activeDonors.find(d => d.id === form.donorId)
      const totalValue = Number(form.totalValue) || 0
      const amountPaid = Number(form.amountPaid)  || 0
      const finalRST   = form.rstItems.map(i => i === 'Others' && form.rstOtherText.trim() ? `Others (${form.rstOtherText.trim()})` : i)
      const finalSKS   = form.sksItems.map(i => i === 'Others' && form.sksOtherText.trim() ? `Others (${form.sksOtherText.trim()})` : i)
      const type       = finalRST.length > 0 && finalSKS.length > 0 ? 'RST+SKS' : finalSKS.length > 0 ? 'SKS' : 'RST'
      const paymentStatus = form.paymentStatus === 'Write Off' ? 'Write Off' : derivePayStatus(totalValue, amountPaid)
      const orderId    = generateOrderId()
      await createPickup({
        orderId, donorId: donor.id, donorName: donor.name,
        mobile: donor.mobile || '', society: donor.society || '',
        sector: donor.sector || '', city: donor.city || '',
        date: form.date, pickupMode: form.pickupMode, status: 'Completed', type,
        rstItems: finalRST, sksItems: finalSKS,
        sksItemDetails: form.sksItemDetails, rstItemWeights: form.rstItemWeights,
        rstTotalWeight: rstTotalWeight > 0 ? rstTotalWeight.toFixed(3) : '',
        rstWeightUnit: 'kg', totalKg: rstTotalWeight,
        totalValue, amountPaid, paymentStatus,
        kabadiwala: form.kabadiwala, kabadiMobile: form.kabadiMobile, notes: form.notes,
      })
      setForm({ ...EMPTY_FORM, date: todayStr() })
      setErrors({})
      setToast(`Pickup recorded! Order ID: ${orderId}`)
    } finally { setSaving(false) }
  }

  const payStatus = form.paymentStatus === 'Write Off' ? 'Write Off' : derivePayStatus(form.totalValue, form.amountPaid)
  const remaining = Math.max(0, (Number(form.totalValue) || 0) - (Number(form.amountPaid) || 0))
  const formDirty = form.donorId || form.rstItems.length > 0 || form.sksItems.length > 0 || form.totalValue

  return (
    <div className="page-body">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--secondary-light)', borderRadius: 'var(--radius)', border: '1px solid rgba(27,94,53,0.15)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={18} color="white" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--secondary)' }}>Record a Pickup</div>
          <div style={{ fontSize: 12, color: 'var(--secondary)', opacity: 0.7 }}>Field staff use only · Records go directly to Raddi Master &amp; Payments</div>
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

            {/* 1. Donor */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>
                Donor <span className="required">*</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>search by name or mobile</span>
              </label>
              <DonorSearch donors={activeDonors} selectedId={form.donorId}
                onSelect={id => { set('donorId', id); setErrors(e => ({ ...e, donorId: '' })) }}
                onAddNew={() => setDonorModal(true)} />
              {errors.donorId && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {errors.donorId}
                </div>
              )}
            </div>

            {selectedDonor && (
              <div style={{ padding: '9px 13px', background: 'var(--secondary-light)', borderRadius: 8, fontSize: 12.5, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <MapPin size={13} style={{ flexShrink: 0 }} />
                <span>{[selectedDonor.society, selectedDonor.sector, selectedDonor.city].filter(Boolean).join(', ')}</span>
                {selectedDonor.id && (
                  <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 10.5, color: 'var(--secondary)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Hash size={9} />{selectedDonor.id}
                  </span>
                )}
                {selectedDonor.mobile && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Phone size={11} /> {selectedDonor.mobile}
                  </span>
                )}
              </div>
            )}

            {/* 2. Date + Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Pickup Date <span className="required">*</span></label>
                <input type="date" value={form.date} max={todayStr()} onChange={e => set('date', e.target.value)} />
                {errors.date && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 3 }}>{errors.date}</div>}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Mode</label>
                <div style={{ display: 'flex', gap: 6, height: 40 }}>
                  {PICKUP_MODES.map(m => (
                    <button key={m} type="button" onClick={() => set('pickupMode', m)} style={{ flex: 1, borderRadius: 8, fontSize: 12.5, cursor: 'pointer', border: `1.5px solid ${form.pickupMode === m ? 'var(--primary)' : 'var(--border)'}`, background: form.pickupMode === m ? 'var(--primary-light)' : 'transparent', color: form.pickupMode === m ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: form.pickupMode === m ? 700 : 400 }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Kabadiwala */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={13} color="var(--secondary)" />
                Assign Kabadiwala
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>(select first to get rate auto-fill)</span>
              </label>
              <KabadiwalaSearch
                kabadiwalas={kabadiwalas}
                value={form.kabadiwala}
                onChange={val => {
                  const kab = kabadiwalas.find(k => k.name === val)
                  setForm(f => ({ ...f, kabadiwala: val, kabadiMobile: kab?.mobile || '' }))
                }}
              />
              {selectedKab && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '7px 12px', background: 'var(--secondary-light)', borderRadius: 8, fontSize: 12, color: 'var(--secondary)' }}>
                  <Phone size={11} />
                  <span>{selectedKab.mobile}</span>
                  {selectedKab.area && <><span style={{ color: 'rgba(27,94,53,0.4)' }}>·</span><span>{selectedKab.area}</span></>}
                  <span style={{ marginLeft: 'auto', background: 'var(--secondary)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    Rates loaded
                  </span>
                </div>
              )}
            </div>

            {/* 4. RST Items */}
            <div className="form-group" style={{ margin: 0 }}>
              <SectionLabel badge="RST" badgeClass="badge-success" title="Raddi Se Tarakki — Scrap Items" count={form.rstItems.length} />
              <RSTItemChips
                items={RST_ITEMS} selected={form.rstItems} weights={form.rstItemWeights}
                onToggle={toggleRSTItem} onWeight={updateRstWeight}
                otherText={form.rstOtherText} onOtherText={v => set('rstOtherText', v)}
              />
              {rateChart && form.rstItems.length > 0 && (
                <>
                  <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Rate breakdown — {selectedKab?.name}</span>
                    {rstEstimatedValue > 0 && (
                      <button type="button" onClick={autoFillValue} style={{ background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Auto-fill ₹{rstEstimatedValue.toLocaleString('en-IN')}
                      </button>
                    )}
                  </div>
                  <RateBreakdown rstItems={form.rstItems} rstItemWeights={form.rstItemWeights} rateChart={rateChart} />
                </>
              )}
              {!form.kabadiwala && form.rstItems.length > 0 && (
                <div style={{ marginTop: 8, padding: '7px 12px', background: 'var(--warning-bg)', borderRadius: 8, fontSize: 12, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={12} />
                  Assign a kabadiwala above to see rate breakdown and auto-fill total value.
                </div>
              )}
            </div>

            {/* 5. SKS Items */}
            <div className="form-group" style={{ margin: 0 }}>
              <SectionLabel badge="SKS" badgeClass="badge-info" title="Sammaan Ka Saaman — Goods Donated" count={form.sksItems.length} />
              <ItemChips items={SKS_ITEMS} selected={form.sksItems} otherText={form.sksOtherText}
                color="var(--info)" colorBg="var(--info-bg)" colorText="var(--info)"
                onChange={setSKS} onOtherText={v => set('sksOtherText', v)} />
              <SKSDetails sksItems={form.sksItems} sksItemDetails={form.sksItemDetails} onChangeDetail={setSKSDetail} />
            </div>

            {/* 6. Payment */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IndianRupee size={13} color="var(--warning)" /> Payment Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Total Value (₹) <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>Kab → FP</span></label>
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
                    <button key={s} type="button" onClick={() => set('paymentStatus', s)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1.5px solid ${form.paymentStatus === s ? 'var(--primary)' : 'var(--border)'}`, background: form.paymentStatus === s ? 'var(--primary-light)' : 'transparent', color: form.paymentStatus === s ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: form.paymentStatus === s ? 700 : 400 }}>
                      {s}
                    </button>
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

            {/* Save */}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, fontWeight: 700 }}>
              {saving ? (
                <><span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%' }} /> Saving…</>
              ) : (
                <><CheckCircle size={16} /> Save Pickup Record</>
              )}
            </button>

            {formDirty && (
              <button type="button" onClick={() => { setForm({ ...EMPTY_FORM, date: todayStr() }); setErrors({}) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', width: '100%', padding: 4, textDecoration: 'underline' }}>
                Clear form
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: guide + donor history ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <Clock size={15} color="var(--info)" />
              <div className="card-title" style={{ fontSize: 13.5 }}>Quick Guide</div>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8, padding: '12px 16px' }}>
              {[
                ['1.', 'Search or add a donor.'],
                ['2.', 'Set the pickup date and mode.'],
                ['3.', 'Assign a kabadiwala — rates load automatically.'],
                ['4.', 'Tick RST items — a weight list appears below.'],
                ['5.', 'Click "Auto-fill" to copy estimated total value.'],
                ['6.', 'Tick SKS items and fill quantity / packaging.'],
                ['7.', 'Set payment and hit Save.'],
              ].map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{n}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Donor Pickup History (replaces Recent Recordings) ── */}
          <DonorPickupHistory donor={selectedDonor} pickups={pickups} />
        </div>
      </div>

      {donorModal && <DonorModal onClose={() => setDonorModal(false)} onAdd={handleAddDonor} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}