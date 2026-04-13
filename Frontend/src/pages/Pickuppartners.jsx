// Frontend/src/pages/Pickuppartners.jsx
// Crash-proof: removed require() calls, top-level imports, full null safety
import { useState, useMemo, useCallback } from 'react'
import {
  Phone, Plus, Edit2, Trash2, X, Star, Mail,
  IndianRupee, TrendingUp, Clock, CheckCircle,
  BarChart3, ChevronDown, ChevronUp, Package, AlertCircle,
  MapPin, Eye,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'
import { fmtDate, fmtCurrency } from '../utils/helpers'
import { CITY_SECTORS, GURGAON_SOCIETIES } from '../data/mockData'

const RATE_CHART_ITEMS = [
  'Glass Bottle', 'Glass Other', 'Plastic Bottle / Box', 'Other Plastic',
  'Paper', 'Cardboard Box', 'Iron', 'E-Waste', 'Wood',
]

const DEFAULT_RATE_CHART = Object.fromEntries(
  RATE_CHART_ITEMS.map(k => [k, ({ 'Glass Bottle': 2, 'Glass Other': 1, 'Plastic Bottle / Box': 8, 'Other Plastic': 5, 'Paper': 12, 'Cardboard Box': 10, 'Iron': 25, 'E-Waste': 15, 'Wood': 3 })[k] || 0])
)

const GURGAON_SECTORS = CITY_SECTORS['Gurgaon'] || []

const EMPTY = {
  name: '', mobile: '', email: '',
  sectors: [], societies: [],
  area: '',
  rateChart: { ...DEFAULT_RATE_CHART },
}

const padM = (n) => String(n).padStart(2, '0')
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getLast5Months() {
  const now = new Date()
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1)
    return `${d.getFullYear()}-${padM(d.getMonth() + 1)}`
  })
}

function getMonthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${ym}-01`, to: `${ym}-${padM(last)}` }
}

// ── Rate Chart mini display ───────────────────────────────────────────────────
function RateChartMini({ rateChart, expanded, onToggle }) {
  if (!rateChart) return null
  const entries = Object.entries(rateChart).filter(([, v]) => v > 0)
  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--secondary)', padding: 0 }}>
        Rate Chart {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {expanded && (
        <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', padding: '5px 10px', background: 'var(--secondary-light)', fontSize: 10.5, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>
            <span>Item</span><span style={{ textAlign: 'right' }}>₹/kg</span>
          </div>
          {entries.map(([item, rate], i) => (
            <div key={item} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', padding: '5px 10px', fontSize: 12, borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>₹{rate}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Rate Chart editor ─────────────────────────────────────────────────────────
function RateChartEditor({ rateChart, onChange }) {
  const safe = rateChart || {}
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '6px 10px', background: 'var(--secondary-light)', borderRadius: '8px 8px 0 0', fontSize: 10.5, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>
        <span>Item</span><span style={{ textAlign: 'right' }}>Rate (₹/kg)</span>
      </div>
      <div style={{ border: '1px solid var(--border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {RATE_CHART_ITEMS.map((item, idx) => (
          <div key={item} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '8px 10px', alignItems: 'center', borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)', pointerEvents: 'none' }}>₹</span>
              <input
                type="number" min={0} step={0.5} inputMode="decimal"
                value={safe[item] ?? ''}
                onChange={e => onChange({ ...safe, [item]: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '5px 8px 5px 20px', fontSize: 13, fontWeight: 700, textAlign: 'right', border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Coverage Selector — using top-level import instead of require() ────────────
function CoverageSelector({ sectors, societies, onSectors, onSocieties }) {
  const [openSec, setOpenSec] = useState(false)
  const safeSectors   = Array.isArray(sectors)   ? sectors   : []
  const safeSocieties = Array.isArray(societies) ? societies : []

  const availableSocieties = useMemo(() => {
    if (!safeSectors.length) return []
    return safeSectors.flatMap(s => (GURGAON_SOCIETIES || {})[s] || [])
  }, [safeSectors])

  const toggleSector = (s) => {
    if (safeSectors.includes(s)) {
      onSectors(safeSectors.filter(x => x !== s))
      const removedSocs = (GURGAON_SOCIETIES || {})[s] || []
      onSocieties(safeSocieties.filter(soc => !removedSocs.includes(soc)))
    } else {
      if (safeSectors.length >= 2) return
      onSectors([...safeSectors, s])
    }
  }

  const toggleSociety = (soc) => {
    if (safeSocieties.includes(soc)) {
      onSocieties(safeSocieties.filter(s => s !== soc))
    } else {
      if (safeSocieties.length >= 5) return
      onSocieties([...safeSocieties, soc])
    }
  }

  return (
    <div>
      <div className="form-group" style={{ margin: '0 0 10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Coverage Sectors <span className="required">*</span></span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>Max 2 sectors</span>
        </label>
        <div style={{ position: 'relative' }}>
          <div onClick={() => setOpenSec(o => !o)} style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--surface)', minHeight: 40, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {safeSectors.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select up to 2 sectors…</span>
            ) : safeSectors.map(s => (
              <span key={s} style={{ background: 'var(--secondary-light)', color: 'var(--secondary)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{s}</span>
            ))}
            <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)', flexShrink: 0, transform: openSec ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </div>
          {openSec && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', maxHeight: 220, overflowY: 'auto', padding: 8 }}>
              {GURGAON_SECTORS.map(s => {
                const selected = safeSectors.includes(s)
                const disabled = !selected && safeSectors.length >= 2
                return (
                  <button key={s} type="button" onClick={() => !disabled && toggleSector(s)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none', background: selected ? 'var(--secondary-light)' : 'transparent', color: selected ? 'var(--secondary)' : disabled ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: selected ? 700 : 400, fontSize: 12.5, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
                    {s}{selected && ' ✓'}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {safeSectors.length > 0 && (
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Coverage Societies</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>Max 5 ({safeSocieties.length}/5)</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableSocieties.map(soc => {
              const selected = safeSocieties.includes(soc)
              const disabled = !selected && safeSocieties.length >= 5
              return (
                <button key={soc} type="button" onClick={() => !disabled && toggleSociety(soc)} style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${selected ? 'var(--secondary)' : 'var(--border)'}`, background: selected ? 'var(--secondary-light)' : 'transparent', color: selected ? 'var(--secondary)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: selected ? 700 : 400, fontSize: 11.5, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
                  {soc}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Monthly performance ───────────────────────────────────────────────────────
