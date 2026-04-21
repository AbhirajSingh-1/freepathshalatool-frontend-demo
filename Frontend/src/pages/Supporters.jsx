// Frontend/src/pages/Supporters.jsx
// Simplified Supporters Management Page
// • Status is auto-calculated from Date (no manual edit)
// • Stat cards are clickable to filter by status
// • Contribution is free-text input (no dropdown)
// • Date field simplified label
import { useState, useMemo } from 'react'
import {
  Heart, Search, Plus, Edit2, Trash2, X,
  Phone, MapPin, Clock, CheckCircle, AlertCircle,
  UserX, Download, Users, Calendar, SlidersHorizontal,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, exportToExcel } from '../utils/helpers'
import { CITIES, CITY_SECTORS } from '../data/mockData'
import { differenceInDays, parseISO } from 'date-fns'
import SocietyInput from '../components/SocietyInput'

// ── Independent supporter status — based on lastSupportDate only ─────────────
function getSupporterStatus(lastSupportDate) {
  if (!lastSupportDate) return 'New'
  const days = differenceInDays(new Date(), parseISO(lastSupportDate))
  if (days <= 60)  return 'Active'
  if (days <= 120) return 'At Risk'
  return 'Inactive'
}

const STATUS_CONFIG = {
  'New':      { color: 'var(--info)',      bg: 'var(--info-bg)',         icon: Users,       label: 'New' },
  'Active':   { color: 'var(--secondary)', bg: 'var(--secondary-light)', icon: CheckCircle, label: 'Active' },
  'At Risk':  { color: 'var(--warning)',   bg: 'var(--warning-bg)',      icon: AlertCircle, label: 'At Risk' },
  'Inactive': { color: 'var(--danger)',    bg: 'var(--danger-bg)',       icon: UserX,       label: 'Inactive' },
}

const EMPTY_FORM = {
  name: '', mobile: '', house: '', city: 'Gurgaon', sector: '', society: '',
  contributionType: '', lastSupportDate: '', notes: '',
  isAlsoDonor: false,
}

// ── Role icon badges ──────────────────────────────────────────────────────────
function RoleIcon({ donorType, size = 15 }) {
  if (donorType === 'both') {
    return (
      <span title="RST/SKS Donor + Supporter"
        style={{ fontSize: size, cursor: 'help', flexShrink: 0, letterSpacing: 1 }}>
        👍❤️
      </span>
    )
  }
  return (
    <span title="Supporter" style={{ fontSize: size, cursor: 'help', flexShrink: 0 }}>
      ❤️
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG['New']
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      <Icon size={10} />{cfg.label}
    </span>
  )
}

// ── Clickable KPI stat card ───────────────────────────────────────────────────
function KpiCard({ tone, icon: Icon, value, label, sub, isActive, onClick }) {
  return (
    <div
      className={`stat-card ${tone}`}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        outline: isActive ? '3px solid currentColor' : 'none',
        outlineOffset: 2,
        transition: 'all 0.15s',
        transform: isActive ? 'translateY(-2px)' : 'none',
        boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow)',
      }}
      title={isActive ? 'Click to clear filter' : `Click to filter by ${label}`}
    >
      <div className="stat-icon"><Icon size={18} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-change up">{sub}</div>}
    </div>
  )
}

