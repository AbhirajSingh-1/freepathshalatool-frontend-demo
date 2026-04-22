// Frontend/src/pages/Pickuppartners.jsx
// CHANGE: Added Active/Inactive status system + document uploads (photo, Aadhaar)
import { useState, useMemo, useCallback } from 'react'
import {
  Phone, Plus, Edit2, Trash2, X, Star, Mail,
  IndianRupee, AlertCircle,
  ChevronDown, ChevronUp, Package,
  MapPin, Search, Users, Building2, Layers,
  UserCheck, UserX, RefreshCw, Upload, Image, FileText,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'
import { fmtCurrency } from '../utils/helpers'
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

// ── Helper: is partner active? ────────────────────────────────────────────────
const isPartnerActive = (k) => k.isActive !== false  // undefined → active

// ── Rate Chart mini display ───────────────────────────────────────────────────
function RateChartMini({ rateChart, expanded, onToggle }) {
  if (!rateChart) return null
  const entries = Object.entries(rateChart).filter(([k, v]) => v > 0 && k !== 'Others')
  return (
    <div style={{ marginTop:12 }}>
      <button type="button" onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--secondary)', padding:0 }}>
        Rate Chart {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
      </button>
      {expanded && (
        <div style={{ marginTop:8, borderRadius:8, overflow:'hidden', border:'1px solid var(--border-light)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', padding:'5px 10px', background:'var(--secondary-light)', fontSize:10.5, fontWeight:700, color:'var(--secondary)', textTransform:'uppercase' }}>
            <span>Item</span><span style={{ textAlign:'right' }}>₹/kg</span>
          </div>
          {entries.map(([ item, rate], i) => (
            <div key={item} style={{ display:'grid', gridTemplateColumns:'1fr 80px', padding:'5px 10px', fontSize:12, borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', background: i%2===0 ? 'transparent' : 'var(--bg)' }}>
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
          <div key={item} style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'8px 10px', alignItems:'center', borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none', background: idx%2===0 ? 'transparent' : 'var(--bg)' }}>
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{item}</span>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text-muted)', pointerEvents:'none' }}>₹</span>
              <input type="number" min={0} step={0.5} inputMode="decimal" value={safe[item] ?? ''} onChange={e => onChange({ ...safe, [item]: parseFloat(e.target.value) || 0 })} style={{ width:'100%', padding:'5px 8px 5px 20px', fontSize:13, fontWeight:700, textAlign:'right', border:'1.5px solid var(--border)', borderRadius:6, background:'var(--surface)' }}/>
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

  const sectorOptions = useMemo(() => CITY_SECTORS[city || 'Gurgaon'] || [], [city])
  const availableSocieties = useMemo(() => {
    if (!safeSectors.length) return []
    if ((city || 'Gurgaon') === 'Gurgaon')
      return safeSectors.flatMap(s => (GURGAON_SOCIETIES || {})[s] || [])
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
    if (safeSocieties.includes(soc)) { onSocieties(safeSocieties.filter(s => s !== soc)) }
    else { if (safeSocieties.length >= 5) return; onSocieties([...safeSocieties, soc]) }
  }

  const addCustomSociety = () => {
    const trimmed = customSocInput.trim()
    if (!trimmed || safeSocieties.includes(trimmed) || safeSocieties.length >= 5) return
    onSocieties([...safeSocieties, trimmed]); setCustomSocInput('')
  }

  return (
    <div>
      <div className="form-group" style={{ margin:'0 0 12px' }}>
        <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Coverage Sectors <span className="required">*</span></span>
          <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>Max 2 ({safeSectors.length}/2)</span>
        </label>
        <div style={{ position:'relative' }}>
          <div onClick={() => setOpenSec(o => !o)} style={{ padding:'8px 12px', border:`1.5px solid ${openSec ? 'var(--secondary)' : 'var(--border)'}`, borderRadius:'var(--radius-sm)', cursor:'pointer', background:'var(--surface)', minHeight:42, display:'flex', alignItems:'center', flexWrap:'wrap', gap:6, boxShadow: openSec ? '0 0 0 3px rgba(27,94,53,0.12)' : 'none' }}>
            {safeSectors.length === 0 ? (
              <span style={{ color:'var(--text-muted)', fontSize:13 }}>Select up to 2 sectors…</span>
            ) : safeSectors.map(s => (
              <span key={s} style={{ background:'var(--secondary-light)', color:'var(--secondary)', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:5 }}>
                {s}<button type="button" onClick={e => { e.stopPropagation(); toggleSector(s) }} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--secondary)', padding:0, lineHeight:1 }}>×</button>
              </span>
            ))}
            <ChevronDown size={14} style={{ marginLeft:'auto', color:'var(--text-muted)', flexShrink:0, transform: openSec ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }}/>
          </div>
          {openSec && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:60, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-md)', overflow:'hidden' }}>
              <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border-light)' }}>
                <input autoFocus value={secSearch} onChange={e => setSecSearch(e.target.value)} placeholder="Search sectors…" style={{ width:'100%', fontSize:12.5, border:'1px solid var(--border)', borderRadius:6, padding:'5px 10px', outline:'none' }}/>
              </div>
              <div style={{ maxHeight:200, overflowY:'auto', padding:6 }}>
                {filteredSectors.map(s => {
                  const selected = safeSectors.includes(s)
                  const disabled = !selected && safeSectors.length >= 2
                  return (
                    <button key={s} type="button" onClick={() => { if (!disabled) toggleSector(s) }} style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:6, border:'none', background: selected ? 'var(--secondary-light)' : 'transparent', color: selected ? 'var(--secondary)' : disabled ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: selected ? 700 : 400, fontSize:12.5, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
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
        <div className="form-group" style={{ margin:0 }}>
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
                  <button key={soc} type="button" onClick={() => !disabled && toggleSociety(soc)} style={{ padding:'3px 10px', borderRadius:20, border:`1.5px solid ${selected ? 'var(--secondary)' : 'var(--border)'}`, background: selected ? 'var(--secondary-light)' : 'var(--surface)', color: selected ? 'var(--secondary)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: selected ? 700 : 400, fontSize:11.5, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace:'nowrap' }}>
                    {selected && '✓ '}{soc}
                  </button>
                )
              })}
            </div>
          )}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input value={customSocInput} onChange={e => setCustomSocInput(e.target.value)} onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addCustomSociety() } }} placeholder={safeSocieties.length >= 5 ? 'Max 5 reached' : 'Add a custom society…'} disabled={safeSocieties.length >= 5} style={{ flex:1, fontSize:13 }}/>
            <button type="button" onClick={addCustomSociety} disabled={!customSocInput.trim() || safeSocieties.length >= 5} className="btn btn-secondary btn-sm" style={{ flexShrink:0 }}>+ Add</button>
          </div>
          {safeSocieties.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
              {safeSocieties.map(soc => (
                <span key={soc} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--secondary-light)', color:'var(--secondary)', fontSize:11.5, fontWeight:600, border:'1px solid rgba(27,94,53,0.2)' }}>
                  {soc}<button type="button" onClick={() => toggleSociety(soc)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--secondary)', padding:0, lineHeight:1 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Executive sector search ───────────────────────────────────────────────────
function ExecutiveSectorSearch({ partners, onAddNew }) {
  const [city,    setCity]    = useState('Gurgaon')
  const [sector,  setSector]  = useState('')
  const [society, setSociety] = useState('')

  const sectorOptions  = CITY_SECTORS[city] || []
  const societyOptions = useMemo(() => {
    if (city === 'Gurgaon' && sector && GURGAON_SOCIETIES[sector]) return GURGAON_SOCIETIES[sector]
    return []
  }, [city, sector])

  const activePartners = useMemo(() => partners.filter(isPartnerActive), [partners])

  const matchingPartners = useMemo(() => {
    if (!sector) return []
    return activePartners.filter(p => {
      const secs = Array.isArray(p.sectors) ? p.sectors : []
      const socs = Array.isArray(p.societies) ? p.societies : []
      return secs.includes(sector) || (society && socs.includes(society))
    })
  }, [activePartners, sector, society])

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600 }}>Find Your Pickup Partner</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Select your area to find the assigned pickup partner</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAddNew}><Plus size={14}/> Add Partner</button>
      </div>

      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header" style={{ background:'var(--primary-light)' }}>
          <MapPin size={16} color="var(--primary)"/>
          <div className="card-title" style={{ color:'var(--primary)' }}>Search by Area</div>
        </div>
        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
            {[
              { step:'1', label:'City', content:(<select value={city} onChange={e => { setCity(e.target.value); setSector(''); setSociety('') }} style={{ width:'100%', fontSize:13 }}>{CITIES.map(c => <option key={c}>{c}</option>)}</select>) },
              { step:'2', label:'Sector / Area', content:(<select value={sector} onChange={e => { setSector(e.target.value); setSociety('') }} disabled={!city} style={{ width:'100%', fontSize:13 }}><option value="">— Select Sector —</option>{sectorOptions.map(s => <option key={s}>{s}</option>)}</select>) },
              { step:'3', label:'Society (optional)', content: societyOptions.length > 0 ? (
                <select value={society} onChange={e => setSociety(e.target.value)} disabled={!sector} style={{ width:'100%', fontSize:13 }}>
                  <option value="">— All societies —</option>
                  {societyOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              ) : (<input value={society} onChange={e => setSociety(e.target.value)} placeholder={sector ? 'Type society…' : 'Select sector first'} disabled={!sector} style={{ width:'100%', fontSize:13 }}/>) },
            ].map(({ step, label, content }) => (
              <div key={step}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--primary)', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{step}</div>
                  <label style={{ margin:0, fontSize:12.5, fontWeight:700, color:'var(--text-secondary)' }}>{label}</label>
                </div>
                {content}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!sector ? (
        <div style={{ padding:'48px 24px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
          <MapPin size={36} color="var(--border)" style={{ display:'block', margin:'0 auto 12px' }}/>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:4, color:'var(--text-secondary)' }}>Select your sector to continue</div>
          <div>Your assigned pickup partner's contact will appear here.</div>
        </div>
      ) : matchingPartners.length === 0 ? (
        <div className="empty-state" style={{ padding:40 }}>
          <div className="empty-icon"><Users size={22}/></div>
          <h3>No partner assigned yet</h3>
          <p>No active pickup partner covers {sector}{society ? ` / ${society}` : ''} yet.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {matchingPartners.map(k => (
            <div key={k.id} className="card" style={{ borderLeft:'3px solid var(--secondary)' }}>
              <div className="card-body">
                <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:12 }}>
                  {k.photo ? (
                    <img src={k.photo} alt={k.name} style={{ width:48, height:48, borderRadius:12, objectFit:'cover', flexShrink:0, border:'2px solid var(--secondary-light)' }} />
                  ) : (
                    <div style={{ width:48, height:48, background:'var(--secondary-light)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--secondary)', flexShrink:0 }}>
                      {(k.name||'?')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{k.name}</div>
                    <div style={{ fontSize:12.5, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><Phone size={11}/> {k.mobile||'—'}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}><Star size={11} fill="var(--accent)" color="var(--accent)"/><span style={{ fontSize:12, fontWeight:600 }}>{k.rating??4.0}</span></div>
                  </div>
                </div>
                <div style={{ background:'var(--secondary-light)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--secondary)', textTransform:'uppercase', marginBottom:4 }}>Call for Pickup</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--secondary)', fontFamily:'var(--font-display)' }}>{k.mobile}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Per-partner payment summary ───────────────────────────────────────────────
function PartnerPaymentSummaryCards({ partner, raddiRecords }) {
  const stats = useMemo(() => {
    if (!partner?.name || !Array.isArray(raddiRecords)) return { totalPickups:0, totalAmount:0, received:0, pending:0 }
    const records = raddiRecords.filter(r => r.PickupPartnerName === partner.name)
    const totalAmount = records.reduce((s, r) => s + (r.totalAmount||0), 0)
    const received    = records.filter(r => r.paymentStatus === 'Received').reduce((s, r) => s + (r.totalAmount||0), 0)
    return { totalPickups:records.length, totalAmount, received, pending: totalAmount - received }
  }, [raddiRecords, partner?.name])

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:12, padding:'10px', background:'var(--bg)', borderRadius:10, border:'1px solid var(--border-light)' }}>
      {[
        { label:'Pickups',     value:stats.totalPickups,             color:'var(--text-primary)', icon:Package },
        { label:'Total (₹)',   value:fmtCurrency(stats.totalAmount), color:'var(--primary)',       icon:IndianRupee },
        { label:'Pending (₹)', value:fmtCurrency(stats.pending),     color: stats.pending > 0 ? 'var(--danger)' : 'var(--secondary)', icon:AlertCircle },
      ].map(item => {
        const Icon = item.icon
        return (
          <div key={item.label} style={{ textAlign:'center', padding:'6px 4px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}><Icon size={13} color={item.color}/></div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:item.color, lineHeight:1 }}>{item.value}</div>
            <div style={{ fontSize:9.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Document upload field ─────────────────────────────────────────────────────
function DocUpload({ label, icon: Icon, value, accept, onChange, onRemove, preview = false }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={12} color="var(--info)" />{label}
        <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span>
      </label>
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {preview ? (
            <img src={value} alt={label} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1.5px solid var(--border)', display: 'block' }} />
          ) : (
            <div style={{ padding: '8px 12px', background: 'var(--info-bg)', borderRadius: 8, border: '1px solid var(--info)', fontSize: 12, color: 'var(--info)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={13} /> Document uploaded ✓
            </div>
          )}
          <button type="button" onClick={onRemove}
            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
            <X size={10} />
          </button>
        </div>
      ) : (
        <label className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', cursor: 'pointer' }}>
          <Upload size={13} /> Upload {label}
          <input type="file" accept={accept} style={{ display: 'none' }} onChange={onChange} />
        </label>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function PickupPartners() {
  const { PickupPartners: rawPartners, raddiRecords, addPartner, updatePartner, deletePartner } = useApp()
  const { can, role } = useRole()

  const partners = useMemo(() => Array.isArray(rawPartners) ? rawPartners : [], [rawPartners])

  // ── Status tab ────────────────────────────────────────────────────────────
  const [statusTab, setStatusTab] = useState('active') // 'active' | 'inactive'

  const activeCount   = useMemo(() => partners.filter(isPartnerActive).length,  [partners])
  const inactiveCount = useMemo(() => partners.filter(p => !isPartnerActive(p)).length, [partners])

  const togglePartnerStatus = useCallback(async (k) => {
    try { await updatePartner(k.id, { isActive: !isPartnerActive(k) }) }
    catch (e) { console.error('Status toggle error:', e) }
  }, [updatePartner])

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal,          setModal]          = useState(false)
  const [form,           setForm]           = useState({
    name:'', mobile:'', email:'', city:'Gurgaon',
    sectors:[], societies:[], area:'',
    rateChart:{ ...DEFAULT_RATE_CHART },
    photo: null,
    aadhaarDoc: null,
  })
  const [editing,        setEditing]        = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [expandedRates,  setExpandedRates]  = useState({})
  const [showRateEditor, setShowRateEditor] = useState(false)
  const [error,          setError]          = useState('')

  // Directory filters
  const [dirSearch,        setDirSearch]        = useState('')
  const [dirFilterCity,    setDirFilterCity]    = useState('')
  const [dirFilterSector,  setDirFilterSector]  = useState('')
  const [dirFilterSociety, setDirFilterSociety] = useState('')

  const dirSectorOptions  = useMemo(() => dirFilterCity ? (CITY_SECTORS[dirFilterCity]||[]) : [], [dirFilterCity])
  const dirSocietyOptions = useMemo(() => {
    if (!dirFilterCity || !dirFilterSector) return []
    if (dirFilterCity === 'Gurgaon' && GURGAON_SOCIETIES[dirFilterSector]) return GURGAON_SOCIETIES[dirFilterSector]
    return []
  }, [dirFilterCity, dirFilterSector])

  // ── Filtered partners (includes status tab filter) ────────────────────────
  const filteredPartners = useMemo(() => {
    const q = dirSearch.toLowerCase().trim()
    return partners.filter(k => {
      const matchSearch  = !q || k.name?.toLowerCase().includes(q) || k.mobile?.includes(q)
      const matchCity    = !dirFilterCity    || k.city   === dirFilterCity
      const matchSector  = !dirFilterSector  || (k.sectors  ||[]).includes(dirFilterSector)
      const matchSociety = !dirFilterSociety || (k.societies||[]).includes(dirFilterSociety)
      const matchStatus  = statusTab === 'active' ? isPartnerActive(k) : !isPartnerActive(k)
      return matchSearch && matchCity && matchSector && matchSociety && matchStatus
    })
  }, [partners, dirSearch, dirFilterCity, dirFilterSector, dirFilterSociety, statusTab])

  const hasDirFilters = dirSearch || dirFilterCity || dirFilterSector || dirFilterSociety
  const clearDirFilters = () => { setDirSearch(''); setDirFilterCity(''); setDirFilterSector(''); setDirFilterSociety('') }

  // ── Document upload handlers ──────────────────────────────────────────────
  const handleFileUpload = (key, previewMode = false) => (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, [key]: ev.target.result }))
    reader.readAsDataURL(file)
    e.target.value = '' // reset so same file can be re-uploaded
  }

  // ── Modal open/close ──────────────────────────────────────────────────────
  const open = useCallback((k = null) => {
    setEditing(k); setError(''); setShowRateEditor(false)
    if (k) {
      setForm({
        name: k.name||'', mobile: k.mobile||'', email: k.email||'',
        city: k.city||'Gurgaon', sectors: Array.isArray(k.sectors)?[...k.sectors]:[],
        societies: Array.isArray(k.societies)?[...k.societies]:[], area: k.area||'',
        rateChart: { ...DEFAULT_RATE_CHART, ...(k.rateChart||{}) },
        photo: k.photo || null, aadhaarDoc: k.aadhaarDoc || null,
      })
    } else {
      setForm({ name:'', mobile:'', email:'', city:'Gurgaon', sectors:[], societies:[], area:'', rateChart:{ ...DEFAULT_RATE_CHART }, photo: null, aadhaarDoc: null })
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
    try { await deletePartner(id) } catch (err) { console.error(err) }
  }, [can.deletePartner, deletePartner])

  const toggleRate = useCallback((id) => setExpandedRates(prev => ({ ...prev, [id]: !prev[id] })), [])

  const isExecutive = role === 'executive'

  // ── Modal JSX ─────────────────────────────────────────────────────────────
  function renderModal() {
    return (
      <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal modal-lg" style={{ maxWidth:720, width:'95vw' }}>
          <div className="modal-header">
            <div className="modal-title">{editing ? 'Edit Pickup Partner' : 'Add Pickup Partner'}</div>
            {editing?.id && <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:800, color:'white', background:'var(--secondary)', padding:'2px 8px', borderRadius:5 }}>{editing.id}</span>}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={close}><X size={16}/></button>
          </div>
          <div className="modal-body" style={{ overflowY:'auto', maxHeight:'76vh' }}>
            {error && <div className="alert-strip alert-danger" style={{ marginBottom:16 }}><AlertCircle size={13}/>{error}</div>}

            {/* Basic Info */}
            <div className="form-grid" style={{ marginBottom:16 }}>
              <div className="form-group"><label>Name <span className="required">*</span></label><input value={form.name||''} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Partner full name" autoFocus/></div>
              <div className="form-group"><label>Mobile <span className="required">*</span></label><input value={form.mobile||''} onChange={e => setForm(f=>({...f,mobile:e.target.value}))} placeholder="10-digit number" maxLength={10} inputMode="numeric"/></div>
              <div className="form-group full"><label>Email <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)', marginLeft:4 }}>(optional)</span></label><input type="email" value={form.email||''} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="partner@example.com"/></div>
            </div>

            {/* Documents section */}
            <div style={{ marginBottom:16, padding:14, background:'var(--info-bg)', borderRadius:10, border:'1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontWeight:700, fontSize:13.5, color:'var(--info)', marginBottom:3, display:'flex', alignItems:'center', gap:6 }}>
                <FileText size={14} /> Documents
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>
                Upload for verification and records — not mandatory.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <DocUpload
                  label="Partner Photo"
                  icon={Image}
                  value={form.photo}
                  accept="image/*"
                  preview
                  onChange={handleFileUpload('photo', true)}
                  onRemove={() => setForm(f => ({ ...f, photo: null }))}
                />
                <DocUpload
                  label="Aadhaar Card"
                  icon={FileText}
                  value={form.aadhaarDoc}
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload('aadhaarDoc')}
                  onRemove={() => setForm(f => ({ ...f, aadhaarDoc: null }))}
                />
              </div>
            </div>

            {/* Coverage area */}
            <div style={{ marginBottom:16, padding:14, background:'var(--bg)', borderRadius:10, border:'1px solid var(--border-light)' }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:4 }}>Coverage Area</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Select city, up to 3 sectors, and up to 5 societies.</div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label style={{ display:'flex', alignItems:'center', gap:5 }}><Building2 size={12} color="var(--primary)"/> City <span className="required">*</span></label>
                <select value={form.city||'Gurgaon'} onChange={e => setForm(f=>({...f,city:e.target.value,sectors:[],societies:[]}))} style={{ fontSize:13 }}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <CoverageSelector city={form.city||'Gurgaon'} sectors={form.sectors||[]} societies={form.societies||[]} onSectors={s => setForm(f=>({...f,sectors:s}))} onSocieties={s => setForm(f=>({...f,societies:s}))}/>
            </div>

            {/* Rate chart */}
            <div style={{ marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div><div style={{ fontWeight:700, fontSize:14 }}>Rate Chart</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>Per-kg rates for each RST item</div></div>
                <button type="button" onClick={() => setShowRateEditor(v=>!v)} className={`btn btn-sm ${showRateEditor?'btn-outline':'btn-ghost'}`}>
                  {showRateEditor ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}{showRateEditor ? 'Hide' : 'Edit Rates'}
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
              {showRateEditor && <RateChartEditor rateChart={form.rateChart||DEFAULT_RATE_CHART} onChange={rc => setForm(f=>({...f,rateChart:rc}))}/>}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving||!form.name?.trim()||!form.mobile?.trim()}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Pickup Partner'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Executive view ────────────────────────────────────────────────────────
  if (isExecutive) {
    return (
      <div className="page-body">
        <ExecutiveSectorSearch partners={partners} onAddNew={() => open()}/>
        {modal && renderModal()}
      </div>
    )
  }

  // ── Admin / Manager: Directory ────────────────────────────────────────────
  return (
    <div className="page-body">

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 }}>Pickup Partner Directory</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{partners.length} partner{partners.length !== 1 ? 's' : ''} total</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => open()}>
          <Plus size={14}/> Add Pickup Partner
        </button>
      </div>

      {/* Active / Inactive status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <button
          className={`btn btn-sm ${statusTab === 'active' ? 'btn-secondary' : 'btn-ghost'}`}
          onClick={() => setStatusTab('active')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', fontSize: 13 }}
        >
          <UserCheck size={14} />
          Active Partners
          <span style={{ background: statusTab === 'active' ? 'rgba(255,255,255,0.3)' : 'var(--border)', color: statusTab === 'active' ? 'white' : 'var(--text-muted)', borderRadius: 20, fontSize: 10.5, padding: '1px 8px', fontWeight: 700 }}>
            {activeCount}
          </span>
        </button>
        <button
          className={`btn btn-sm ${statusTab === 'inactive' ? 'btn-danger' : 'btn-ghost'}`}
          onClick={() => setStatusTab('inactive')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', fontSize: 13 }}
        >
          <UserX size={14} />
          Inactive Partners
          <span style={{ background: statusTab === 'inactive' ? 'rgba(255,255,255,0.3)' : 'var(--border)', color: statusTab === 'inactive' ? 'white' : 'var(--text-muted)', borderRadius: 20, fontSize: 10.5, padding: '1px 8px', fontWeight: 700 }}>
            {inactiveCount}
          </span>
        </button>
      </div>

      {/* Inactive notice */}
      {statusTab === 'inactive' && inactiveCount === 0 && (
        <div className="alert-strip alert-success" style={{ marginBottom: 16 }}>
          <UserCheck size={14} /> All pickup partners are currently active.
        </div>
      )}
      {statusTab === 'inactive' && inactiveCount > 0 && (
        <div className="alert-strip alert-warning" style={{ marginBottom: 16 }}>
          <UserX size={14} />
          <span><strong>{inactiveCount} partner{inactiveCount > 1 ? 's' : ''}</strong> marked inactive. Use "Reactivate" to restore them to the active pool.</span>
        </div>
      )}

      {/* Directory filters */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius)', padding:'14px 16px', marginBottom:20, boxShadow:'var(--shadow)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <Search size={14} color="var(--primary)"/>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Filter Partners</span>
          {hasDirFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearDirFilters} style={{ marginLeft:'auto', fontSize:11, color:'var(--danger)', border:'1px solid var(--danger)', padding:'3px 10px' }}>
              <X size={10}/> Clear All
            </button>
          )}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
          <div style={{ gridColumn:'span 2', minWidth:0 }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              <input value={dirSearch} onChange={e => setDirSearch(e.target.value)} placeholder="Name or mobile…" style={{ paddingLeft:32, fontSize:13, width:'100%' }}/>
            </div>
          </div>
          <select value={dirFilterCity} onChange={e => { setDirFilterCity(e.target.value); setDirFilterSector(''); setDirFilterSociety('') }} style={{ fontSize:13 }}>
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={dirFilterSector} onChange={e => { setDirFilterSector(e.target.value); setDirFilterSociety('') }} disabled={!dirFilterCity} style={{ fontSize:13 }}>
            <option value="">{dirFilterCity ? 'All Sectors' : 'Select city first'}</option>
            {dirSectorOptions.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={dirFilterSociety} onChange={e => setDirFilterSociety(e.target.value)} disabled={!dirFilterSector} style={{ fontSize:13 }}>
            <option value="">{dirFilterSector ? 'All Societies' : 'Select sector first'}</option>
            {dirSocietyOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Result count */}
      <div style={{ fontSize:12.5, color:'var(--text-muted)', marginBottom:14 }}>
        Showing <strong style={{ color:'var(--text-primary)' }}>{filteredPartners.length}</strong> {statusTab} partner{filteredPartners.length !== 1 ? 's' : ''}
        {hasDirFilters && <span> (filtered)</span>}
      </div>

      {/* Partner cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
        {filteredPartners.length === 0 ? (
          <div className="empty-state" style={{ gridColumn:'1/-1' }}>
            <div className="empty-icon">
              {statusTab === 'inactive' ? <UserX size={22}/> : <Search size={22}/>}
            </div>
            <h3>
              {statusTab === 'inactive'
                ? 'No Inactive Partners'
                : partners.length === 0 ? 'No pickup partners added' : 'No partners match your filters'}
            </h3>
            <p>
              {statusTab === 'inactive'
                ? 'All partners are currently active.'
                : partners.length === 0 ? 'Add your first pickup partner to get started.' : 'Try adjusting the filters.'}
            </p>
            {hasDirFilters && <button className="btn btn-ghost btn-sm" onClick={clearDirFilters} style={{ marginTop:12 }}>Clear Filters</button>}
          </div>
        ) : filteredPartners.map(k => {
          if (!k?.id) return null
          const active = isPartnerActive(k)
          return (
            <div key={k.id} className="card" style={{ borderLeft: `3px solid ${active ? 'var(--secondary)' : 'var(--border)'}`, opacity: active ? 1 : 0.8 }}>
              <div className="card-body">
                <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
                  {/* Avatar or photo */}
                  {k.photo ? (
                    <img src={k.photo} alt={k.name} style={{ width:48, height:48, borderRadius:12, objectFit:'cover', flexShrink:0, border:'2px solid var(--secondary-light)' }} />
                  ) : (
                    <div style={{ width:48, height:48, background: active ? 'var(--secondary-light)' : 'var(--border-light)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color: active ? 'var(--secondary)' : 'var(--text-muted)', flexShrink:0 }}>
                      {(k.name||'?')[0].toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                      {k.id && <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:800, color:'white', background: active ? 'var(--secondary)' : 'var(--text-muted)', padding:'2px 8px', borderRadius:5 }}>{k.id}</span>}
                      <div style={{ fontWeight:700, fontSize:15 }}>{k.name||'—'}</div>
                      {/* Status badge */}
                      <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:700, background: active ? 'var(--secondary-light)' : 'var(--danger-bg)', color: active ? 'var(--secondary)' : 'var(--danger)' }}>
                        {active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><Phone size={11}/> {k.mobile||'—'}</div>
                    {k.email && <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><Mail size={11}/> {k.email}</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:3 }}><Star size={11} fill="var(--accent)" color="var(--accent)"/><span style={{ fontSize:12, fontWeight:600 }}>{k.rating??4.0}</span></div>
                      {/* Aadhaar indicator */}
                      {k.aadhaarDoc && (
                        <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:'var(--info-bg)', color:'var(--info)', fontWeight:600, border:'1px solid rgba(59,130,246,0.2)' }}>
                          📄 Aadhaar ✓
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                    {can.editPartner && <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => open(k)}><Edit2 size={13}/></button>}
                    {can.deletePartner && <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => removeK(k.id)}><Trash2 size={13}/></button>}
                  </div>
                </div>

                {/* Coverage */}
                {((Array.isArray(k.sectors) && k.sectors.length > 0) || k.city || k.area) && (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                    <MapPin size={11} color="var(--text-muted)" style={{ marginTop:2, flexShrink:0 }}/>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {k.city && <span style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{k.city}</span>}
                      {(k.sectors||[]).map(s => <span key={s} style={{ background:'var(--secondary-light)', color:'var(--secondary)', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{s}</span>)}
                      {!(k.sectors?.length) && k.area && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{k.area}</span>}
                    </div>
                  </div>
                )}

                {/* Society tags */}
                {(k.societies||[]).length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:10 }}>
                    {(k.societies||[]).slice(0,4).map(s => (
                      <span key={s} style={{ background:'var(--bg)', color:'var(--text-secondary)', borderRadius:20, padding:'2px 8px', fontSize:10.5, fontWeight:500, border:'1px solid var(--border-light)' }}>{s}</span>
                    ))}
                    {k.societies.length > 4 && <span style={{ fontSize:10.5, color:'var(--text-muted)', padding:'2px 6px' }}>+{k.societies.length - 4} more</span>}
                  </div>
                )}

                <PartnerPaymentSummaryCards partner={k} raddiRecords={raddiRecords||[]}/>
                <RateChartMini rateChart={k.rateChart} expanded={!!expandedRates[k.id]} onToggle={() => toggleRate(k.id)}/>

                {/* Status toggle button — Admin only */}
{role === 'admin' && (
  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
    <button
      onClick={() => togglePartnerStatus(k)}
      className={`btn btn-sm ${active ? 'btn-ghost' : 'btn-secondary'}`}
      style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: 12.5 }}
    >
      {active ? (
        <><UserX size={13} /> Mark Inactive</>
      ) : (
        <><RefreshCw size={13} /> Reactivate Partner</>
      )}
    </button>
  </div>
)}
              </div>
            </div>
          )
        })}
      </div>

      {modal && renderModal()}
    </div>
  )
}