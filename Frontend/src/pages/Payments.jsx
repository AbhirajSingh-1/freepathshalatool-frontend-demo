/**
 * Payments.jsx — Advanced two-section payment tracking
 * Section A: RST Payment (Kabadiwala → FreePathshala) by pickup/sector
 * Section B: Kabadiwala Payment ledger with edit modal
 *
 * All data flows from AppContext — recording a payment here instantly
 * updates RaddiMaster, Dashboard, and Kabadiwala pages.
 */
import { useState, useMemo } from 'react'
import {
  IndianRupee, X, CheckCircle, Clock, TrendingUp,
  Download, Plus, CreditCard, Smartphone, FileText, Hash,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, fmtCurrency, paymentStatusColor, exportToExcel } from '../utils/helpers'
import { CITY_SECTORS, CITIES } from '../data/mockData'

const REF_MODES = [
  { value: 'upi',    label: 'UPI',       icon: Smartphone,  placeholder: 'UPI transaction ID' },
  { value: 'cash',   label: 'Cash',      icon: IndianRupee, placeholder: 'Receipt no. (optional)' },
  { value: 'neft',   label: 'NEFT/IMPS', icon: CreditCard,  placeholder: 'NEFT reference number' },
  { value: 'cheque', label: 'Cheque',    icon: FileText,    placeholder: 'Cheque number' },
  { value: 'other',  label: 'Other',     icon: Hash,        placeholder: 'Reference / transaction ID' },
]

// ─── Section A: RST Pickup Payments ───────────────────────────────────────────