function PartnerMonthlyReport({ partner, raddiRecords, monthFilter }) {
  const monthly = useMemo(() => {
    if (!partner?.name || !Array.isArray(raddiRecords)) return []
    const records = raddiRecords.filter(r => {
      if (r.kabadiwalaName !== partner.name) return false
      if (!monthFilter) return true
      const { from, to } = getMonthRange(monthFilter)
      return (r.pickupDate || '') >= from && (r.pickupDate || '') <= to
    })
    const m = {}
    records.forEach(r => {
      const key = (r.pickupDate || '').slice(0, 7)
      if (!key) return
      if (!m[key]) m[key] = { month: key, pickups: 0, amount: 0, received: 0, kg: 0 }
      m[key].pickups++
      m[key].amount   += r.totalAmount || 0
      m[key].received += r.paymentStatus === 'Received' ? (r.totalAmount || 0) : 0
      m[key].kg       += r.totalKg || 0
    })
    return Object.values(m).sort((a, b) => b.month.localeCompare(a.month))
  }, [raddiRecords, partner?.name, monthFilter])

  if (!monthly.length) return <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data for selected period</div>

  return (
    <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
      <table>
        <thead><tr><th>Month</th><th>Pickups</th><th>Kg</th><th>Total (₹)</th><th>Received</th><th>Pending</th></tr></thead>
        <tbody>
          {monthly.map(m => (
            <tr key={m.month}>
              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.month}</td>
              <td style={{ fontWeight: 600 }}>{m.pickups}</td>
              <td>{m.kg.toFixed(1)} kg</td>
              <td style={{ fontWeight: 700 }}>{fmtCurrency(m.amount)}</td>
              <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>{fmtCurrency(m.received)}</td>
              <td style={{ color: m.amount - m.received > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                {fmtCurrency(m.amount - m.received)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PartnerPaymentSummaryCards({ partner, raddiRecords, monthFilter }) {
  const stats = useMemo(() => {
    if (!partner?.name || !Array.isArray(raddiRecords)) return { totalPickups: 0, totalAmount: 0, received: 0, pending: 0 }
    const records = raddiRecords.filter(r => {
      if (r.kabadiwalaName !== partner.name) return false
      if (!monthFilter) return true
      const { from, to } = getMonthRange(monthFilter)
      return (r.pickupDate || '') >= from && (r.pickupDate || '') <= to
    })
    const totalAmount = records.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const received    = records.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)
    return { totalPickups: records.length, totalAmount, received, pending: totalAmount - received }
  }, [raddiRecords, partner?.name, monthFilter])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, padding: '10px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
      {[
        { label: 'Pickups',     value: stats.totalPickups,             color: 'var(--text-primary)', icon: Package },
        { label: 'Total (₹)',   value: fmtCurrency(stats.totalAmount), color: 'var(--primary)',       icon: IndianRupee },
        { label: 'Pending (₹)', value: fmtCurrency(stats.pending),     color: stats.pending > 0 ? 'var(--danger)' : 'var(--secondary)', icon: AlertCircle },
      ].map(item => {
        const Icon = item.icon
        return (
          <div key={item.label} style={{ textAlign: 'center', padding: '6px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <Icon size={13} color={item.color} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function PickupPartners() {
  const {
    kabadiwalas: rawPartners,
    raddiRecords,
    addPartner,
    updatePartner,
    deletePartner,
  } = useApp()
  const { can } = useRole()

  const partners = useMemo(() => Array.isArray(rawPartners) ? rawPartners : [], [rawPartners])

  const [view,           setView]           = useState('directory')
  const [selectedK,      setSelectedK]      = useState(null)
  const [modal,          setModal]          = useState(false)
  const [form,           setForm]           = useState({ ...EMPTY, rateChart: { ...DEFAULT_RATE_CHART } })
  const [editing,        setEditing]        = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [expandedRates,  setExpandedRates]  = useState({})
  const [showRateEditor, setShowRateEditor] = useState(false)
  const [error,          setError]          = useState('')

  const last5Months  = getLast5Months()
  const [monthFilter, setMonthFilter] = useState('')

  const open = useCallback((k = null) => {
    setEditing(k)
    setError('')
    setShowRateEditor(false)
    if (k) {
      setForm({
        name:      k.name      || '',
        mobile:    k.mobile    || '',
        email:     k.email     || '',
        sectors:   Array.isArray(k.sectors)   ? [...k.sectors]   : [],
        societies: Array.isArray(k.societies) ? [...k.societies] : [],
        area:      k.area      || '',
        rateChart: { ...DEFAULT_RATE_CHART, ...(k.rateChart || {}) },
      })
    } else {
      setForm({ ...EMPTY, rateChart: { ...DEFAULT_RATE_CHART } })
    }
    setModal(true)
  }, [])

  const close = useCallback(() => {
    setModal(false)
    setEditing(null)
    setError('')
    setShowRateEditor(false)
  }, [])

  const save = useCallback(async () => {
    if (!form.name?.trim()) { setError('Name is required.'); return }
    if (!form.mobile?.trim()) { setError('Mobile number is required.'); return }
    setSaving(true)
    setError('')
    try {
      const area = [...(form.sectors || []), ...(form.societies || [])].filter(Boolean).join(', ') || form.area || ''
      if (editing?.id) {
        await updatePartner(editing.id, { ...form, area })
      } else {
        await addPartner({ ...form, area })
      }
      close()
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [form, editing, addPartner, updatePartner, close])

  const removeK = useCallback(async (id) => {
    if (!can.deletePartner) return
    if (!window.confirm('Remove this pickup partner?')) return
    try {
      await deletePartner(id)
      if (selectedK?.id === id) setSelectedK(null)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }, [can.deletePartner, deletePartner, selectedK])

  const toggleRate = useCallback((id) => {
    setExpandedRates(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const totals = useMemo(() => {
    if (!Array.isArray(raddiRecords)) return { earnings: 0, pending: 0, pickups: 0, scrapValue: 0 }
    const filtered = monthFilter
      ? raddiRecords.filter(r => {
          const { from, to } = getMonthRange(monthFilter)
          return (r.pickupDate || '') >= from && (r.pickupDate || '') <= to
        })
      : raddiRecords
    return {
      earnings:   filtered.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0),
      pending:    filtered.filter(r => r.paymentStatus !== 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0),
      pickups:    filtered.length,
      scrapValue: filtered.reduce((s, r) => s + (r.totalAmount || 0), 0),
    }
  }, [raddiRecords, monthFilter])

  return (
    <div className="page-body">
      {!can.viewPartnerReports && (
        <div className="alert-strip alert-info" style={{ marginBottom: 16 }}>
          <Eye size={14} />
          <span>You can add new pickup partners. Contact your manager to view reports or manage existing partners.</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${view === 'directory' ? 'active' : ''}`} onClick={() => setView('directory')}>Directory</button>
          {can.viewPartnerReports && (
            <button className={`tab ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
              <BarChart3 size={13} style={{ marginRight: 4 }} /> Reports
            </button>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => open()}>
          <Plus size={14} /> Add Pickup Partner
        </button>
      </div>

      {view === 'reports' && can.viewPartnerReports && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period:</span>
          <button className={`btn btn-sm ${!monthFilter ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11.5 }} onClick={() => setMonthFilter('')}>All Time</button>
          {last5Months.map(ym => {
            const [y, m] = ym.split('-')
            return (
              <button key={ym} className={`btn btn-sm ${monthFilter === ym ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11.5 }} onClick={() => setMonthFilter(ym)}>
                {MONTHS_SHORT[+m - 1]} {y}
              </button>
            )
          })}
        </div>
      )}

      {/* ══ DIRECTORY VIEW ══ */}
      {view === 'directory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {partners.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon"><Phone size={22} /></div>
              <h3>No pickup partners added</h3>
              <p>Add your first pickup partner to start assigning pickups.</p>
            </div>
          ) : partners.map(k => {
            if (!k?.id) return null
            return (
              <div key={k.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, background: 'var(--secondary-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--secondary)', flexShrink: 0 }}>
                      {(k.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        {k.id && <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--secondary)', padding: '2px 8px', borderRadius: 5 }}>{k.id}</span>}
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{k.name || '—'}</div>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Phone size={11} /> {k.mobile || '—'}
                      </div>
                      {k.email && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Mail size={11} /> {k.email}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Star size={11} fill="var(--accent)" color="var(--accent)" />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{k.rating ?? 4.0}</span>
                      </div>
                    </div>
                    <div className="td-actions">
                      {can.viewPartnerReports && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Reports" onClick={() => { setSelectedK(k); setView('reports') }}><BarChart3 size={13} /></button>
                      )}
                      {can.editPartner && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => open(k)}><Edit2 size={13} /></button>
                      )}
                      {can.deletePartner && (
                        <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => removeK(k.id)}><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>

                  {((Array.isArray(k.sectors) && k.sectors.length > 0) || k.area) && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <MapPin size={11} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(k.sectors || []).map(s => (
                          <span key={s} style={{ background: 'var(--secondary-light)', color: 'var(--secondary)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{s}</span>
                        ))}
                        {!(k.sectors?.length) && k.area && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.area}</span>}
                      </div>
                    </div>
                  )}

                  <PartnerPaymentSummaryCards partner={k} raddiRecords={raddiRecords || []} monthFilter="" />
                  <RateChartMini rateChart={k.rateChart} expanded={!!expandedRates[k.id]} onToggle={() => toggleRate(k.id)} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══ REPORTS VIEW ══ */}
      {view === 'reports' && can.viewPartnerReports && (
        <div>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card green"><div className="stat-icon"><IndianRupee size={18} /></div><div className="stat-value">{fmtCurrency(totals.earnings)}</div><div className="stat-label">Total Received</div></div>
            <div className="stat-card red"><div className="stat-icon"><Clock size={18} /></div><div className="stat-value">{fmtCurrency(totals.pending)}</div><div className="stat-label">Total Pending</div></div>
            <div className="stat-card orange"><div className="stat-icon"><TrendingUp size={18} /></div><div className="stat-value">{fmtCurrency(totals.scrapValue)}</div><div className="stat-label">Total Scrap Value</div></div>
            <div className="stat-card blue"><div className="stat-icon"><CheckCircle size={18} /></div><div className="stat-value">{totals.pickups}</div><div className="stat-label">Total Pickups</div></div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <button className={`btn btn-sm ${!selectedK ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedK(null)}>All Partners</button>
            {partners.filter(Boolean).map(k => (
              <button key={k.id} className={`btn btn-sm ${selectedK?.id === k.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedK(k)}>
                {k.name}
              </button>
            ))}
          </div>

          {(selectedK ? [selectedK] : partners).filter(Boolean).map(k => {
            const liveRecords  = (raddiRecords || []).filter(r => r.kabadiwalaName === k.name)
            const liveFiltered = monthFilter
              ? liveRecords.filter(r => {
                  const { from, to } = getMonthRange(monthFilter)
                  return (r.pickupDate || '') >= from && (r.pickupDate || '') <= to
                })
              : liveRecords
            const liveTotal    = liveFiltered.reduce((s, r) => s + (r.totalAmount || 0), 0)
            const liveReceived = liveFiltered.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)
            const livePending  = liveTotal - liveReceived
            return (
              <div key={k.id || k.name} className="card" style={{ marginBottom: 20 }}>
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      {k.id && <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--secondary)', padding: '2px 8px', borderRadius: 5 }}>{k.id}</span>}
                      <div className="card-title">{k.name}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {k.mobile}{k.email ? ` · ${k.email}` : ''}
                      {monthFilter ? <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 600 }}>({MONTHS_SHORT[+monthFilter.split('-')[1] - 1]} {monthFilter.split('-')[0]})</span> : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, textAlign: 'right', marginLeft: 'auto' }}>
                    <div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--secondary)', fontFamily: 'var(--font-display)' }}>{fmtCurrency(liveReceived)}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Received</div></div>
                    <div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--font-display)' }}>{fmtCurrency(livePending)}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending</div></div>
                    <div><div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{liveFiltered.length}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pickups</div></div>
                  </div>
                  {can.editPartner && <button className="btn btn-ghost btn-sm" onClick={() => open(k)}><Edit2 size={12} /> Edit</button>}
                </div>
                <div style={{ padding: '0' }}>
                  <div style={{ padding: '10px 20px 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly Breakdown</div>
                  <PartnerMonthlyReport partner={k} raddiRecords={raddiRecords || []} monthFilter={monthFilter} />
                </div>
                {k.rateChart && (
                  <div style={{ padding: '8px 20px 0' }}>
                    <RateChartMini rateChart={k.rateChart} expanded={!!expandedRates[`report-${k.id}`]} onToggle={() => setExpandedRates(prev => ({ ...prev, [`report-${k.id}`]: !prev[`report-${k.id}`] }))} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal modal-lg" style={{ maxWidth: 700, width: '95vw' }}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Pickup Partner' : 'Add Pickup Partner'}</div>
              {editing?.id && <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--secondary)', padding: '2px 8px', borderRadius: 5 }}>{editing.id}</span>}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={close}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '72vh' }}>
              {error && (
                <div className="alert-strip alert-danger" style={{ marginBottom: 16 }}>
                  <AlertCircle size={13} />{error}
                </div>
              )}
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Name <span className="required">*</span></label>
                  <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner full name" autoFocus />
                </div>
                <div className="form-group">
                  <label>Mobile <span className="required">*</span></label>
                  <input value={form.mobile || ''} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="10-digit number" maxLength={10} inputMode="numeric" />
                </div>
                <div className="form-group full">
                  <label>Email <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span></label>
                  <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="partner@example.com" />
                </div>
              </div>

              <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>Coverage Area</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Select up to 2 sectors and 5 societies this partner covers.</div>
                <CoverageSelector
                  sectors={form.sectors || []}
                  societies={form.societies || []}
                  onSectors={s => setForm(f => ({ ...f, sectors: s }))}
                  onSocieties={s => setForm(f => ({ ...f, societies: s }))}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Rate Chart</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Per-kg rates for each RST item</div>
                  </div>
                  <button type="button" onClick={() => setShowRateEditor(v => !v)} className={`btn btn-sm ${showRateEditor ? 'btn-outline' : 'btn-ghost'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {showRateEditor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {showRateEditor ? 'Hide' : 'Edit Rates'}
                  </button>
                </div>
                {!showRateEditor && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 14px', background: 'var(--secondary-light)', borderRadius: 8 }}>
                    {RATE_CHART_ITEMS.map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--surface)', borderRadius: 20, fontSize: 11.5, border: '1px solid var(--border-light)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                        <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>₹{(form.rateChart || {})[item] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showRateEditor && (
                  <RateChartEditor
                    rateChart={form.rateChart || DEFAULT_RATE_CHART}
                    onChange={rc => setForm(f => ({ ...f, rateChart: rc }))}
                  />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving || !form.name?.trim() || !form.mobile?.trim()}
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Pickup Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}