export default function Supporters() {
  const { donors, addDonor, updateDonor, deleteDonor } = useApp()

  const [modal,        setModal]        = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [errors,       setErrors]       = useState({})
  const [expanded,     setExpanded]     = useState({})

  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')   // driven by KPI card clicks
  const [filterType,   setFilterType]   = useState('all')
  const [filterCity,   setFilterCity]   = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [showFilters,  setShowFilters]  = useState(false)

  const sectorOptions = useMemo(() => filterCity ? (CITY_SECTORS[filterCity] || []) : [], [filterCity])
  const formSectors   = CITY_SECTORS[form.city] || []

  // ── Pull only supporters from donors array ────────────────────────────────
  const supporters = useMemo(() =>
    donors
      .filter(d => d.donorType === 'supporter' || d.donorType === 'both')
      .map(d => ({
        ...d,
        supporterStatus:  getSupporterStatus(d.lastSupportDate),
        effectiveContrib: d.contributionType || d.supportContribution || '',
      })),
    [donors]
  )

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const c = { total: supporters.length, New: 0, Active: 0, 'At Risk': 0, Inactive: 0, both: 0, supporter: 0 }
    supporters.forEach(d => {
      c[d.supporterStatus] = (c[d.supporterStatus] || 0) + 1
      if (d.donorType === 'both')      c.both++
      if (d.donorType === 'supporter') c.supporter++
    })
    return c
  }, [supporters])

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return supporters.filter(d => {
      const mSearch = !q || d.name.toLowerCase().includes(q) || (d.mobile || '').includes(q) || (d.society || '').toLowerCase().includes(q) || (d.id || '').toLowerCase().includes(q)
      const mStatus = filterStatus === 'all' || d.supporterStatus === filterStatus
      const mType   = filterType   === 'all' || d.donorType       === filterType
      const mCity   = !filterCity   || d.city   === filterCity
      const mSector = !filterSector || d.sector === filterSector
      return mSearch && mStatus && mType && mCity && mSector
    })
  }, [supporters, search, filterStatus, filterType, filterCity, filterSector])

  const hasFilters = filterCity || filterSector || filterType !== 'all'

  // ── KPI card click → toggle filter ───────────────────────────────────────
  const handleKpiClick = (status) => {
    setFilterStatus(prev => prev === status ? 'all' : status)
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openModal = (s = null) => {
    setEditing(s)
    setErrors({})
    setForm(s ? {
      name:             s.name || '',
      mobile:           s.mobile || '',
      house:            s.house || '',
      city:             s.city || 'Gurgaon',
      sector:           s.sector || '',
      society:          s.society || '',
      contributionType: s.contributionType || s.supportContribution || '',
      lastSupportDate:  s.lastSupportDate || '',
      notes:            s.notes || '',
      isAlsoDonor:      s.donorType === 'both',
    } : EMPTY_FORM)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const setField = (key, val) => {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'city')   { next.sector = ''; next.society = '' }
      if (key === 'sector') { next.society = '' }
      return next
    })
    setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())   e.name   = 'Name is required'
    if (!form.mobile.trim() || form.mobile.length < 10) e.mobile = 'Valid 10-digit mobile required'
    return e
  }

  const save = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        donorType:           form.isAlsoDonor ? 'both' : 'supporter',
        supportContribution: form.contributionType,
      }
      delete payload.isAlsoDonor
      editing ? await updateDonor(editing.id, payload) : await addDonor(payload)
      closeModal()
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Remove this supporter?')) return
    await deleteDonor(id)
  }

  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleExport = () => {
    exportToExcel(filtered.map(d => ({
      'ID':                d.id,
      'Name':              d.name,
      'Mobile':            d.mobile || '—',
      'Role':              d.donorType === 'both' ? 'Donor + Supporter' : 'Supporter',
      'Contribution':      d.effectiveContrib || '—',
      'Date':              d.lastSupportDate ? fmtDate(d.lastSupportDate) : '—',
      'Supporter Status':  d.supporterStatus,
      'City':              d.city || '—',
      'Sector':            d.sector || '—',
      'Society':           d.society || '—',
      'Notes':             d.notes || '—',
    })), 'Supporters_Export')
  }

  const previewStatus = form.lastSupportDate ? getSupporterStatus(form.lastSupportDate) : null
  const previewCfg    = previewStatus ? STATUS_CONFIG[previewStatus] : null

  // ── Active filter label ───────────────────────────────────────────────────
  const activeFilterCfg = filterStatus !== 'all' ? STATUS_CONFIG[filterStatus] : null

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-body">

      {/* ── Header banner ── */}
      <div style={{ marginBottom: 20, padding: '14px 18px', background: 'linear-gradient(135deg,#FDE7DA 0%,var(--secondary-light) 100%)', borderRadius: 'var(--radius)', border: '1px solid rgba(232,82,26,0.15)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Heart size={20} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>Supporters &amp; Contributors</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            People who support FreePathshala with money, goods, clothes, or other contributions.
            Status is automatic — Active (≤ 60d) · At Risk (61–120d) · Inactive (&gt; 120d)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            <Download size={13} /> Export ({filtered.length})
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
            <Plus size={13} /> Add New Supporter
          </button>
        </div>
      </div>

      {/* ── Clickable KPI Cards — click to filter by status ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <KpiCard
          tone="orange" icon={Heart}
          value={kpis.total} label="Total Supporters"
          sub={`${kpis.both} also RST/SKS donors`}
          isActive={filterStatus === 'all' && false}  // "total" doesn't filter, just shows count
          onClick={() => setFilterStatus('all')}
        />
        <KpiCard
          tone="green" icon={CheckCircle}
          value={kpis['Active'] || 0} label="Active (≤ 60 days)"
          isActive={filterStatus === 'Active'}
          onClick={() => handleKpiClick('Active')}
        />
        <KpiCard
          tone="yellow" icon={AlertCircle}
          value={kpis['At Risk'] || 0} label="At Risk (61–120 days)"
          isActive={filterStatus === 'At Risk'}
          onClick={() => handleKpiClick('At Risk')}
        />
        <KpiCard
          tone="red" icon={UserX}
          value={kpis['Inactive'] || 0} label="Inactive (> 120 days)"
          isActive={filterStatus === 'Inactive'}
          onClick={() => handleKpiClick('Inactive')}
        />
      </div>

      {/* ── Active status filter pill ── */}
      {activeFilterCfg && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10, background: activeFilterCfg.bg, border: `1px solid ${activeFilterCfg.color}33` }}>
          <activeFilterCfg.icon size={14} color={activeFilterCfg.color} />
          <span style={{ fontSize: 13, fontWeight: 700, color: activeFilterCfg.color }}>Filtering: {activeFilterCfg.label}</span>
          <span style={{ fontSize: 12.5, color: activeFilterCfg.color, opacity: 0.8 }}>
            — {kpis[filterStatus] || 0} supporter{(kpis[filterStatus] || 0) !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setFilterStatus('all')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: activeFilterCfg.color, display: 'flex', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Search + filters ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input placeholder="Search name, mobile, society, ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, width: '100%', fontSize: 13 }} />
          </div>
          <button
            className={`btn btn-sm ${showFilters ? 'btn-outline' : 'btn-ghost'}`}
            onClick={() => setShowFilters(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <SlidersHorizontal size={13} />
            {hasFilters
              ? <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {[filterType !== 'all', filterCity, filterSector].filter(Boolean).length}
                </span>
              : 'Filters'}
          </button>
        </div>

        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8, background: 'var(--bg)', borderRadius: 10, padding: 10, border: '1px solid var(--border-light)' }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="all">All Roles</option>
              <option value="supporter">❤️ Supporter Only</option>
              <option value="both">👍❤️ Donor + Supporter</option>
            </select>
            <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterSector('') }} style={{ fontSize: 12.5 }}>
              <option value="">All Cities</option>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)} disabled={!filterCity} style={{ fontSize: 12.5 }}>
              <option value="">{filterCity ? 'All Sectors' : 'Select city first'}</option>
              {sectorOptions.map(s => <option key={s}>{s}</option>)}
            </select>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                onClick={() => { setFilterType('all'); setFilterCity(''); setFilterSector('') }}>
                <X size={10} /> Clear All
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of <strong>{supporters.length}</strong> supporters
        {filterStatus !== 'all' && <span style={{ color: activeFilterCfg?.color, fontWeight: 600 }}> · {filterStatus}</span>}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Heart size={24} />
          </div>
          <h3>{supporters.length === 0 ? 'No Supporters Added Yet' : 'No Supporters Match'}</h3>
          <p>{supporters.length === 0 ? 'Add your first supporter to get started.' : 'Try adjusting your search or filters.'}</p>
          {supporters.length === 0 && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => openModal()}>
              <Plus size={13} /> Add First Supporter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Mobile</th>
                  <th>Contribution</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const cfg      = STATUS_CONFIG[d.supporterStatus] || STATUS_CONFIG['New']
                  const isOpen   = !!expanded[d.id]
                  const hasNote  = !!d.notes?.trim()
                  const daysDiff = d.lastSupportDate
                    ? differenceInDays(new Date(), parseISO(d.lastSupportDate))
                    : null

                  return [
                    <tr key={d.id} onClick={() => hasNote && toggleExpand(d.id)}
                      style={{ cursor: hasNote ? 'pointer' : 'default' }}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '11px 6px' }}>
                        {hasNote ? (isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--primary)', padding: '2px 8px', borderRadius: 5 }}>
                          {d.id}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{d.name}</div>
                        {d.house && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.house}</div>}
                      </td>
                      <td><RoleIcon donorType={d.donorType} /></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={10} color="var(--text-muted)" />
                          {d.mobile || '—'}
                        </div>
                      </td>
                      <td>
                        {d.effectiveContrib
                          ? <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'var(--danger-bg)', color: '#991B1B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Heart size={9} fill="#991B1B" /> {d.effectiveContrib}
                            </span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {d.lastSupportDate ? (
                          <>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(d.lastSupportDate)}</div>
                            <div style={{ fontSize: 11, color: cfg.color, fontWeight: 600, marginTop: 1 }}>
                              {daysDiff}d ago
                            </div>
                          </>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not recorded</span>}
                      </td>
                      <td>
                        {/* Status is display-only, not editable */}
                        <StatusBadge status={d.supporterStatus} />
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5 }}>
                          {d.society && <div style={{ fontWeight: 500 }}>{d.society}</div>}
                          <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                            {[d.sector, d.city].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="td-actions">
                          <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openModal(d)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-danger btn-icon btn-sm" title="Remove" onClick={() => remove(d.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>,

                    isOpen && hasNote && (
                      <tr key={`${d.id}-note`}>
                        <td colSpan={10} style={{ padding: '10px 20px', background: 'var(--bg)', fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic', borderBottom: '1px solid var(--border-light)' }}>
                          📝 {d.notes}
                        </td>
                      </tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="mobile-cards">
            {filtered.map(d => {
              const cfg = STATUS_CONFIG[d.supporterStatus] || STATUS_CONFIG['New']
              return (
                <div key={d.id} className="card" style={{ marginBottom: 10, padding: 14, borderLeft: `3px solid ${cfg.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--primary)', padding: '1px 7px', borderRadius: 4 }}>{d.id}</span>
                        <RoleIcon donorType={d.donorType} />
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
                      </div>
                      {d.mobile && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={10} /> {d.mobile}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={d.supporterStatus} />
                  </div>
                  {d.effectiveContrib && (
                    <div style={{ fontSize: 12, color: '#991B1B', background: 'var(--danger-bg)', padding: '3px 10px', borderRadius: 20, marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      <Heart size={9} fill="#991B1B" /> {d.effectiveContrib}
                    </div>
                  )}
                  {(d.society || d.sector || d.city) && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} /> {[d.society, d.sector, d.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.lastSupportDate ? `${fmtDate(d.lastSupportDate)}` : 'No date recorded'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal(d)}><Edit2 size={12} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(d.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {d.notes?.trim() && (
                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 8px', background: 'var(--bg)', borderRadius: 5 }}>
                      📝 {d.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 580, width: '95vw' }}>

            {/* Header */}
            <div className="modal-header">
              <Heart size={18} color="var(--primary)" />
              <div className="modal-title">{editing ? 'Edit Supporter' : 'Add New Supporter'}</div>
              {editing && (
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--primary)', padding: '2px 8px', borderRadius: 5 }}>
                  {editing.id}
                </span>
              )}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}><X size={16} /></button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              <div className="form-grid">

                {/* Name */}
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input value={form.name} onChange={e => setField('name', e.target.value)}
                    placeholder="e.g. Priya Sharma" autoFocus />
                  {errors.name && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 3 }}>{errors.name}</div>}
                </div>

                {/* Mobile */}
                <div className="form-group">
                  <label>Mobile Number <span className="required">*</span></label>
                  <input value={form.mobile}
                    onChange={e => setField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile" inputMode="numeric" maxLength={10} />
                  {errors.mobile && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 3 }}>{errors.mobile}</div>}
                </div>

                {/* House */}
                <div className="form-group">
                  <label>House / Flat No.</label>
                  <input value={form.house} onChange={e => setField('house', e.target.value)}
                    placeholder="e.g. A-101" />
                </div>

                {/* City */}
                <div className="form-group">
                  <label>City</label>
                  <select value={form.city} onChange={e => setField('city', e.target.value)}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                {/* Sector */}
                <div className="form-group">
                  <label>Sector / Area</label>
                  <select value={form.sector} onChange={e => setField('sector', e.target.value)} disabled={!form.city}>
                    <option value="">{form.city ? 'Select Sector' : 'Select City First'}</option>
                    {formSectors.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Society */}
                <div className="form-group full">
                  <label>Society / Colony</label>
                  <SocietyInput city={form.city} sector={form.sector}
                    value={form.society} onChange={val => setField('society', val)}
                    id="supporter-modal" />
                </div>

                {/* Contribution — FREE TEXT (not dropdown) */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Heart size={12} color="var(--danger)" />
                    Contribution
                  </label>
                  <input
                    value={form.contributionType}
                    onChange={e => setField('contributionType', e.target.value)}
                    placeholder="e.g. Money, Clothes, Books, Stationery…"
                  />
                </div>

                {/* Date — single field, simplified label */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={12} color="var(--info)" />
                    Date
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>
                      (last support activity)
                    </span>
                  </label>
                  <input type="date" value={form.lastSupportDate}
                    onChange={e => setField('lastSupportDate', e.target.value)} />
                  {/* Auto status preview */}
                  {previewCfg && (
                    <div style={{ fontSize: 11.5, marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: previewCfg.bg, color: previewCfg.color, fontWeight: 700 }}>
                      Auto status: {previewStatus}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="form-group full">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setField('notes', e.target.value)}
                    placeholder="Any additional info about this supporter…" style={{ minHeight: 68 }} />
                </div>
              </div>

              {/* Also a Donor toggle */}
              <div
                style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', border: `2px solid ${form.isAlsoDonor ? 'var(--secondary)' : 'var(--border)'}`, background: form.isAlsoDonor ? 'var(--secondary-light)' : 'var(--surface)' }}
                onClick={() => setField('isAlsoDonor', !form.isAlsoDonor)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={form.isAlsoDonor}
                    onChange={e => setField('isAlsoDonor', e.target.checked)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 16, height: 16, accentColor: 'var(--secondary)', cursor: 'pointer', padding: 0, border: 'none', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: form.isAlsoDonor ? 'var(--secondary)' : 'var(--text-primary)' }}>
                      👍 Also an RST/SKS Donor
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      This person also donates raddi/goods. They'll appear in the Donors page too.
                    </div>
                  </div>
                  {form.isAlsoDonor && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--secondary)', background: 'rgba(27,94,53,0.12)', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                      👍❤️ Both
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving || !form.name.trim() || !form.mobile.trim()}
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : '+ Add Supporter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}