function SectionRST({ pickups, updatePayment }) {
  const [modal,        setModal]       = useState(null)
  const [saving,       setSaving]      = useState(false)
  const [amount,       setAmount]      = useState('')
  const [date,         setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [notes,        setNotes]       = useState('')
  const [refMode,      setRefMode]     = useState('upi')
  const [refVal,       setRefVal]      = useState('')
  const [refError,     setRefError]    = useState('')
  const [filterKab,    setFilterKab]   = useState('All')
  const [filterCity,   setFilterCity]  = useState('')
  const [filterSector, setFilterSect]  = useState('')
  const [filterStat,   setFilterStat]  = useState('All')
  const [dateFrom,     setDateFrom]    = useState('')
  const [dateTo,       setDateTo]      = useState('')

  const kabNames     = [...new Set(pickups.map(p => p.kabadiwala).filter(Boolean))]
  const sectOptions  = CITY_SECTORS[filterCity] || []

  const filtered = pickups.filter(p => {
    if (!p.totalValue && p.status !== 'Completed') return false
    const mK  = filterKab === 'All'  || p.kabadiwala === filterKab
    const mCi = !filterCity   || p.city === filterCity
    const mSe = !filterSector || p.sector === filterSector
    const mSt = filterStat === 'All' || p.paymentStatus === filterStat
    const mF  = !dateFrom || p.date >= dateFrom
    const mT  = !dateTo   || p.date <= dateTo
    return mK && mCi && mSe && mSt && mF && mT && p.status === 'Completed'
  }).sort((a, b) => b.date.localeCompare(a.date))

  const totalValue   = filtered.reduce((s, p) => s + (p.totalValue  || 0), 0)
  const totalPaid    = filtered.reduce((s, p) => s + (p.amountPaid  || 0), 0)
  const totalPending = totalValue - totalPaid

  // Sector-wise breakdown
  const sectorMap = useMemo(() => {
    const m = {}
    filtered.forEach(p => {
      const k = p.sector || p.city || 'Unknown'
      if (!m[k]) m[k] = { value: 0, paid: 0, count: 0 }
      m[k].value += p.totalValue || 0
      m[k].paid  += p.amountPaid || 0
      m[k].count += 1
    })
    return Object.entries(m).sort(([, a], [, b]) => b.value - a.value)
  }, [filtered])

  const openEdit = (p) => {
    setModal(p)
    setAmount(String(Math.max(0, (p.totalValue || 0) - (p.amountPaid || 0))))
    setDate(new Date().toISOString().slice(0, 10))
    setNotes(''); setRefMode('upi'); setRefVal(''); setRefError('')
  }

  const validate = () => {
    if (!amount || Number(amount) <= 0) return 'Enter a valid payment amount.'
    if (refMode !== 'cash' && !refVal.trim()) return `Please enter the ${REF_MODES.find(r => r.value === refMode)?.label} reference.`
    return ''
  }

  const save = async () => {
    const err = validate()
    if (err) { setRefError(err); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    updatePayment({ pickupId: modal.id, additionalAmount: Number(amount), date, notes, refMode, refValue: refVal })
    setSaving(false)
    setModal(null)
  }

  const handleExport = () => exportToExcel(
    filtered.map(p => ({
      'Pickup ID': p.id, Donor: p.donorName, Date: p.date, Society: p.society,
      Sector: p.sector, City: p.city, Kabadiwala: p.kabadiwala,
      'RST Value': p.totalValue, 'Amount Paid': p.amountPaid,
      Due: (p.totalValue || 0) - (p.amountPaid || 0), Status: p.paymentStatus,
    })),
    'RST_Payments'
  )

  return (
    <div>
      {/* Summary cards */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon"><IndianRupee size={18} /></div>
          <div className="stat-value">{fmtCurrency(totalValue)}</div>
          <div className="stat-label">Total RST Value</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><CheckCircle size={18} /></div>
          <div className="stat-value">{fmtCurrency(totalPaid)}</div>
          <div className="stat-label">Amount Received</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><Clock size={18} /></div>
          <div className="stat-value">{fmtCurrency(totalPending)}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><TrendingUp size={18} /></div>
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">Total Pickups</div>
        </div>
      </div>

      {/* Sector-wise breakdown */}
      {sectorMap.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">Sector-wise Revenue</div></div>
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table>
              <thead><tr><th>Sector</th><th>Pickups</th><th>Total Value</th><th>Received</th><th>Pending</th><th>Recovery %</th></tr></thead>
              <tbody>
                {sectorMap.map(([sector, d]) => {
                  const pct = d.value > 0 ? Math.round((d.paid / d.value) * 100) : 0
                  return (
                    <tr key={sector}>
                      <td style={{ fontWeight: 600 }}>{sector}</td>
                      <td>{d.count}</td>
                      <td style={{ fontWeight: 600 }}>{fmtCurrency(d.value)}</td>
                      <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>{fmtCurrency(d.paid)}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{fmtCurrency(d.value - d.paid)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? 'var(--secondary)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 34 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <select value={filterKab} onChange={e => setFilterKab(e.target.value)} style={{ flex: '1 1 140px' }}>
          <option value="All">All Kabadiwalas</option>
          {kabNames.map(k => <option key={k}>{k}</option>)}
        </select>
        <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterSect('') }} style={{ flex: '1 1 120px' }}>
          <option value="">All Cities</option>
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterSector} onChange={e => setFilterSect(e.target.value)} disabled={!filterCity} style={{ flex: '1 1 130px' }}>
          <option value="">All Sectors</option>
          {sectOptions.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterStat} onChange={e => setFilterStat(e.target.value)} style={{ flex: '1 1 130px' }}>
          <option value="All">All Statuses</option>
          {['Paid', 'Partially Paid', 'Not Paid'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: '1 1 130px' }} />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ flex: '1 1 130px' }} />
        <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={13} /> Export</button>
      </div>

      {/* Pickups Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pickup ID</th><th>Donor</th><th>Date</th><th>Kabadiwala</th>
              <th>RST Value</th><th>Paid</th><th>Due</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No records found</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} style={{ background: p.paymentStatus === 'Paid' ? 'rgba(27,94,53,0.03)' : 'inherit' }}>
                <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.id}</span></td>
                <td style={{ fontWeight: 600 }}>{p.donorName}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.society}</div></td>
                <td style={{ fontSize: 12.5 }}>{fmtDate(p.date)}</td>
                <td style={{ fontSize: 12.5 }}>{p.kabadiwala || '—'}</td>
                <td style={{ fontWeight: 600 }}>{fmtCurrency(p.totalValue)}</td>
                <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>{fmtCurrency(p.amountPaid || 0)}</td>
                <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                  {(p.totalValue - (p.amountPaid || 0)) > 0 ? fmtCurrency(p.totalValue - (p.amountPaid || 0)) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td><span className={`badge ${paymentStatusColor(p.paymentStatus)}`}>{p.paymentStatus}</span></td>
                <td>
                  {p.paymentStatus !== 'Paid' ? (
                    <button className="btn btn-primary btn-sm" onClick={() => openEdit(p)} style={{ fontSize: 11 }}>
                      <Plus size={11} /> Record
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 600 }}>✓ Cleared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Record Payment — {modal.donorName}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtCurrency(modal.totalValue)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Total</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--secondary)' }}>{fmtCurrency(modal.amountPaid || 0)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Paid</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)' }}>{fmtCurrency((modal.totalValue || 0) - (modal.amountPaid || 0))}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Due</div>
                </div>
              </div>

              <div className="form-group">
                <label>Amount Received (₹) <span className="required">*</span></label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" min="1" />
              </div>

              <div className="form-group">
                <label>Payment Mode <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {REF_MODES.map(m => (
                    <button key={m.value} onClick={() => { setRefMode(m.value); setRefVal('') }}
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1.5px solid ${refMode === m.value ? 'var(--primary)' : 'var(--border)'}`, background: refMode === m.value ? 'var(--primary-light)' : 'var(--surface)', color: refMode === m.value ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {refMode !== 'cash' && (
                <div className="form-group">
                  <label>{REF_MODES.find(r => r.value === refMode)?.label} Reference <span className="required">*</span></label>
                  <input value={refVal} onChange={e => { setRefVal(e.target.value); setRefError('') }} placeholder={REF_MODES.find(r => r.value === refMode)?.placeholder} />
                </div>
              )}

              <div className="form-group">
                <label>Payment Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" style={{ minHeight: 60 }} />
              </div>

              {refError && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 4 }}>⚠ {refError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section B: Kabadiwala Payment Ledger ────────────────────────────────────

function SectionKabadiwala({ kabPayments, updateKabPayment }) {
  const [editModal, setEditModal] = useState(null)
  const [form, setForm] = useState({})

  const open = (k) => { setEditModal(k); setForm({ paidAmount: k.paidAmount, notes: '' }) }

  const save = async () => {
    await new Promise(r => setTimeout(r, 300))
    const paid    = Number(form.paidAmount) || 0
    const pending = editModal.totalAmount - paid
    updateKabPayment({ ...editModal, paidAmount: paid, pendingAmount: pending, status: paid >= editModal.totalAmount ? 'Cleared' : paid > 0 ? 'Partial' : 'Pending' })
    setEditModal(null)
  }

  const totalEarned  = kabPayments.reduce((s, k) => s + k.totalAmount, 0)
  const totalPaid    = kabPayments.reduce((s, k) => s + k.paidAmount, 0)
  const totalPending = kabPayments.reduce((s, k) => s + k.pendingAmount, 0)

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card green"><div className="stat-icon"><IndianRupee size={18} /></div><div className="stat-value">{fmtCurrency(totalEarned)}</div><div className="stat-label">Total Kabadiwala Earnings</div></div>
        <div className="stat-card blue"><div className="stat-icon"><CheckCircle size={18} /></div><div className="stat-value">{fmtCurrency(totalPaid)}</div><div className="stat-label">Paid Out</div></div>
        <div className="stat-card red"><div className="stat-icon"><Clock size={18} /></div><div className="stat-value">{fmtCurrency(totalPending)}</div><div className="stat-label">Still Pending</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {kabPayments.map(k => {
          const pct = k.totalAmount > 0 ? Math.round((k.paidAmount / k.totalAmount) * 100) : 0
          const statusColor = k.status === 'Cleared' ? 'var(--secondary)' : k.status === 'Partial' ? 'var(--warning)' : 'var(--danger)'
          return (
            <div key={k.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{k.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{k.mobile} · {k.area}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusColor}22`, color: statusColor }}>{k.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Earned', value: fmtCurrency(k.totalAmount), color: 'var(--text-primary)' },
                    { label: 'Paid',   value: fmtCurrency(k.paidAmount),  color: 'var(--secondary)' },
                    { label: 'Due',    value: fmtCurrency(k.pendingAmount), color: 'var(--danger)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color, fontFamily: 'var(--font-display)' }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Recovery</span><span>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? 'var(--secondary)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.pickupCount} pickups</span>
                  <button className="btn btn-outline btn-sm" onClick={() => open(k)} style={{ fontSize: 12 }}>
                    Update Payment
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Update — {editModal.name}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Total Paid So Far (₹)</label>
                <input type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} min="0" max={editModal.totalAmount} />
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Total earned: {fmtCurrency(editModal.totalAmount)}</div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 60 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Payments Page ───────────────────────────────────────────────────────

export default function Payments() {
  const { pickups, kabPayments, updatePayment, updateKabPayment } = useApp()
  const [section, setSection] = useState('rst')

  return (
    <div className="page-body">
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${section === 'rst' ? 'active' : ''}`} onClick={() => setSection('rst')}>
          <IndianRupee size={13} style={{ marginRight: 4 }} />
          RST Payment Tracking
        </button>
        <button className={`tab ${section === 'kab' ? 'active' : ''}`} onClick={() => setSection('kab')}>
          Kabadiwala Payment Ledger
        </button>
      </div>

      {section === 'rst'
        ? <SectionRST       pickups={pickups}       updatePayment={updatePayment} />
        : <SectionKabadiwala kabPayments={kabPayments} updateKabPayment={updateKabPayment} />
      }
    </div>
  )
}