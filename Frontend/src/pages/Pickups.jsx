// Frontend/src/pages/Pickups.jsx
// ─── Field Staff: Record Pickup ───────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react'
import {
  Search, Plus, X, CheckSquare, Square,
  IndianRupee, MapPin, Phone,
  CheckCircle, Truck, Clock, ChevronDown,
  AlertCircle, Package, Weight,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import DonorModal  from '../components/DonorModal'
import { RST_ITEMS, SKS_ITEMS, PICKUP_MODES } from '../data/mockData'
import { fmtDate, fmtCurrency } from '../utils/helpers'

// ─── constants ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10)

const SKS_PACKAGING_OPTIONS = [
  { value: 'individual', label: 'Individual items' },
  { value: 'small_bag',  label: 'Small bag'        },
  { value: 'large_bag',  label: 'Large bag'        },
  { value: 'small_box',  label: 'Small box'        },
  { value: 'large_box',  label: 'Large box'        },
]

const EMPTY_FORM = {
  donorId:        '',
  date:           today(),
  pickupMode:     'Individual',
  // RST — per-item weights replace the single rstWeight field
// RST
  rstItems:        [],
  rstOtherText:    '',
  rstItemWeights:  {},    // { itemName: { value: '', unit: 'kg' } }   // free-text when "Others" is selected in RST chips
  // SKS
  sksItems:       [],
  sksItemDetails: {},      // { [itemName]: { quantity, packaging } }
  sksOtherText:   '',      // free-text when "Others" is selected in SKS chips
  // Payment
  totalValue:     '',
  amountPaid:     '',
  // Kabadiwala
  kabadiwala:     '',
  kabadiMobile:   '',
  notes:          '',
}

function derivePayStatus(total, paid) {
  const t = Number(total) || 0
  const p = Number(paid)  || 0
  if (t === 0)  return 'Not Paid'
  if (p >= t)   return 'Paid'
  if (p > 0)    return 'Partially Paid'
  return 'Not Paid'
}

// ─── Donor search dropdown ────────────────────────────────────────────────────
function DonorSearch({ donors, selectedId, onSelect, onAddNew }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)

  const selected = useMemo(() => donors.find(d => d.id === selectedId), [donors, selectedId])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return donors.slice(0, 30)
    return donors.filter(d =>
      d.name.toLowerCase().includes(q) || (d.mobile || '').includes(q)
    )
  }, [donors, query])

  const choose = (d) => { onSelect(d.id); setOpen(false); setQuery('') }
  const clear  = (e) => { e.stopPropagation(); onSelect(''); setQuery('') }
  const handleBlur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }

  return (
    <div style={{ position: 'relative' }} onBlur={handleBlur}>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px',
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
          boxShadow: open ? '0 0 0 3px rgba(232,82,26,0.1)' : 'none',
          borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
          cursor: 'text', transition: 'all 0.15s',
        }}
      >
        <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        {selected && !open ? (
          <>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>
              {selected.name}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
                {selected.mobile}
              </span>
            </span>
            <button type="button" onMouseDown={clear}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}>
              <X size={14} />
            </button>
          </>
        ) : (
          <input
            autoFocus={open}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or mobile…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, padding: 0, color: 'var(--text-primary)' }}
          />
        )}
      </div>

      {open && (
        <div tabIndex={-1} style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 80,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          <button type="button" tabIndex={0}
            onMouseDown={e => { e.preventDefault(); setOpen(false); onAddNew() }}
            style={{
              width: '100%', padding: '10px 14px', textAlign: 'left',
              border: 'none', borderBottom: '1px solid var(--border-light)',
              background: 'var(--primary-light)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 700, color: 'var(--primary)',
            }}>
            <Plus size={14} /> Add New Donor
          </button>
          {filtered.length === 0 ? (
            <div style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              No donors match "{query}"
            </div>
          ) : filtered.map(d => (
            <div key={d.id} tabIndex={0}
              onMouseDown={e => { e.preventDefault(); choose(d) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', borderBottom: '1px solid var(--border-light)',
                cursor: 'pointer',
                background: d.id === selectedId ? 'var(--primary-light)' : 'transparent',
              }}
              onMouseEnter={e => { if (d.id !== selectedId) e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = d.id === selectedId ? 'var(--primary-light)' : 'transparent' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'var(--primary-light)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14,
              }}>
                {d.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {d.name}
                  {d.id === selectedId && <CheckCircle size={12} color="var(--primary)" />}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  <span>{d.mobile}</span>
                  {d.society && <span>· {d.society}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── RST Item chips with per-item weight inputs ───────────────────────────────
function RSTItemChips({ items, selected, weights, onToggle, onWeight, otherText, onOtherText }) {
  const color     = 'var(--primary)'
  const colorBg   = 'var(--primary-light)'
  const colorText = 'var(--primary-dark)'

  const totalWeight = selected.reduce((sum, item) => {
    return sum + (parseFloat(weights[item]) || 0)
  }, 0)

  const fmt = (n) => n % 1 === 0 ? n.toString() : n.toFixed(2)

  return (
    <div>
      {/* Chips grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
        {items.map(item => {
          const isOn = selected.includes(item)
          return (
            <div key={item} style={{ display: 'flex', alignItems: 'stretch', marginBottom: 2 }}>
              {/* Item chip button */}
              <button
                type="button"
                onClick={() => onToggle(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px',
                  borderRadius: isOn ? '20px 0 0 20px' : 20,
                  fontSize: 12, cursor: 'pointer',
                  border: `1.5px solid ${isOn ? color : 'var(--border)'}`,
                  borderRight: isOn ? 'none' : `1.5px solid ${isOn ? color : 'var(--border)'}`,
                  background: isOn ? colorBg : 'transparent',
                  color: isOn ? colorText : 'var(--text-secondary)',
                  fontWeight: isOn ? 700 : 400,
                  transition: 'all 0.13s',
                  whiteSpace: 'nowrap',
                }}
              >
                {isOn ? <CheckSquare size={11} /> : <Square size={11} />}
                {item}
              </button>

              {/* Weight input — only when selected */}
              {isOn && (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px 5px 8px',
    borderRadius: '0 20px 20px 0',
    border: `1.5px solid ${color}`,
    borderLeft: 'none',
    background: colorBg,
  }}>
    
    {/* LEFT INPUT */}
    <input
      type="text"
      inputMode="decimal"
      value={weights[item]?.value || ''}
      onChange={e =>
        onWeight(item, {
          ...weights[item],
          value: e.target.value.replace(/[^0-9.]/g, '')
        })
      }
      placeholder="0"
      style={{
        width: 40,
        border: 'none',
        background: 'transparent',
        fontSize: 12,
        fontWeight: 700,
        outline: 'none',
        textAlign: 'right',
      }}
    />

    {/* RIGHT DROPDOWN */}
    <select
      value={weights[item]?.unit || 'kg'}
      onChange={e =>
        onWeight(item, {
          ...weights[item],
          unit: e.target.value
        })
      }
      style={{
        fontSize: 11,
        border: 'none',
        background: 'transparent',
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      <option value="kg">kg</option>
      <option value="gm">gm</option>
    </select>
  </div>
)}
            </div>
          )
        })}
      </div>

      {/* "Others" free-text */}
      {selected.includes('Others') && (
        <div style={{
          marginTop: 10,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 13px',
          background: colorBg,
          border: `1.5px solid ${color}`,
          borderRadius: 8,
          animation: 'expandIn 0.18s ease',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colorText, flexShrink: 0, whiteSpace: 'nowrap' }}>
            Specify:
          </span>
          <input
            type="text"
            value={otherText}
            onChange={e => onOtherText(e.target.value)}
            placeholder="e.g. Broken mirror, Mattress, Old lamp…"
            autoFocus
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 13,
              padding: 0, color: 'var(--text-primary)',
            }}
          />
          {otherText && (
            <button type="button" onClick={() => onOtherText('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Auto-calculated total */}
      {selected.length > 0 && (
        <div style={{
          marginTop: 10, padding: '8px 14px',
          background: totalWeight > 0 ? 'var(--secondary-light)' : 'var(--bg)',
          borderRadius: 8,
          border: `1px solid ${totalWeight > 0 ? 'rgba(27,94,53,0.2)' : 'var(--border-light)'}`,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, transition: 'all 0.2s',
        }}>
          <Weight size={14} color={totalWeight > 0 ? 'var(--secondary)' : 'var(--text-muted)'} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total RST Weight:</span>
          <span style={{
            fontWeight: 800, fontSize: 15,
            color: totalWeight > 0 ? 'var(--secondary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)',
          }}>
            {totalWeight > 0 ? `${fmt(totalWeight)} kg` : '—'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>
            (auto-calculated)
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Item chip selector (SKS only) ───────────────────────────────────────────
function ItemChips({ items, selected, otherText, color, colorBg, colorText, onChange, onOtherText }) {
  const toggle = (item) => onChange(
    selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item]
  )
  const othersOn = selected.includes('Others')

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => {
          const on = selected.includes(item)
          return (
            <button key={item} type="button" onClick={() => toggle(item)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `1.5px solid ${on ? color : 'var(--border)'}`,
              background: on ? colorBg : 'transparent',
              color: on ? colorText : 'var(--text-secondary)',
              fontWeight: on ? 600 : 400, transition: 'all 0.13s',
            }}>
              {on ? <CheckSquare size={11} /> : <Square size={11} />}
              {item}
            </button>
          )
        })}
      </div>

      {othersOn && (
        <div style={{
          marginTop: 10,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 13px',
          background: colorBg,
          border: `1.5px solid ${color}`,
          borderRadius: 8,
          animation: 'expandIn 0.18s ease',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colorText, flexShrink: 0, whiteSpace: 'nowrap' }}>
            Specify:
          </span>
          <input
            type="text"
            value={otherText}
            onChange={e => onOtherText(e.target.value)}
            placeholder="e.g. Broken mirror, Mattress, Old lamp…"
            autoFocus
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 13,
              padding: 0, color: 'var(--text-primary)',
            }}
          />
          {otherText && (
            <button type="button" onClick={() => onOtherText('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SKS quantity + packaging table ──────────────────────────────────────────
function SKSDetails({ sksItems, sksItemDetails, onChangeDetail }) {
  if (sksItems.length === 0) return null
  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 10,
      border: '1px solid var(--border-light)', overflow: 'hidden', marginTop: 10,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 70px 1fr',
        padding: '6px 12px', background: 'var(--info-bg)',
        fontSize: 10.5, fontWeight: 700, color: 'var(--info)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <span>Item</span><span>Count</span><span>Packaging</span>
      </div>
      {sksItems.map((item, idx) => {
        const det = sksItemDetails[item] || { quantity: '', packaging: 'individual' }
        return (
          <div key={item} style={{
            display: 'grid', gridTemplateColumns: '1fr 70px 1fr',
            padding: '8px 12px', alignItems: 'center',
            borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{item}</span>
            <input
              type="number" min={1} step={1} inputMode="numeric"
              placeholder="1" value={det.quantity}
              onChange={e => onChangeDetail(item, { ...det, quantity: e.target.value })}
              style={{ width: '100%', padding: '5px 8px', fontSize: 13, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}
            />
            <select
              value={det.packaging}
              onChange={e => onChangeDetail(item, { ...det, packaging: e.target.value })}
              style={{ marginLeft: 8, padding: '5px 7px', fontSize: 12, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}
            >
              {SKS_PACKAGING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )
      })}
      <div style={{ padding: '7px 12px', borderTop: '1px solid var(--border-light)', background: 'var(--info-bg)', fontSize: 12, color: 'var(--info)' }}>
        Total items: <strong>
          {sksItems.reduce((s, item) => s + (Number(sksItemDetails[item]?.quantity) || 0), 0)}
        </strong>
      </div>
    </div>
  )
}

// ─── RST per-item weight + rate display ──────────────────────────────────────
function RSTWeightInputs({ rstItems, rstItemWeights, rateChart, onChangeWeight }) {
  if (rstItems.length === 0) return null

  const toKg = (val, unit) => {
    const n = parseFloat(val) || 0
    return unit === 'gm' ? n / 1000 : n
  }

  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 10,
      border: '1px solid var(--border-light)', overflow: 'hidden', marginTop: 10,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: rateChart ? '1fr 90px 60px 70px 70px' : '1fr 90px 60px',
        padding: '6px 12px', background: 'var(--primary-light)',
        fontSize: 10.5, fontWeight: 700, color: 'var(--primary)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <span>Item</span>
        <span>Weight</span>
        <span>Unit</span>
        {rateChart && <><span>Rate (₹/kg)</span><span>Amount</span></>}
      </div>

      {rstItems.map((item, idx) => {
        const det  = rstItemWeights[item] || { value: '', unit: 'kg' }
        const rate = rateChart?.[item] ?? null
        const kg   = toKg(det.value, det.unit)
        const amt  = rate !== null ? Math.round(kg * rate) : null

        return (
          <div key={item} style={{
            display: 'grid',
            gridTemplateColumns: rateChart ? '1fr 90px 60px 70px 70px' : '1fr 90px 60px',
            padding: '8px 12px', alignItems: 'center',
            borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none',
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{item}</span>
            <input
              type="text" inputMode="decimal" placeholder="0"
              value={det.value}
              onChange={e => onChangeWeight(item, { ...det, value: e.target.value.replace(/[^0-9.]/g, '') })}
              style={{ padding: '5px 8px', fontSize: 13, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)', width: '100%' }}
            />
            <select
              value={det.unit}
              onChange={e => onChangeWeight(item, { ...det, unit: e.target.value })}
              style={{ marginLeft: 6, padding: '5px 4px', fontSize: 12, border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}
            >
              <option value="kg">kg</option>
              <option value="gm">gm</option>
            </select>
            {rateChart && (
              <>
                <span style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)', paddingLeft: 8 }}>
                  {rate !== null ? `₹${rate}` : '—'}
                </span>
                <span style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: amt ? 'var(--secondary)' : 'var(--text-muted)', paddingLeft: 8 }}>
                  {amt ? `₹${amt}` : '—'}
                </span>
              </>
            )}
          </div>
        )
      })}

      {/* Totals row */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--border-light)',
        background: 'var(--primary-light)',
        display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12.5,
      }}>
        {(() => {
          const totalKg = rstItems.reduce((s, item) => {
            const det = rstItemWeights[item] || { value: '', unit: 'kg' }
            const n   = parseFloat(det.value) || 0
            return s + (det.unit === 'gm' ? n / 1000 : n)
          }, 0)
          const totalAmt = rateChart
            ? rstItems.reduce((s, item) => {
                const det  = rstItemWeights[item] || { value: '', unit: 'kg' }
                const kg   = (parseFloat(det.value) || 0) / (det.unit === 'gm' ? 1000 : 1)
                const rate = rateChart?.[item] ?? 0
                return s + kg * rate
              }, 0)
            : null
          return (
            <>
              <span>Total: <strong>{totalKg.toFixed(3)} kg</strong></span>
              {totalAmt !== null && (
                <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                  Est. Value: ₹{Math.round(totalAmt)}
                </span>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useState(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) })
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 24, zIndex: 200,
      background: 'var(--secondary)', color: 'white',
      padding: '12px 20px', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.25s ease',
      fontSize: 13.5, fontWeight: 600, pointerEvents: 'none',
    }}>
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
        <span style={{
          background: 'var(--primary)', color: 'white',
          borderRadius: 20, fontSize: 10, padding: '1px 7px', fontWeight: 700,
        }}>
          {count} selected
        </span>
      )}
    </label>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function Pickups() {
  const { donors, kabadiwalas, raddiRecords, addDonor, createPickup } = useApp()

  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [errors,     setErrors]     = useState({})
  const [toast,      setToast]      = useState(null)
  const [donorModal, setDonorModal] = useState(false)

  const activeDonors  = useMemo(() => donors.filter(d => d.status !== 'Lost'), [donors])
  const selectedDonor = useMemo(() => activeDonors.find(d => d.id === form.donorId) || null, [activeDonors, form.donorId])
  const selectedKabadiwala = useMemo(
    () => kabadiwalas.find(k => k.name === form.kabadiwala) || null,
    [kabadiwalas, form.kabadiwala]
  )
  const rateChart = selectedKabadiwala?.rateChart || null
  
  const recentRecords = useMemo(
    () => [...raddiRecords].sort((a, b) => (b.pickupDate || '').localeCompare(a.pickupDate || '')).slice(0, 15),
    [raddiRecords]
  )

  // ── Auto-calculated RST total weight ────────────────────────────────────────
  const rstTotalWeight = useMemo(() => {
    return form.rstItems.reduce((sum, item) => {
      return sum + (parseFloat(form.rstItemWeights[item]) || 0)
    }, 0)
  }, [form.rstItems, form.rstItemWeights])

  // ── Field setter ────────────────────────────────────────────────────────────
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

  // RST items toggle — also cleans up rstItemWeights for deselected items
const setRST = useCallback((items) =>
    setForm(f => {
      const newWeights = {}
      items.forEach(i => { newWeights[i] = f.rstItemWeights[i] || { value: '', unit: 'kg' } })
      return {
        ...f, rstItems: items,
        rstOtherText:   items.includes('Others') ? f.rstOtherText : '',
        rstItemWeights: newWeights,
      }
    })
  , [])

  // Per-item weight update
 const updateRstWeight = useCallback((itemName, data) => {
  setForm(f => ({
    ...f,
    rstItemWeights: {
      ...f.rstItemWeights,
      [itemName]: data
    }
  }))
}, [])

  // SKS items — clear sksOtherText if "Others" deselected
  const setSKS = useCallback((items) =>
    setForm(f => ({
      ...f, sksItems: items,
      sksOtherText: items.includes('Others') ? f.sksOtherText : '',
    }))
  , [])

  const setSKSDetail = useCallback((item, detail) =>
    setForm(f => ({ ...f, sksItemDetails: { ...f.sksItemDetails, [item]: detail } }))
  , [])

  const setRSTWeight = useCallback((item, detail) =>
    setForm(f => ({ ...f, rstItemWeights: { ...f.rstItemWeights, [item]: detail } }))
  , [])

  // ── Add new donor ───────────────────────────────────────────────────────────
  const handleAddDonor = useCallback(async (data) => {
    const newDonor = await addDonor(data)
    setForm(f => ({ ...f, donorId: newDonor.id }))
    setDonorModal(false)
    setToast(`${newDonor.name} added and selected`)
  }, [addDonor])

  // ── Validate ────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.donorId) e.donorId = 'Please select a donor'
    if (!form.date)    e.date    = 'Pickup date is required'
    return e
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const donor      = activeDonors.find(d => d.id === form.donorId)
      const totalValue = Number(form.totalValue) || 0
      const amountPaid = Number(form.amountPaid)  || 0

      // Expand "Others" chip → descriptive label if user typed something
      const finalRST = form.rstItems.map(i =>
        i === 'Others' && form.rstOtherText.trim()
          ? `Others (${form.rstOtherText.trim()})` : i
      )
      const finalSKS = form.sksItems.map(i =>
        i === 'Others' && form.sksOtherText.trim()
          ? `Others (${form.sksOtherText.trim()})` : i
      )

      const type =
        finalRST.length > 0 && finalSKS.length > 0 ? 'RST+SKS'
        : finalSKS.length > 0                       ? 'SKS'
        : 'RST'

      await createPickup({
        donorId:        donor.id,
        donorName:      donor.name,
        mobile:         donor.mobile   || '',
        society:        donor.society  || '',
        sector:         donor.sector   || '',
        city:           donor.city     || '',
        date:           form.date,
        pickupMode:     form.pickupMode,
        status:         'Completed',
        type,
        rstItems:       finalRST,
        sksItems:       finalSKS,
        sksItemDetails: form.sksItemDetails,
        // Per-item weights stored for auditability
        rstItemWeights: form.rstItemWeights,
        rstTotalWeight: rstTotalWeight > 0 ? rstTotalWeight.toString() : '',
        rstWeightUnit:  'kg',
        totalKg:        rstTotalWeight,
        totalValue,
        amountPaid,
        paymentStatus:  derivePayStatus(totalValue, amountPaid),
        kabadiwala:     form.kabadiwala,
        kabadiMobile:   form.kabadiMobile,
        notes:          form.notes,
      })

      setForm({ ...EMPTY_FORM, date: today() })
      setErrors({})
      setToast('Pickup recorded successfully!')
    } finally {
      setSaving(false)
    }
  }

  // ── Payment preview ─────────────────────────────────────────────────────────
  const payStatus = derivePayStatus(form.totalValue, form.amountPaid)
  const remaining = Math.max(0, (Number(form.totalValue) || 0) - (Number(form.amountPaid) || 0))
  const formDirty = form.donorId || form.rstItems.length > 0 || form.sksItems.length > 0 || form.totalValue

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-body">

      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        padding: '12px 16px', background: 'var(--secondary-light)',
        borderRadius: 'var(--radius)', border: '1px solid rgba(27,94,53,0.15)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Truck size={18} color="white" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--secondary)' }}>
            Record a Pickup
          </div>
          <div style={{ fontSize: 12, color: 'var(--secondary)', opacity: 0.7 }}>
            Field staff use only · Records go directly to Raddi Master &amp; Payments
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)', gap: 20, alignItems: 'start' }}
        className="two-col-form">
        <style>{`
          @media (max-width: 820px) { .two-col-form { grid-template-columns: 1fr !important; } }
          @keyframes expandIn {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* ── LEFT: form ── */}
        <div className="card">
          <div className="card-header">
            <Package size={16} color="var(--primary)" />
            <div className="card-title">Collection Details</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Donor */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>
                Donor <span className="required">*</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                  search by name or mobile
                </span>
              </label>
              <DonorSearch
                donors={activeDonors}
                selectedId={form.donorId}
                onSelect={id => { set('donorId', id); setErrors(e => ({ ...e, donorId: '' })) }}
                onAddNew={() => setDonorModal(true)}
              />
              {errors.donorId && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {errors.donorId}
                </div>
              )}
            </div>

            {/* Donor location */}
            {selectedDonor && (
              <div style={{
                padding: '9px 13px', background: 'var(--secondary-light)',
                borderRadius: 8, fontSize: 12.5, color: 'var(--secondary)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <MapPin size={13} style={{ flexShrink: 0 }} />
                {[selectedDonor.society, selectedDonor.sector, selectedDonor.city].filter(Boolean).join(', ')}
                {selectedDonor.mobile && (
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Phone size={11} /> {selectedDonor.mobile}
                  </span>
                )}
              </div>
            )}

            {/* Date + Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Pickup Date <span className="required">*</span></label>
                <input type="date" value={form.date} max={today()} onChange={e => set('date', e.target.value)} />
                {errors.date && (
                  <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 3 }}>{errors.date}</div>
                )}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Mode</label>
                <div style={{ display: 'flex', gap: 6, height: 40 }}>
                  {PICKUP_MODES.map(m => (
                    <button key={m} type="button" onClick={() => set('pickupMode', m)} style={{
                      flex: 1, borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                      border: `1.5px solid ${form.pickupMode === m ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.pickupMode === m ? 'var(--primary-light)' : 'transparent',
                      color: form.pickupMode === m ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: form.pickupMode === m ? 700 : 400,
                    }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RST Items with per-item weights ── */}
            <div className="form-group" style={{ margin: 0 }}>
              <SectionLabel
                badge="RST" badgeClass="badge-success"
                title="Raddi Se Tarakki — Scrap Items"
                count={form.rstItems.length}
              />
              <RSTItemChips
                items={RST_ITEMS}
                selected={form.rstItems}
                weights={form.rstItemWeights}
                onToggle={(item) => setRST(
                  form.rstItems.includes(item)
                    ? form.rstItems.filter(i => i !== item)
                    : [...form.rstItems, item]
                )}
                onWeight={updateRstWeight}
                otherText={form.rstOtherText}
                onOtherText={v => set('rstOtherText', v)}
              />
            </div>

            {/* ── SKS Items ── */}
            <div className="form-group" style={{ margin: 0 }}>
              <SectionLabel
                badge="SKS" badgeClass="badge-info"
                title="Sammaan Ka Saaman — Goods Donated"
                count={form.sksItems.length}
              />
              <ItemChips
                items={SKS_ITEMS}
                selected={form.sksItems}
                otherText={form.sksOtherText}
                color="var(--info)"
                colorBg="var(--info-bg)"
                colorText="var(--info)"
                onChange={setSKS}
                onOtherText={v => set('sksOtherText', v)}
              />
              {/* Quantity + packaging detail table */}
              <SKSDetails
                sksItems={form.sksItems}
                sksItemDetails={form.sksItemDetails}
                onChangeDetail={setSKSDetail}
              />
            </div>

            {/* ── Payment ── */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border-light)' }}>
              <div style={{
                fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <IndianRupee size={13} color="var(--warning)" /> Payment Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>
                    Total Value (₹)
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>Kab → FP</span>
                  </label>
                  <input type="text" inputMode="numeric" placeholder="0" value={form.totalValue}
                    onChange={e => set('totalValue', e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Amount Paid (₹)</label>
                  <input type="text" inputMode="numeric" placeholder="0" value={form.amountPaid}
                    onChange={e => set('amountPaid', e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
              </div>

              {(form.totalValue || form.amountPaid) && (
                <div style={{
                  marginTop: 10, padding: '8px 12px',
                  background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-light)',
                  display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, alignItems: 'center',
                }}>
                  <span className={`badge ${
                    payStatus === 'Paid' ? 'badge-success'
                    : payStatus === 'Partially Paid' ? 'badge-warning'
                    : 'badge-danger'
                  }`} style={{ fontSize: 11 }}>
                    {payStatus}
                  </span>
                  {remaining > 0 && (
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Due: {fmtCurrency(remaining)}</span>
                  )}
                  {payStatus === 'Paid' && (
                    <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Fully paid ✓</span>
                  )}
                </div>
              )}
            </div>

            {/* ── Kabadiwala ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Kabadiwala</label>
                <select value={form.kabadiwala} onChange={e => set('kabadiwala', e.target.value)}>
                  <option value="">None / Unassigned</option>
                  {kabadiwalas.map(k => <option key={k.id} value={k.name}>{k.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Kabadiwala Mobile</label>
                <input type="text" inputMode="numeric" placeholder="Auto-filled"
                  value={form.kabadiMobile}
                  onChange={e => set('kabadiMobile', e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>
                Notes
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(optional)</span>
              </label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any observations or remarks…" style={{ minHeight: 62, resize: 'vertical' }} />
            </div>

            {/* Save */}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, fontWeight: 700 }}>
              {saving ? (
                <>
                  <span className="spin" style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: 'white', borderRadius: '50%',
                  }} />
                  Saving…
                </>
              ) : (
                <><CheckCircle size={16} /> Save Pickup Record</>
              )}
            </button>

            {/* Clear */}
            {formDirty && (
              <button type="button"
                onClick={() => { setForm({ ...EMPTY_FORM, date: today() }); setErrors({}) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12.5, color: 'var(--text-muted)',
                  textAlign: 'center', width: '100%', padding: 4, textDecoration: 'underline',
                }}>
                Clear form
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: guide + recent ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="card">
            <div className="card-header">
              <Clock size={15} color="var(--info)" />
              <div className="card-title" style={{ fontSize: 13.5 }}>Quick Guide</div>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8, padding: '12px 16px' }}>
              {[
                ['1.', 'Search for the donor by name or mobile.'],
                ['2.', 'Not found? Click + Add New Donor.'],
                ['3.', 'Tick RST chips — a weight field appears inline for each.'],
                ['4.', 'Enter kg per item; total auto-calculates below.'],
                ['5.', 'Tick SKS chips for goods and fill quantity/packaging.'],
                ['6.', 'Enter value and payment received.'],
                ['7.', 'Select the kabadiwala, then hit Save.'],
              ].map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{n}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Truck size={15} color="var(--secondary)" />
              <div className="card-title" style={{ fontSize: 13.5 }}>Recent Recordings</div>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                Last {Math.min(recentRecords.length, 15)}
              </span>
            </div>
            <div style={{ padding: '4px 0' }}>
              {recentRecords.length === 0 ? (
                <div className="empty-state" style={{ padding: 28 }}>
                  <div className="empty-icon"><Truck size={20} /></div>
                  <p style={{ fontSize: 12.5 }}>No recordings yet.</p>
                </div>
              ) : recentRecords.map((r, i) => (
                <div key={r.orderId || i} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px',
                  borderBottom: i < recentRecords.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: 'var(--primary-light)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 13,
                  }}>
                    {(r.name || '?')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {fmtDate(r.pickupDate)}{r.totalKg > 0 ? ` · ${r.totalKg} kg` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r.totalAmount > 0 ? (
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--primary)' }}>
                        {fmtCurrency(r.totalAmount)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>—</div>
                    )}
                    <div style={{ fontSize: 10, fontWeight: 600,
                      color: r.paymentStatus === 'Received' ? 'var(--secondary)'
                        : r.paymentStatus === 'Yet to Receive' ? '#92400E'
                        : 'var(--danger)',
                    }}>
                      {r.paymentStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {donorModal && <DonorModal onClose={() => setDonorModal(false)} onAdd={handleAddDonor} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}