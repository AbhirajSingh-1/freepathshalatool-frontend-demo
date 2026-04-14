// Frontend/src/pages/Pickuppartners.jsx
import { useState, useMemo, useCallback } from 'react'
import {
  Phone, Plus, Edit2, Trash2, X, Star, Mail,
  IndianRupee, TrendingUp, Clock, CheckCircle,
  BarChart3, ChevronDown, ChevronUp, Package, AlertCircle,
  MapPin, Eye, Search, Users, Building2, Layers, Calendar,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'
import { fmtDate, fmtCurrency } from '../utils/helpers'
import { CITIES, CITY_SECTORS, GURGAON_SOCIETIES } from '../data/mockData'

const RATE_CHART_ITEMS = [
  'Glass Bottle', 'Glass Other', 'Plastic Bottle / Box', 'Other Plastic',
  'Paper', 'Cardboard Box', 'Iron', 'E-Waste', 'Wood',
]

const DEFAULT_RATE_CHART = Object.fromEntries(
  RATE_CHART_ITEMS.map(k => [k, ({
    'Glass Bottle': 2, 'Glass Other': 1, 'Plastic Bottle / Box': 8,
    'Other Plastic': 5, 'Paper': 12, 'Cardboard Box': 10,
    'Iron': 25, 'E-Waste': 15, 'Wood': 3,
  })[k] || 0])
)

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
  const entries = Object.entries(rateChart).filter(([k, v]) => v > 0 && k !== 'Others')
  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--secondary)', padding:0 }}>
        Rate Chart {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {expanded && (
        <div style={{ marginTop:8, borderRadius:8, overflow:'hidden', border:'1px solid var(--border-light)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', padding:'5px 10px', background:'var(--secondary-light)', fontSize:10.5, fontWeight:700, color:'var(--secondary)', textTransform:'uppercase' }}>
            <span>Item</span><span style={{ textAlign:'right' }}>₹/kg</span>
          </div>
          {entries.map(([ item, rate], i) => (
            <div key={item} style={{ display:'grid', gridTemplateColumns:'1fr 80px', padding:'5px 10px', fontSize:12, borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
              <span style={{ color:'var(--text-secondary)' }}>{item}</span>
              <span style={{ textAlign:'right', fontWeight:700, color:'var(--secondary)' }}>₹{rate}</span>
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
      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 10px', background:'var(--secondary-light)', borderRadius:'8px 8px 0 0', fontSize:10.5, fontWeight:700, color:'var(--secondary)', textTransform:'uppercase' }}>
        <span>Item</span><span style={{ textAlign:'right' }}>Rate (₹/kg)</span>
      </div>
      <div style={{ border:'1px solid var(--border-light)', borderTop:'none', borderRadius:'0 0 8px 8px', overflow:'hidden' }}>
        {RATE_CHART_ITEMS.map((item, idx) => (
          <div key={item} style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'8px 10px', alignItems:'center', borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{item}</span>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text-muted)', pointerEvents:'none' }}>₹</span>
              <input type="number" min={0} step={0.5} inputMode="decimal" value={safe[item] ?? ''} onChange={e => onChange({ ...safe, [item]: parseFloat(e.target.value) || 0 })} style={{ width:'100%', padding:'5px 8px 5px 20px', fontSize:13, fontWeight:700, textAlign:'right', border:'1.5px solid var(--border)', borderRadius:6, background:'var(--surface)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Coverage Selector ─────────────────────────────────────────────────────────
function CoverageSelector({ city, sectors, societies, onSectors, onSocieties }) {
  const [openSec, setOpenSec] = useState(false)
  const [customSocInput, setCustomSocInput] = useState('')
  const [secSearch, setSecSearch] = useState('')
  const safeSectors   = Array.isArray(sectors)   ? sectors   : []
  const safeSocieties = Array.isArray(societies) ? societies : []

  const sectorOptions = useMemo(() => {
    return CITY_SECTORS[city || 'Gurgaon'] || []
  }, [city])

  const availableSocieties = useMemo(() => {
    if (!safeSectors.length) return []
    if ((city || 'Gurgaon') === 'Gurgaon') {
      return safeSectors.flatMap(s => (GURGAON_SOCIETIES || {})[s] || [])
    }
    return []
  }, [safeSectors, city])

  const filteredSectors = useMemo(() => {
    const q = secSearch.toLowerCase().trim()
    if (!q) return sectorOptions
    return sectorOptions.filter(s => s.toLowerCase().includes(q))
  }, [sectorOptions, secSearch])

  const toggleSector = (s) => {
    if (safeSectors.includes(s)) {
      onSectors(safeSectors.filter(x => x !== s))
      if ((city || 'Gurgaon') === 'Gurgaon') {
        const removedSocs = (GURGAON_SOCIETIES || {})[s] || []
        onSocieties(safeSocieties.filter(soc => !removedSocs.includes(soc)))
      }
    } else {
      if (safeSectors.length >= 3) return
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

  const addCustomSociety = () => {
    const trimmed = customSocInput.trim()
    if (!trimmed || safeSocieties.includes(trimmed) || safeSocieties.length >= 5) return
    onSocieties([...safeSocieties, trimmed])
    setCustomSocInput('')
  }

  return (
    <div>
      <div className="form-group" style={{ margin: '0 0 12px' }}>
        <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Coverage Sectors <span className="required">*</span></span>
          <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>Max 2 ({safeSectors.length}/2)</span>
        </label>
        <div style={{ position:'relative' }}>
          <div
            onClick={() => setOpenSec(o => !o)}
            style={{ padding:'8px 12px', border:`1.5px solid ${openSec ? 'var(--secondary)' : 'var(--border)'}`, borderRadius:'var(--radius-sm)', cursor:'pointer', background:'var(--surface)', minHeight:42, display:'flex', alignItems:'center', flexWrap:'wrap', gap:6, boxShadow: openSec ? '0 0 0 3px rgba(27,94,53,0.12)' : 'none' }}
          >
            {safeSectors.length === 0 ? (
              <span style={{ color:'var(--text-muted)', fontSize:13 }}>Select up to 3 sectors from {city || 'Gurgaon'}…</span>
            ) : safeSectors.map(s => (
              <span key={s} style={{ background:'var(--secondary-light)', color:'var(--secondary)', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:5 }}>
                {s}
                <button type="button" onClick={e => { e.stopPropagation(); toggleSector(s) }} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--secondary)', padding:0, display:'flex', lineHeight:1 }}>×</button>
              </span>
            ))}
            <ChevronDown size={14} style={{ marginLeft:'auto', color:'var(--text-muted)', flexShrink:0, transform: openSec ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }} />
          </div>
          {openSec && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:60, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-md)', overflow:'hidden' }}>
              <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border-light)' }}>
                <input autoFocus value={secSearch} onChange={e => setSecSearch(e.target.value)} placeholder="Search sectors…" style={{ width:'100%', fontSize:12.5, border:'1px solid var(--border)', borderRadius:6, padding:'5px 10px', outline:'none' }} />
              </div>
              <div style={{ maxHeight:200, overflowY:'auto', padding:6 }}>
                {filteredSectors.length === 0 ? (
                  <div style={{ padding:'12px', textAlign:'center', fontSize:12.5, color:'var(--text-muted)' }}>No sectors match</div>
                ) : filteredSectors.map(s => {
                  const selected = safeSectors.includes(s)
                  const disabled = !selected && safeSectors.length >= 3
                  return (
                    <button key={s} type="button" onClick={() => { if (!disabled) { toggleSector(s) } }} style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:6, border:'none', background: selected ? 'var(--secondary-light)' : 'transparent', color: selected ? 'var(--secondary)' : disabled ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: selected ? 700 : 400, fontSize:12.5, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
                      {s}{selected && ' ✓'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {safeSectors.length > 0 && (
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>Coverage Societies</span>
            <span style={{ fontSize:11, fontWeight:400, color: safeSocieties.length >= 5 ? 'var(--danger)' : 'var(--text-muted)' }}>{safeSocieties.length}/5 selected</span>
          </label>
          {availableSocieties.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10, maxHeight:120, overflowY:'auto', padding:4, border:'1px solid var(--border-light)', borderRadius:8, background:'var(--bg)' }}>
              {availableSocieties.map(soc => {
                const selected = safeSocieties.includes(soc)
                const disabled = !selected && safeSocieties.length >= 5
                return (
                  <button key={soc} type="button" onClick={() => !disabled && toggleSociety(soc)} style={{ padding:'3px 10px', borderRadius:20, border:`1.5px solid ${selected ? 'var(--secondary)' : 'var(--border)'}`, background: selected ? 'var(--secondary-light)' : 'var(--surface)', color: selected ? 'var(--secondary)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: selected ? 700 : 400, fontSize:11.5, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition:'all 0.12s', whiteSpace:'nowrap' }}>
                    {selected && '✓ '}{soc}
                  </button>
                )
              })}
            </div>
          )}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input value={customSocInput} onChange={e => setCustomSocInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSociety() } }} placeholder={safeSocieties.length >= 5 ? 'Max 5 societies reached' : availableSocieties.length > 0 ? 'Add a society not in the list…' : 'Type society / colony name…'} disabled={safeSocieties.length >= 5} style={{ flex:1, fontSize:13 }} />
            <button type="button" onClick={addCustomSociety} disabled={!customSocInput.trim() || safeSocieties.length >= 5} className="btn btn-secondary btn-sm" style={{ flexShrink:0 }}>+ Add</button>
          </div>
          {safeSocieties.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
              {safeSocieties.map(soc => (
                <span key={soc} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--secondary-light)', color:'var(--secondary)', fontSize:11.5, fontWeight:600, border:'1px solid rgba(27,94,53,0.2)' }}>
                  {soc}
                  <button type="button" onClick={() => toggleSociety(soc)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--secondary)', padding:0, display:'flex', lineHeight:1 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Executive view ────────────────────────────────────────────────────────────
function ExecutiveSectorSearch({ partners, onAddNew }) {
  const [city,    setCity]    = useState('Gurgaon')
  const [sector,  setSector]  = useState('')
  const [society, setSociety] = useState('')

  const sectorOptions  = CITY_SECTORS[city] || []
  const societyOptions = useMemo(() => {
    if (city === 'Gurgaon' && sector && GURGAON_SOCIETIES[sector]) return GURGAON_SOCIETIES[sector]
    return []
  }, [city, sector])

  const handleCityChange   = (val) => { setCity(val);   setSector(''); setSociety('') }
  const handleSectorChange = (val) => { setSector(val); setSociety('') }

  const matchingPartners = useMemo(() => {
    if (!sector) return []
    return (partners || []).filter(p => {
      const secs = Array.isArray(p.sectors)   ? p.sectors   : []
      const socs = Array.isArray(p.societies) ? p.societies : []
      const matchSector  = secs.includes(sector)
      const matchSociety = society ? socs.includes(society) : false
      return matchSector || matchSociety
    })
  }, [partners, sector, society])

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600 }}>Find Your Pickup Partner</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Select your area to find the assigned pickup partner</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAddNew}><Plus size={14} /> Add Partner</button>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ background:'var(--primary-light)' }}>
          <MapPin size={16} color="var(--primary)" />
          <div className="card-title" style={{ color:'var(--primary)' }}>Search by Area</div>
        </div>
        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--primary)', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>1</div>
                <label style={{ margin:0, fontSize:12.5, fontWeight:700, color:'var(--text-secondary)' }}>City</label>
              </div>
              <select value={city} onChange={e => handleCityChange(e.target.value)} style={{ width:'100%', fontSize:13 }}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background: city ? 'var(--primary)' : 'var(--border)', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>2</div>
                <label style={{ margin:0, fontSize:12.5, fontWeight:700, color:'var(--text-secondary)' }}>Sector / Area</label>
              </div>
              <select value={sector} onChange={e => handleSectorChange(e.target.value)} disabled={!city} style={{ width:'100%', fontSize:13 }}>
                <option value="">— Select Sector —</option>
                {sectorOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background: sector ? 'var(--primary)' : 'var(--border)', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>3</div>
                <label style={{ margin:0, fontSize:12.5, fontWeight:700, color:'var(--text-secondary)' }}>Society <span style={{ fontWeight:400, color:'var(--text-muted)', fontSize:11 }}>(optional)</span></label>
              </div>
              {societyOptions.length > 0 ? (
                <select value={society} onChange={e => setSociety(e.target.value)} disabled={!sector} style={{ width:'100%', fontSize:13 }}>
                  <option value="">— All societies in {sector} —</option>
                  {societyOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              ) : (
                <input value={society} onChange={e => setSociety(e.target.value)} placeholder={sector ? 'Type society name…' : 'Select sector first'} disabled={!sector} style={{ width:'100%', fontSize:13 }} />
              )}
            </div>
          </div>
          {sector && (
            <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--bg)', borderRadius:8, fontSize:12, flexWrap:'wrap' }}>
              <MapPin size={12} color="var(--primary)" />
              <span style={{ fontWeight:700, color:'var(--primary)' }}>{city}</span>
              <span style={{ color:'var(--text-muted)' }}>›</span>
              <span style={{ fontWeight:700, color:'var(--secondary)' }}>{sector}</span>
              {society && <><span style={{ color:'var(--text-muted)' }}>›</span><span style={{ fontWeight:700, color:'var(--info)' }}>{society}</span></>}
              <button onClick={() => { setSector(''); setSociety('') }} style={{ marginLeft:'auto', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3, fontSize:11 }}>
                <X size={11} /> Clear
              </button>
            </div>
          )}
        </div>
      </div>
      {!sector ? (
        <div style={{ padding:'48px 24px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
          <MapPin size={36} color="var(--border)" style={{ display:'block', margin:'0 auto 12px' }} />
          <div style={{ fontWeight:600, fontSize:14, marginBottom:4, color:'var(--text-secondary)' }}>Select your sector to continue</div>
          <div>Your assigned pickup partner's contact will appear here.</div>
        </div>
      ) : matchingPartners.length === 0 ? (
        <div className="empty-state" style={{ padding:40 }}>
          <div className="empty-icon"><Users size={22} /></div>
          <h3>No partner assigned yet</h3>
          <p>No pickup partner covers {sector}{society ? ` / ${society}` : ''} yet.</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
            <CheckCircle size={14} color="var(--secondary)" />
            {matchingPartners.length} partner{matchingPartners.length !== 1 ? 's' : ''} cover{matchingPartners.length === 1 ? 's' : ''} <span style={{ color:'var(--primary)' }}>{sector}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
            {matchingPartners.map(k => (
              <div key={k.id} className="card" style={{ borderLeft:'3px solid var(--secondary)' }}>
                <div className="card-body">
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:12 }}>
                    <div style={{ width:48, height:48, background:'var(--secondary-light)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--secondary)', flexShrink:0 }}>
                      {(k.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{k.name}</div>
                      <div style={{ fontSize:12.5, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><Phone size={11} /> {k.mobile || '—'}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}><Star size={11} fill="var(--accent)" color="var(--accent)" /><span style={{ fontSize:12, fontWeight:600 }}>{k.rating ?? 4.0}</span></div>
                    </div>
                  </div>
                  {(k.sectors || []).length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:12 }}>
                      {(k.sectors || []).map(s => (
                        <span key={s} style={{ background: s === sector ? 'var(--secondary)' : 'var(--secondary-light)', color: s === sector ? '#fff' : 'var(--secondary)', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:600 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ background:'var(--secondary-light)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--secondary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Call for Pickup</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--secondary)', letterSpacing:'0.04em', fontFamily:'var(--font-display)' }}>{k.mobile}</div>
                    {k.email && <div style={{ fontSize:12, color:'var(--secondary)', opacity:0.7, marginTop:4 }}>{k.email}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Monthly performance ───────────────────────────────────────────────────────
function PartnerMonthlyReport({ partner, raddiRecords, pickups, dateFrom, dateTo }) {
  const [expandedMonth, setExpandedMonth] = useState(null)

  const monthly = useMemo(() => {
    if (!partner?.name || !Array.isArray(raddiRecords)) return []
    const records = raddiRecords.filter(r => {
      if (r.kabadiwalaName !== partner.name) return false
      if (dateFrom && (r.pickupDate || '') < dateFrom) return false
      if (dateTo   && (r.pickupDate || '') > dateTo)   return false
      return true
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
  }, [raddiRecords, partner?.name, dateFrom, dateTo])

  const getMonthPickups = useCallback((monthKey) => {
    if (!partner?.name || !Array.isArray(pickups)) return []
    const { from, to } = getMonthRange(monthKey)
    return pickups.filter(p => p.kabadiwala === partner.name && p.status === 'Completed' && (p.date || '') >= from && (p.date || '') <= to).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [pickups, partner?.name])

  if (!monthly.length) return (
    <div style={{ padding:'20px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No data for selected period</div>
  )

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 80px 90px 90px 80px 32px', padding:'7px 16px', background:'var(--secondary-light)', fontSize:10.5, fontWeight:700, color:'var(--secondary)', textTransform:'uppercase', letterSpacing:'0.04em', borderTop:'1px solid var(--border-light)' }}>
        <span>Month</span><span>Pickups</span><span>Kg</span><span>Total (₹)</span><span>Received</span><span>Pending</span><span></span>
      </div>
      {monthly.map(m => {
        const isExpanded = expandedMonth === m.month
        const monthPickups = isExpanded ? getMonthPickups(m.month) : []
        const pending = m.amount - m.received
        return (
          <div key={m.month}>
            <div onClick={() => setExpandedMonth(isExpanded ? null : m.month)} style={{ display:'grid', gridTemplateColumns:'1fr 70px 80px 90px 90px 80px 32px', padding:'10px 16px', cursor:'pointer', borderTop:'1px solid var(--border-light)', background: isExpanded ? 'var(--secondary-light)' : 'var(--surface)', alignItems:'center' }}>
              <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color: isExpanded ? 'var(--secondary)' : 'var(--text-primary)' }}>{m.month}</span>
              <span style={{ fontWeight:600, fontSize:13 }}>{m.pickups}</span>
              <span style={{ fontSize:12.5 }}>{m.kg.toFixed(1)} kg</span>
              <span style={{ fontWeight:700, fontSize:13 }}>{fmtCurrency(m.amount)}</span>
              <span style={{ color:'var(--secondary)', fontWeight:700, fontSize:13 }}>{fmtCurrency(m.received)}</span>
              <span style={{ color: pending > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight:700, fontSize:13 }}>{fmtCurrency(pending)}</span>
              <span style={{ color:'var(--text-muted)', display:'flex', justifyContent:'center' }}>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </div>
            {isExpanded && (
              <div style={{ background:'var(--bg)', borderTop:'1px solid var(--border-light)', borderBottom:'1px solid var(--border-light)' }}>
                {monthPickups.length === 0 ? (
                  <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:12.5 }}>No completed pickups found.</div>
                ) : monthPickups.map((p, i) => (
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px 100px', padding:'10px 20px', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', alignItems:'center', background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{p.donorName}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{fmtDate(p.date)}</div>
                      {p.totalValue > 0 && <div style={{ fontSize:11.5, fontWeight:700, color:'var(--primary)', marginTop:2 }}>{fmtCurrency(p.totalValue)}</div>}
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--text-secondary)' }}>{p.society || '—'}, {p.sector || '—'}</div>
                    <span className={`badge ${p.type === 'RST' ? 'badge-success' : p.type === 'SKS' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize:10 }}>{p.type || 'RST'}</span>
                    <span className={`badge ${p.paymentStatus === 'Paid' ? 'badge-success' : p.paymentStatus === 'Partially Paid' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize:10 }}>{p.paymentStatus}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PartnerPaymentSummaryCards({ partner, raddiRecords, dateFrom, dateTo }) {
  const stats = useMemo(() => {
    if (!partner?.name || !Array.isArray(raddiRecords)) return { totalPickups:0, totalAmount:0, received:0, pending:0 }
    const records = raddiRecords.filter(r => {
      if (r.kabadiwalaName !== partner.name) return false
      if (dateFrom && (r.pickupDate || '') < dateFrom) return false
      if (dateTo   && (r.pickupDate || '') > dateTo)   return false
      return true
    })
    const totalAmount = records.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const received    = records.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount || 0), 0)
    return { totalPickups: records.length, totalAmount, received, pending: totalAmount - received }
  }, [raddiRecords, partner?.name, dateFrom, dateTo])

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:12, padding:'10px', background:'var(--bg)', borderRadius:10, border:'1px solid var(--border-light)' }}>
      {[
        { label:'Pickups',     value: stats.totalPickups,             color:'var(--text-primary)', icon: Package },
        { label:'Total (₹)',   value: fmtCurrency(stats.totalAmount), color:'var(--primary)',       icon: IndianRupee },
        { label:'Pending (₹)', value: fmtCurrency(stats.pending),     color: stats.pending > 0 ? 'var(--danger)' : 'var(--secondary)', icon: AlertCircle },
      ].map(item => {
        const Icon = item.icon
        return (
          <div key={item.label} style={{ textAlign:'center', padding:'6px 4px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}><Icon size={13} color={item.color} /></div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:item.color, lineHeight:1 }}>{item.value}</div>
            <div style={{ fontSize:9.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function PickupPartners() {
  const { kabadiwalas: rawPartners, pickups, raddiRecords, addPartner, updatePartner, deletePartner } = useApp()
  const { can, role } = useRole()

  const partners = useMemo(() => Array.isArray(rawPartners) ? rawPartners : [], [rawPartners])

  const [view,           setView]           = useState('directory')
  const [selectedK,      setSelectedK]      = useState(null)
  const [modal,          setModal]          = useState(false)
  const [form,           setForm]           = useState({
    name: '', mobile: '', email: '',
    city: 'Gurgaon',
    sectors: [], societies: [],
    area: '',
    rateChart: { ...DEFAULT_RATE_CHART },
  })
  const [editing,        setEditing]        = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [expandedRates,  setExpandedRates]  = useState({})
  const [showRateEditor, setShowRateEditor] = useState(false)
  const [error,          setError]          = useState('')

  // ── Directory filter state ────────────────────────────────────────────────
  const [dirSearch,        setDirSearch]        = useState('')
  const [dirFilterCity,    setDirFilterCity]    = useState('')
  const [dirFilterSector,  setDirFilterSector]  = useState('')
  const [dirFilterSociety, setDirFilterSociety] = useState('')

  const dirSectorOptions = useMemo(() => dirFilterCity ? (CITY_SECTORS[dirFilterCity] || []) : [], [dirFilterCity])
  const dirSocietyOptions = useMemo(() => {
    if (!dirFilterCity || !dirFilterSector) return []
    if (dirFilterCity === 'Gurgaon' && GURGAON_SOCIETIES[dirFilterSector]) return GURGAON_SOCIETIES[dirFilterSector]
    return []
  }, [dirFilterCity, dirFilterSector])

  const filteredDirectoryPartners = useMemo(() => {
    const q = dirSearch.toLowerCase().trim()
    return partners.filter(k => {
      const matchSearch  = !q || k.name?.toLowerCase().includes(q) || k.mobile?.includes(q)
      const matchCity    = !dirFilterCity    || k.city === dirFilterCity
      const matchSector  = !dirFilterSector  || (k.sectors  || []).includes(dirFilterSector)
      const matchSociety = !dirFilterSociety || (k.societies || []).includes(dirFilterSociety)
      return matchSearch && matchCity && matchSector && matchSociety
    })
  }, [partners, dirSearch, dirFilterCity, dirFilterSector, dirFilterSociety])

  const hasDirFilters = dirSearch || dirFilterCity || dirFilterSector || dirFilterSociety

  const clearDirFilters = () => {
    setDirSearch(''); setDirFilterCity(''); setDirFilterSector(''); setDirFilterSociety('')
  }

  // Reports date range filter
  const last5Months = getLast5Months()
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo,   setReportTo]   = useState('')
  const [customRange, setCustomRange] = useState(false)

  const setMonthRange = (ym) => {
    if (!ym) { setReportFrom(''); setReportTo(''); setCustomRange(false); return }
    const { from, to } = getMonthRange(ym)
    setReportFrom(from); setReportTo(to); setCustomRange(false)
  }

  const isExecutive = role === 'executive'

  const open = useCallback((k = null) => {
    setEditing(k); setError(''); setShowRateEditor(false)
    if (k) {
      setForm({ name: k.name || '', mobile: k.mobile || '', email: k.email || '', city: k.city || 'Gurgaon', sectors: Array.isArray(k.sectors) ? [...k.sectors] : [], societies: Array.isArray(k.societies) ? [...k.societies] : [], area: k.area || '', rateChart: { ...DEFAULT_RATE_CHART, ...(k.rateChart || {}) } })
    } else {
      setForm({ name: '', mobile: '', email: '', city: 'Gurgaon', sectors: [], societies: [], area: '', rateChart: { ...DEFAULT_RATE_CHART } })
    }
    setModal(true)
  }, [])

  const close = useCallback(() => { setModal(false); setEditing(null); setError(''); setShowRateEditor(false) }, [])

  const save = useCallback(async () => {
    if (!form.name?.trim())   { setError('Name is required.'); return }
    if (!form.mobile?.trim()) { setError('Mobile number is required.'); return }
    setSaving(true); setError('')
    try {
      const area = [...(form.sectors||[]), ...(form.societies||[])].filter(Boolean).join(', ') || form.area || ''
      editing?.id ? await updatePartner(editing.id, { ...form, area }) : await addPartner({ ...form, area })
      close()
    } catch { setError('Failed to save. Please try again.') }
    finally { setSaving(false) }
  }, [form, editing, addPartner, updatePartner, close])

  const removeK = useCallback(async (id) => {
    if (!can.deletePartner) return
    if (!window.confirm('Remove this pickup partner?')) return
    try { await deletePartner(id); if (selectedK?.id === id) setSelectedK(null) }
    catch (err) { console.error('Delete error:', err) }
  }, [can.deletePartner, deletePartner, selectedK])

  const toggleRate = useCallback((id) => setExpandedRates(prev => ({ ...prev, [id]: !prev[id] })), [])

  const totals = useMemo(() => {
    if (!Array.isArray(raddiRecords)) return { earnings:0, pending:0, pickups:0, scrapValue:0 }
    let records = raddiRecords.filter(r => {
      if (reportFrom && (r.pickupDate || '') < reportFrom) return false
      if (reportTo   && (r.pickupDate || '') > reportTo)   return false
      return true
    })
    if (selectedK) records = records.filter(r => r.kabadiwalaName === selectedK.name)
    return {
      earnings:   records.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount||0), 0),
      pending:    records.filter(r => r.paymentStatus !== 'Received').reduce((s, r) => s + (r.totalAmount||0), 0),
      pickups:    records.length,
      scrapValue: records.reduce((s, r) => s + (r.totalAmount||0), 0),
    }
  }, [raddiRecords, reportFrom, reportTo, selectedK])

  if (isExecutive) {
    return (
      <div className="page-body">
        <ExecutiveSectorSearch partners={partners} onAddNew={() => open()} />
        {modal && renderModal()}
      </div>
    )
  }

  function renderModal() {
    return (
      <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal modal-lg" style={{ maxWidth:700, width:'95vw' }}>
          <div className="modal-header">
            <div className="modal-title">{editing ? 'Edit Pickup Partner' : 'Add Pickup Partner'}</div>
            {editing?.id && <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:800, color:'white', background:'var(--secondary)', padding:'2px 8px', borderRadius:5 }}>{editing.id}</span>}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={close}><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ overflowY:'auto', maxHeight:'72vh' }}>
            {error && <div className="alert-strip alert-danger" style={{ marginBottom:16 }}><AlertCircle size={13} />{error}</div>}
            <div className="form-grid" style={{ marginBottom:16 }}>
              <div className="form-group"><label>Name <span className="required">*</span></label><input value={form.name||''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner full name" autoFocus /></div>
              <div className="form-group"><label>Mobile <span className="required">*</span></label><input value={form.mobile||''} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="10-digit number" maxLength={10} inputMode="numeric" /></div>
              <div className="form-group full"><label>Email <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)', marginLeft:4 }}>(optional)</span></label><input type="email" value={form.email||''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="partner@example.com" /></div>
            </div>
            <div style={{ marginBottom:16, padding:14, background:'var(--bg)', borderRadius:10, border:'1px solid var(--border-light)' }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:4 }}>Coverage Area</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Select city, up to 2 sectors, and up to 5 societies.</div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label style={{ display:'flex', alignItems:'center', gap:5 }}><Building2 size={12} color="var(--primary)" /> City <span className="required">*</span></label>
                <select value={form.city || 'Gurgaon'} onChange={e => setForm(f => ({ ...f, city: e.target.value, sectors: [], societies: [] }))} style={{ fontSize:13 }}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <CoverageSelector city={form.city || 'Gurgaon'} sectors={form.sectors||[]} societies={form.societies||[]} onSectors={s => setForm(f => ({ ...f, sectors: s }))} onSocieties={s => setForm(f => ({ ...f, societies: s }))} />
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div><div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>Rate Chart</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>Per-kg rates for each RST item</div></div>
                <button type="button" onClick={() => setShowRateEditor(v => !v)} className={`btn btn-sm ${showRateEditor ? 'btn-outline' : 'btn-ghost'}`}>
                  {showRateEditor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{showRateEditor ? 'Hide' : 'Edit Rates'}
                </button>
              </div>
              {!showRateEditor && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'10px 14px', background:'var(--secondary-light)', borderRadius:8 }}>
                  {RATE_CHART_ITEMS.map(item => (
                    <div key={item} style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', background:'var(--surface)', borderRadius:20, fontSize:11.5, border:'1px solid var(--border-light)' }}>
                      <span style={{ color:'var(--text-secondary)' }}>{item}</span>
                      <span style={{ fontWeight:700, color:'var(--secondary)' }}>₹{(form.rateChart||{})[item]??0}</span>
                    </div>
                  ))}
                </div>
              )}
              {showRateEditor && <RateChartEditor rateChart={form.rateChart||DEFAULT_RATE_CHART} onChange={rc => setForm(f => ({ ...f, rateChart: rc }))} />}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.name?.trim() || !form.mobile?.trim()}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Pickup Partner'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const periodLabel = useMemo(() => {
    if (!reportFrom && !reportTo) return 'All Time'
    const fmt = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    if (reportFrom && reportTo) return `${fmt(reportFrom)} – ${fmt(reportTo)}`
    if (reportFrom) return `From ${fmt(reportFrom)}`
    return `Until ${fmt(reportTo)}`
  }, [reportFrom, reportTo])

  const activeMonthBtn = useMemo(() => {
    if (!reportFrom || !reportTo || customRange) return ''
    return last5Months.find(ym => { const { from, to } = getMonthRange(ym); return from === reportFrom && to === reportTo }) || ''
  }, [reportFrom, reportTo, last5Months, customRange])

  return (
    <div className="page-body">
      {!can.viewPartnerReports && (
        <div className="alert-strip alert-info" style={{ marginBottom:16 }}>
          <Eye size={14} />
          <span>You can add new pickup partners. Contact your manager to view reports or manage existing partners.</span>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          <button className={`tab ${view === 'directory' ? 'active' : ''}`} onClick={() => setView('directory')}>Directory</button>
          {can.viewPartnerReports && (
            <button className={`tab ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
              <BarChart3 size={13} style={{ marginRight:4 }} /> Reports
            </button>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => open()}>
          <Plus size={14} /> Add Pickup Partner
        </button>
      </div>

      {/* Reports date range filter bar */}
      {view === 'reports' && can.viewPartnerReports && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:16, padding:'10px 14px', background:'var(--surface)', borderRadius:'var(--radius)', border:'1px solid var(--border-light)', boxShadow:'var(--shadow)' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', flexShrink:0 }}>Period:</span>
          <button className={`btn btn-sm ${!reportFrom && !reportTo ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize:11.5 }} onClick={() => setMonthRange('')}>All Time</button>
          {last5Months.map(ym => {
            const [y, m] = ym.split('-')
            return (
              <button key={ym} className={`btn btn-sm ${activeMonthBtn === ym ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize:11.5 }} onClick={() => setMonthRange(ym)}>
                {MONTHS_SHORT[+m - 1]} {y}
              </button>
            )
          })}
          <button className={`btn btn-sm ${customRange ? 'btn-outline' : 'btn-ghost'}`} style={{ fontSize:11.5 }} onClick={() => { setCustomRange(true); setReportFrom(''); setReportTo('') }}>
            <Calendar size={12} /> Custom
          </button>
          {customRange && (
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <div className="form-group" style={{ margin:0 }}><label style={{ fontSize:10, fontWeight:600 }}>From</label><input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ width:140, fontSize:12 }} /></div>
              <div className="form-group" style={{ margin:0 }}><label style={{ fontSize:10, fontWeight:600 }}>To</label><input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ width:140, fontSize:12 }} /></div>
            </div>
          )}
          {(reportFrom || reportTo) && <span style={{ fontSize:11.5, color:'var(--primary)', fontWeight:700, marginLeft:4 }}>{periodLabel}</span>}
        </div>
      )}

      {/* ── DIRECTORY TAB ── */}
      {view === 'directory' && (
        <>
          {/* ── Directory Filter Bar ── */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius)', padding:'14px 16px', marginBottom:20, boxShadow:'var(--shadow)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <Search size={14} color="var(--primary)" />
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Filter Partners</span>
              {hasDirFilters && (
                <button className="btn btn-ghost btn-sm" onClick={clearDirFilters} style={{ marginLeft:'auto', fontSize:11, color:'var(--danger)', border:'1px solid var(--danger)', padding:'3px 10px' }}>
                  <X size={10} /> Clear All
                </button>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
              {/* Search */}
              <div style={{ gridColumn: 'span 2', minWidth:0 }}>
                <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Search</label>
                <div style={{ position:'relative' }}>
                  <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
                  <input value={dirSearch} onChange={e => setDirSearch(e.target.value)} placeholder="Name or mobile…" style={{ paddingLeft:32, fontSize:13, width:'100%' }} />
                </div>
              </div>
              {/* City */}
              <div>
                <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>City</label>
                <select value={dirFilterCity} onChange={e => { setDirFilterCity(e.target.value); setDirFilterSector(''); setDirFilterSociety('') }} style={{ fontSize:13, width:'100%' }}>
                  <option value="">All Cities</option>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {/* Sector */}
              <div>
                <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Sector</label>
                <select value={dirFilterSector} onChange={e => { setDirFilterSector(e.target.value); setDirFilterSociety('') }} disabled={!dirFilterCity} style={{ fontSize:13, width:'100%' }}>
                  <option value="">{dirFilterCity ? 'All Sectors' : 'Select city first'}</option>
                  {dirSectorOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {/* Society */}
              <div>
                <label style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Society</label>
                <select value={dirFilterSociety} onChange={e => setDirFilterSociety(e.target.value)} disabled={!dirFilterSector} style={{ fontSize:13, width:'100%' }}>
                  <option value="">{dirFilterSector ? 'All Societies' : 'Select sector first'}</option>
                  {dirSocietyOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* Active filter chips */}
            {hasDirFilters && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                {dirSearch && <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--primary-light)', color:'var(--primary)', fontSize:11.5, fontWeight:600, border:'1px solid rgba(232,82,26,0.2)' }}>"{dirSearch}" <button onClick={() => setDirSearch('')} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--primary)', padding:0, display:'flex' }}><X size={10} /></button></span>}
                {dirFilterCity && <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--primary-light)', color:'var(--primary)', fontSize:11.5, fontWeight:600, border:'1px solid rgba(232,82,26,0.2)' }}>{dirFilterCity} <button onClick={() => { setDirFilterCity(''); setDirFilterSector(''); setDirFilterSociety('') }} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--primary)', padding:0, display:'flex' }}><X size={10} /></button></span>}
                {dirFilterSector && <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--secondary-light)', color:'var(--secondary)', fontSize:11.5, fontWeight:600, border:'1px solid rgba(27,94,53,0.2)' }}>{dirFilterSector} <button onClick={() => { setDirFilterSector(''); setDirFilterSociety('') }} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--secondary)', padding:0, display:'flex' }}><X size={10} /></button></span>}
                {dirFilterSociety && <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--info-bg)', color:'var(--info)', fontSize:11.5, fontWeight:600, border:'1px solid rgba(59,130,246,0.2)' }}>{dirFilterSociety} <button onClick={() => setDirFilterSociety('')} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--info)', padding:0, display:'flex' }}><X size={10} /></button></span>}
              </div>
            )}
          </div>

          {/* Result count */}
          <div style={{ fontSize:12.5, color:'var(--text-muted)', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
            <span>Showing <strong style={{ color:'var(--text-primary)' }}>{filteredDirectoryPartners.length}</strong> of <strong>{partners.length}</strong> partners</span>
          </div>

          {/* Partner Cards Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
            {filteredDirectoryPartners.length === 0 ? (
              <div className="empty-state" style={{ gridColumn:'1/-1' }}>
                <div className="empty-icon"><Search size={22} /></div>
                <h3>{partners.length === 0 ? 'No pickup partners added' : 'No partners match your filters'}</h3>
                <p>{partners.length === 0 ? 'Add your first pickup partner to start assigning pickups.' : 'Try adjusting the city, sector, or society filter.'}</p>
                {hasDirFilters && <button className="btn btn-ghost btn-sm" onClick={clearDirFilters} style={{ marginTop:12 }}>Clear Filters</button>}
              </div>
            ) : filteredDirectoryPartners.map(k => {
              if (!k?.id) return null
              return (
                <div key={k.id} className="card">
                  <div className="card-body">
                    <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
                      <div style={{ width:48, height:48, background:'var(--secondary-light)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--secondary)', flexShrink:0 }}>
                        {(k.name||'?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                          {k.id && <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:800, color:'white', background:'var(--secondary)', padding:'2px 8px', borderRadius:5 }}>{k.id}</span>}
                          <div style={{ fontWeight:700, fontSize:15 }}>{k.name||'—'}</div>
                        </div>
                        <div style={{ fontSize:12.5, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><Phone size={11} /> {k.mobile||'—'}</div>
                        {k.email && <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><Mail size={11} /> {k.email}</div>}
                        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}><Star size={11} fill="var(--accent)" color="var(--accent)" /><span style={{ fontSize:12, fontWeight:600 }}>{k.rating??4.0}</span></div>
                      </div>
                      <div className="td-actions">
                        {can.viewPartnerReports && <button className="btn btn-ghost btn-icon btn-sm" title="Reports" onClick={() => { setSelectedK(k); setView('reports') }}><BarChart3 size={13} /></button>}
                        {can.editPartner && <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => open(k)}><Edit2 size={13} /></button>}
                        {can.deletePartner && <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => removeK(k.id)}><Trash2 size={13} /></button>}
                      </div>
                    </div>

                    {/* City + Coverage */}
                    {((Array.isArray(k.sectors) && k.sectors.length > 0) || k.city || k.area) && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                        <MapPin size={11} color="var(--text-muted)" style={{ marginTop:2, flexShrink:0 }} />
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {k.city && <span style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{k.city}</span>}
                          {(k.sectors||[]).map(s => <span key={s} style={{ background:'var(--secondary-light)', color:'var(--secondary)', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{s}</span>)}
                          {!(k.sectors?.length) && k.area && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{k.area}</span>}
                        </div>
                      </div>
                    )}

                    {/* Society tags */}
                    {(k.societies || []).length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:10 }}>
                        {(k.societies || []).slice(0, 4).map(s => (
                          <span key={s} style={{ background:'var(--bg)', color:'var(--text-secondary)', borderRadius:20, padding:'2px 8px', fontSize:10.5, fontWeight:500, border:'1px solid var(--border-light)' }}>{s}</span>
                        ))}
                        {k.societies.length > 4 && <span style={{ fontSize:10.5, color:'var(--text-muted)', padding:'2px 6px' }}>+{k.societies.length - 4} more</span>}
                      </div>
                    )}

                    <PartnerPaymentSummaryCards partner={k} raddiRecords={raddiRecords||[]} dateFrom="" dateTo="" />
                    <RateChartMini rateChart={k.rateChart} expanded={!!expandedRates[k.id]} onToggle={() => toggleRate(k.id)} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* REPORTS */}
      {view === 'reports' && can.viewPartnerReports && (
        <div>
          <div className="stat-grid" style={{ marginBottom:24 }}>
            <div className="stat-card green"><div className="stat-icon"><IndianRupee size={18}/></div><div className="stat-value">{fmtCurrency(totals.earnings)}</div><div className="stat-label">Received{selectedK ? ` — ${selectedK.name}` : ''}</div></div>
            <div className="stat-card red"><div className="stat-icon"><Clock size={18}/></div><div className="stat-value">{fmtCurrency(totals.pending)}</div><div className="stat-label">Pending{selectedK ? ` — ${selectedK.name}` : ''}</div></div>
            <div className="stat-card orange"><div className="stat-icon"><TrendingUp size={18}/></div><div className="stat-value">{fmtCurrency(totals.scrapValue)}</div><div className="stat-label">Scrap Value{selectedK ? ` — ${selectedK.name}` : ''}</div></div>
            <div className="stat-card blue"><div className="stat-icon"><CheckCircle size={18}/></div><div className="stat-value">{totals.pickups}</div><div className="stat-label">Pickups{selectedK ? ` — ${selectedK.name}` : ''}</div></div>
          </div>

          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
            <button className={`btn btn-sm ${!selectedK ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedK(null)}>All Partners</button>
            {partners.filter(Boolean).map(k => (
              <button key={k.id} className={`btn btn-sm ${selectedK?.id === k.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedK(k)}>{k.name}</button>
            ))}
          </div>

          {(selectedK ? [selectedK] : partners).filter(Boolean).map(k => {
            const liveRecords  = (raddiRecords||[]).filter(r => {
              if (r.kabadiwalaName !== k.name) return false
              if (reportFrom && (r.pickupDate||'') < reportFrom) return false
              if (reportTo   && (r.pickupDate||'') > reportTo)   return false
              return true
            })
            const liveTotal    = liveRecords.reduce((s, r) => s + (r.totalAmount||0), 0)
            const liveReceived = liveRecords.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount||0), 0)
            const livePending  = liveTotal - liveReceived

            return (
              <div key={k.id||k.name} className="card" style={{ marginBottom:20 }}>
                <div className="card-header" style={{ flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      {k.id && <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:800, color:'white', background:'var(--secondary)', padding:'2px 8px', borderRadius:5 }}>{k.id}</span>}
                      <div className="card-title">{k.name}</div>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                      {k.mobile}{k.email ? ` · ${k.email}` : ''}
                      {(reportFrom || reportTo) && <span style={{ marginLeft:8, color:'var(--primary)', fontWeight:600 }}>({periodLabel})</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:16, textAlign:'right', marginLeft:'auto' }}>
                    <div><div style={{ fontSize:18, fontWeight:700, color:'var(--secondary)', fontFamily:'var(--font-display)' }}>{fmtCurrency(liveReceived)}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Received</div></div>
                    <div><div style={{ fontSize:18, fontWeight:700, color:'var(--danger)', fontFamily:'var(--font-display)' }}>{fmtCurrency(livePending)}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Pending</div></div>
                    <div><div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-display)' }}>{liveRecords.length}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Pickups</div></div>
                  </div>
                  {can.editPartner && <button className="btn btn-ghost btn-sm" onClick={() => open(k)}><Edit2 size={12}/> Edit</button>}
                </div>
                <div>
                  <div style={{ padding:'10px 20px 6px', fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                    Monthly Breakdown <span style={{ fontSize:10.5, fontWeight:400, marginLeft:8, color:'var(--info)' }}>↓ Click row to see details</span>
                  </div>
                  <PartnerMonthlyReport partner={k} raddiRecords={raddiRecords||[]} pickups={pickups||[]} dateFrom={reportFrom} dateTo={reportTo} />
                </div>
                {k.rateChart && (
                  <div style={{ padding:'8px 20px 0' }}>
                    <RateChartMini rateChart={k.rateChart} expanded={!!expandedRates[`report-${k.id}`]} onToggle={() => setExpandedRates(prev => ({ ...prev, [`report-${k.id}`]: !prev[`report-${k.id}`] }))} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && renderModal()}
    </div>
  )
}