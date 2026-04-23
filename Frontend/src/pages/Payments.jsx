// Frontend/src/pages/Payments.jsx

import { useMemo, useState, useCallback } from 'react'
import {
  AlertCircle, BarChart3, Calendar, CheckCircle, CreditCard,
  Download, FileText, History, Image, IndianRupee, AlertTriangle,
  Plus, Search, Smartphone, Upload, X, Hash, MapPin,
  ChevronDown, ChevronUp, Truck, Clock,
  Phone, Filter, RefreshCw, Package,
  Eye, Gift, Users, TrendingUp,
  ArrowRight, Wallet, BadgeCheck, Check,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'
import { fmtDate, fmtCurrency, exportToExcel } from '../utils/helpers'
import { CITIES, CITY_SECTORS } from '../data/mockData'

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_PRIORITY = { 'Not Paid': 0, 'Partially Paid': 1, 'Paid': 2, 'Write Off': 3 }
const REF_MODES = [
  { value: 'cash',   label: 'Cash',    icon: IndianRupee,  placeholder: 'Receipt number (optional)' },
  { value: 'upi',    label: 'UPI',     icon: Smartphone,   placeholder: 'UPI transaction ID' },
  { value: 'bank',   label: 'Bank',    icon: CreditCard,   placeholder: 'Bank reference number' },
  { value: 'cheque', label: 'Cheque',  icon: FileText,     placeholder: 'Cheque number' },
]
const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
]
const padM = n => String(n).padStart(2, '0')
const money = n => fmtCurrency(Number(n) || 0)
const refModeLabel = m => REF_MODES.find(r => r.value === m)?.label || m || 'Cash'

function getPickupPayStatus(total, paid) {
  const t = Number(total) || 0; const p = Number(paid) || 0
  if (t === 0) return 'Not Paid'
  if (p >= t)  return 'Paid'
  if (p > 0)   return 'Partially Paid'
  return 'Not Paid'
}

function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  const y = now.getFullYear(), m = now.getMonth()
  if (preset === 'month') return { from: `${y}-${padM(m+1)}-01`, to: fmt(now) }
  if (preset === 'last_month') {
    const lm = m === 0 ? 11 : m - 1; const ly = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${padM(lm+1)}-01`, to: `${ly}-${padM(lm+1)}-${padM(last)}` }
  }
  if (preset === 'custom') return { from: customFrom || '', to: customTo || '' }
  return { from: '', to: '' }
}

function openImageInTab(src, title = 'Payment Proof') {
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style></head><body><img src="${src}" style="max-width:100vw;max-height:100vh;object-fit:contain;"/></body></html>`)
  win.document.close()
}

// ── Design tokens for this page ───────────────────────────────────────────────
const styles = {
  surface: { background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 12 },
  mono: { fontFamily: 'monospace', fontWeight: 700 },
}

// ── Reusable atoms ─────────────────────────────────────────────────────────────
function ScreenshotThumb({ src, label = 'Payment Proof', size = 42 }) {
  if (!src) return null
  return (
    <div onClick={() => openImageInTab(src, label)} title="Click to view"
      style={{ cursor: 'pointer', width: size, height: size, borderRadius: 7, overflow: 'hidden',
        border: '2px solid var(--secondary)', flexShrink: 0, background: 'var(--bg)' }}>
      <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}

function OrderIdChip({ id }) {
  if (!id) return null
  return (
    <code style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)',
      background: 'var(--primary-light)', padding: '2px 7px', borderRadius: 5,
      border: '1px solid rgba(232,82,26,0.18)', whiteSpace: 'nowrap' }}>
      {id}
    </code>
  )
}

// Status pill ─────────────────────────────────────────────────────────────────
function PayStatusDot({ status }) {
  const cfg = {
    'Paid':           { dot: '#16a34a', label: 'Paid',           bg: '#dcfce7', txt: '#14532d' },
    'Not Paid':       { dot: '#ef4444', label: 'Not Paid',        bg: '#fee2e2', txt: '#991b1b' },
    'Partially Paid': { dot: '#f59e0b', label: 'Partially Paid',  bg: '#fef3c7', txt: '#92400e' },
    'Write Off':      { dot: '#94a3b8', label: 'Write Off',       bg: '#f1f5f9', txt: '#64748b' },
  }[status] || { dot: '#94a3b8', label: status, bg: '#f1f5f9', txt: '#64748b' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:20, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.txt,
      whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
      {cfg.label}
    </span>
  )
}

// Toast stack ─────────────────────────────────────────────────────────────────
function ToastStack({ toasts, onRemove }) {
  return (
    <div style={{ position:'fixed', right:24, bottom:24, zIndex:9999,
      display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:'flex', alignItems:'flex-start', gap:10,
          minWidth:280, maxWidth:380, padding:'12px 14px', borderRadius:12,
          background: t.type==='error' ? 'var(--danger)' : t.type==='success' ? '#1a2e22' : 'var(--info)',
          color:'white', boxShadow:'0 8px 24px rgba(0,0,0,0.2)', pointerEvents:'auto',
          borderLeft: `3px solid ${t.type==='error' ? '#ff6b6b' : t.type==='success' ? '#4ade80' : '#60a5fa'}`,
        }}>
          {t.type === 'success' ? <CheckCircle size={16} style={{flexShrink:0,marginTop:1}}/> : <AlertCircle size={16} style={{flexShrink:0,marginTop:1}}/>}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{t.message}</div>
            {t.sub && <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>{t.sub}</div>}
          </div>
          <button onClick={() => onRemove(t.id)} style={{ border:0, background:'transparent', color:'white', cursor:'pointer', opacity:0.7 }}><X size={14}/></button>
        </div>
      ))}
    </div>
  )
}

function useToastStack() {
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((message, type = 'success', sub = '') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, sub }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3600)
  }, [])
  const removeToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), [])
  return { toasts, showToast, removeToast }
}

// ── Payment Method Picker ─────────────────────────────────────────────────────
function MethodPicker({ value, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
      {REF_MODES.map(mode => {
        const Icon = mode.icon
        const active = value === mode.value
        return (
          <button key={mode.value} type="button" onClick={() => onChange(mode.value)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
              padding:'10px 6px', borderRadius:10, cursor:'pointer', transition:'all 0.15s',
              border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              background: active ? 'var(--primary-light)' : 'var(--surface)',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: active ? 700 : 400, fontSize:11.5,
            }}>
            <Icon size={15}/>
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RECORD PAYMENT MODAL — redesigned
// ══════════════════════════════════════════════════════════════════════════════
function RecordPaymentModal({ context, onClose, onSave, saving }) {
  const [amount,     setAmount]     = useState(() => context.pending > 0 ? String(Math.round(context.pending)) : '')
  const [date,       setDate]       = useState(() => new Date().toISOString().slice(0,10))
  const [method,     setMethod]     = useState('cash')
  const [reference,  setReference]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [error,      setError]      = useState('')
  const [uploadMsg,  setUploadMsg]  = useState('')

  const entered = Number(amount) || 0
  const afterPay = Math.max(0, context.pending - entered)
  const isFull = entered > 0 && entered >= context.pending - 0.01
  const hasRef = method !== 'cash'
  const REF_LABELS = { upi:'UPI Transaction ID', bank:'Bank Reference No.', cheque:'Cheque Number' }

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setScreenshot(ev.target.result); setUploadMsg(`${file.name} attached`) }
    reader.readAsDataURL(file); e.target.value = ''
  }

  const handleSave = () => {
    if (context.pending <= 0) { setError('No pending balance.'); return }
    if (entered <= 0)         { setError('Enter a valid amount.'); return }
    if (entered > context.pending + 0.01) { setError(`Max: ${money(context.pending)}`); return }
    if (hasRef && !reference.trim()) { setError(`Enter the ${REF_LABELS[method] || 'reference'}.`); return }
    onSave({ amount:entered, date, method, reference:reference.trim(), notes:notes.trim(), screenshot, isFull })
  }

  const collPct = context.total > 0 ? Math.round((context.paid / context.total)*100) : 0

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:520, width:'95vw', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 0', borderBottom:'1px solid var(--border-light)', paddingBottom:16 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                Record Payment
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--text-primary)' }}>
                {context.partnerName}
              </div>
              {context.donorName && (
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Order: {context.orderId || context.pickupId}</div>
              )}
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16}/></button>
          </div>

          {/* Balance track */}
          <div style={{ marginTop:16, padding:'12px 14px', background:'var(--bg)', borderRadius:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)' }}>Collection progress</span>
              <span style={{ fontSize:11.5, fontWeight:700, color: collPct===100 ? 'var(--secondary)' : 'var(--warning)' }}>{collPct}%</span>
            </div>
            <div style={{ height:6, background:'var(--border-light)', borderRadius:3, overflow:'hidden', marginBottom:12 }}>
              <div style={{ height:'100%', borderRadius:3, width:`${Math.min(100,collPct)}%`,
                background: collPct===100 ? 'var(--secondary)' : 'linear-gradient(90deg,var(--warning),var(--primary))',
                transition:'width 0.5s' }}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { l:'Billed',   v:money(context.total),   c:'var(--text-primary)' },
                { l:'Received', v:money(context.paid),    c:'var(--secondary)' },
                { l:'Pending',  v:money(context.pending), c:context.pending>0?'var(--danger)':'var(--secondary)' },
              ].map(i => (
                <div key={i.l} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, color:i.c }}>{i.v}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', marginTop:2 }}>{i.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {context.pending <= 0 ? (
          <div style={{ padding:'40px 24px', textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--secondary-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Check size={26} color="var(--secondary)"/>
            </div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--secondary)' }}>Fully Paid</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>No outstanding balance.</div>
          </div>
        ) : (
          <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto', maxHeight:440 }}>

            {/* Amount + Date row */}
            <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:12 }}>
              <div className="form-group" style={{ margin:0 }}>
                <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span>Amount (₹) <span className="required">*</span></span>
                  {isFull && <span style={{ fontSize:10, color:'var(--secondary)', background:'var(--secondary-light)', padding:'1px 7px', borderRadius:20, fontWeight:700 }}>Full ✓</span>}
                </label>
                <input type="number" min={0} max={context.pending} inputMode="decimal" autoFocus
                  value={amount} onChange={e => { setAmount(e.target.value); setError('') }}
                  placeholder={`≤ ${money(context.pending)}`}
                  style={{ fontWeight:700, fontSize:17, borderColor:entered>0?'var(--primary)':undefined }}/>
                {entered > 0 && afterPay > 0 && (
                  <div style={{ fontSize:11, color:'var(--warning)', marginTop:3, fontWeight:600 }}>
                    Still due after: {money(afterPay)}
                  </div>
                )}
              </div>
              <div className="form-group" style={{ margin:0 }}>
                <label>Date <span className="required">*</span></label>
                <input type="date" value={date} onChange={e => { setDate(e.target.value); setError('') }}/>
              </div>
            </div>

            {/* Method */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:8 }}>Payment Method <span className="required">*</span></label>
              <MethodPicker value={method} onChange={m => { setMethod(m); setReference(''); setScreenshot(null); setUploadMsg(''); setError('') }}/>
            </div>

            {hasRef && (
              <div className="form-group" style={{ margin:0 }}>
                <label>{REF_LABELS[method]} <span className="required">*</span></label>
                <input value={reference} onChange={e => { setReference(e.target.value); setError('') }}
                  placeholder={REF_MODES.find(r=>r.value===method)?.placeholder}/>
              </div>
            )}

            {method === 'upi' && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
                  <Image size={12} color="var(--info)"/> UPI Screenshot
                  <span style={{ fontSize:10.5, fontWeight:400, color:'var(--text-muted)' }}>(optional)</span>
                </label>
                {screenshot ? (
                  <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:'var(--secondary-light)', borderRadius:8 }}>
                    <ScreenshotThumb src={screenshot}/>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--secondary)', marginBottom:4 }}>Attached ✓</div>
                      <button onClick={() => { setScreenshot(null); setUploadMsg('') }}
                        style={{ fontSize:11.5, color:'var(--danger)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <label className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', borderStyle:'dashed', cursor:'pointer' }}>
                    <Upload size={13}/> Upload Screenshot
                    <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleScreenshot}/>
                  </label>
                )}
                {uploadMsg && <div style={{ fontSize:11, color:'var(--secondary)', marginTop:4 }}>✓ {uploadMsg}</div>}
              </div>
            )}

            <div className="form-group" style={{ margin:0 }}>
              <label>Notes <span style={{ fontSize:10.5, fontWeight:400, color:'var(--text-muted)' }}>(optional)</span></label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks…"/>
            </div>

            {error && (
              <div style={{ fontSize:12, color:'var(--danger)', display:'flex', alignItems:'center', gap:6,
                padding:'8px 12px', background:'var(--danger-bg)', borderRadius:8 }}>
                <AlertCircle size={13}/>{error}
              </div>
            )}
          </div>
        )}

        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border-light)', display:'flex', gap:10 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          {context.pending > 0 && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving||entered<=0}
              style={{ flex:2, justifyContent:'center' }}>
              {saving ? 'Saving…' : isFull ? '✓ Mark Fully Paid' : `Record ${entered>0?money(entered):'Payment'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// WRITE-OFF MODAL — redesigned
// ══════════════════════════════════════════════════════════════════════════════
function WriteOffModal({ context, onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (!reason.trim()) { setError('Describe the reason for write-off.'); return }
    if (!confirmed)     { setError('Check the confirmation to continue.'); return }
    onConfirm({ reason:reason.trim() })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:440 }}>
        <div className="modal-header" style={{ background:'var(--danger-bg)', borderBottom:'1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'var(--danger)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AlertTriangle size={16} color="white"/>
          </div>
          <div>
            <div className="modal-title" style={{ color:'var(--danger)', fontSize:15 }}>Write Off Balance</div>
            <div style={{ fontSize:11.5, color:'var(--danger)', opacity:0.75, marginTop:1 }}>
              {context.partnerName} · {money(context.pending)} marked uncollectable
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft:'auto' }} onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{ margin:'0 0 16px' }}>
            <label>Reason <span className="required">*</span></label>
            <textarea value={reason} onChange={e => { setReason(e.target.value); setError('') }}
              placeholder="e.g. Partner unreachable, amount disputed…" style={{ minHeight:80 }} autoFocus/>
          </div>
          <div onClick={() => { setConfirmed(c=>!c); setError('') }}
            style={{ padding:'12px 14px', borderRadius:10, cursor:'pointer',
              border:`1.5px solid ${confirmed?'var(--danger)':'var(--border)'}`,
              background: confirmed?'var(--danger-bg)':'var(--surface)',
              display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
            <input type="checkbox" checked={confirmed} onChange={()=>{}}
              style={{ width:16, height:16, accentColor:'var(--danger)', flexShrink:0, marginTop:2, cursor:'pointer', padding:0, border:'none' }}/>
            <div style={{ fontSize:12.5, color:confirmed?'var(--danger)':'var(--text-secondary)' }}>
              I understand this is permanent. <strong>{money(context.pending)}</strong> will be marked non-recoverable.
            </div>
          </div>
          {error && <div style={{ fontSize:12, color:'var(--danger)', display:'flex', alignItems:'center', gap:5 }}><AlertCircle size={12}/>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm}
            disabled={saving||!reason.trim()||!confirmed}>
            {saving ? 'Processing…' : `Write Off ${money(context.pending)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT HISTORY MODAL — redesigned
// ══════════════════════════════════════════════════════════════════════════════
function HistoryModal({ partner, onClose }) {
  const entries = (partner.history||[]).sort((a,b)=>(b.date||'').localeCompare(a.date||''))
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:560 }}>
        <div className="modal-header">
          <History size={18} color="var(--info)"/>
          <div className="modal-title">Payment History</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginLeft:4 }}>{partner.partnerName}</div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft:'auto' }} onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body" style={{ padding:'8px 22px' }}>
          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding:32 }}><p>No payments recorded.</p></div>
          ) : entries.map((e,i) => (
            <div key={`${e.pickupId}-${i}`} style={{
              display:'flex', gap:12, padding:'14px 0',
              borderBottom: i<entries.length-1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
                background: e.refMode==='writeoff' ? 'var(--danger-bg)' : 'var(--secondary-light)',
                color: e.refMode==='writeoff' ? 'var(--danger)' : 'var(--secondary)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {e.refMode==='writeoff' ? <AlertTriangle size={15}/> : <IndianRupee size={15}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <strong style={{ color:e.refMode==='writeoff'?'var(--danger)':'var(--secondary)', fontSize:14 }}>
                    {e.refMode==='writeoff' ? 'Written Off' : money(e.amount)}
                  </strong>
                  <span className="badge badge-muted" style={{ fontSize:10 }}>{refModeLabel(e.refMode)}</span>
                  <OrderIdChip id={e.orderId||e.pickupId}/>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>{e.donorName||'—'}{e.refValue?` · Ref: ${e.refValue}`:''}</div>
                {e.notes && <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{e.notes}</div>}
                {e.screenshot && (
                  <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8 }}>
                    <ScreenshotThumb src={e.screenshot} size={40}/>
                    <button onClick={() => openImageInTab(e.screenshot)}
                      style={{ fontSize:11, padding:'3px 10px', borderRadius:6, border:'1px solid var(--secondary)', background:'var(--secondary-light)', cursor:'pointer', color:'var(--secondary)', fontWeight:600 }}>
                      <Eye size={10} style={{ marginRight:3 }}/>View
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', flexShrink:0 }}>{fmtDate(e.date)}</div>
            </div>
          ))}
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PICKUP ROW — inside partner ledger
// ══════════════════════════════════════════════════════════════════════════════
function PickupRow({ pickup, onPay, onWriteOff, canWriteOff }) {
  const total = Number(pickup.totalValue)||0
  const paid  = Math.min(total, Number(pickup.amountPaid)||0)
  const pending = Math.max(0, total-paid)
  const ps = pickup.paymentStatus || getPickupPayStatus(total, paid)
  const isPending = ps==='Not Paid'||ps==='Partially Paid'

  return (
    <div style={{
      display:'grid', gridTemplateColumns:'1fr auto auto',
      alignItems:'center', gap:16, padding:'10px 20px',
      borderBottom:'1px solid var(--border-light)',
      background: pending>0 ? 'rgba(239,68,68,0.015)' : 'transparent',
      transition:'background 0.1s',
    }}>
      <div style={{ minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
          <OrderIdChip id={pickup.orderId||pickup.id}/>
          <span style={{ fontWeight:600, fontSize:13 }}>{pickup.donorName}</span>
          <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>{fmtDate(pickup.date)}</span>
        </div>
        <div style={{ display:'flex', gap:12, fontSize:12, flexWrap:'wrap' }}>
          {total>0 && <span>Billed: <strong style={{ color:'var(--primary)' }}>{money(total)}</strong></span>}
          {paid>0  && <span>Rcvd: <strong style={{ color:'var(--secondary)' }}>{money(paid)}</strong></span>}
          {pending>0 && <span>Due: <strong style={{ color:'var(--danger)' }}>{money(pending)}</strong></span>}
        </div>
      </div>
      <PayStatusDot status={ps}/>
      {isPending && pending > 0 && (
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-outline btn-sm"
            onClick={() => onPay({ pickup:{...pickup,_total:total,_paid:paid,_pending:pending} })}
            style={{ fontSize:11.5, padding:'5px 12px' }}>
            Pay
          </button>
          {canWriteOff && (
            <button onClick={() => onWriteOff({...pickup,_total:total,_paid:paid,_pending:pending})}
              style={{ fontSize:11.5, padding:'5px 10px', borderRadius:6,
                border:'1px solid rgba(239,68,68,0.35)', background:'var(--danger-bg)',
                color:'var(--danger)', cursor:'pointer', fontWeight:600 }}>
              W/O
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTNER ROW — the main ledger card, redesigned
// ══════════════════════════════════════════════════════════════════════════════
function PartnerRow({ partner, onRecordPayment, onWriteOffEntry, onWriteOffPartner, onViewHistory, canWriteOff }) {
  const [open, setOpen] = useState(false)
  const collPct = partner.total>0 ? Math.round((partner.paid/partner.total)*100) : 0
  const allPaid = partner.pending === 0
  const urgentCount = partner.records.filter(p => {
    const ps = p.paymentStatus || getPickupPayStatus(p.totalValue, p.amountPaid)
    return ps==='Not Paid'||ps==='Partially Paid'
  }).length

  return (
    <div style={{
      background:'var(--surface)', borderRadius:12,
      border:`1px solid ${allPaid ? 'var(--border-light)' : 'rgba(239,68,68,0.2)'}`,
      marginBottom:10, overflow:'hidden',
      boxShadow: allPaid ? 'var(--shadow)' : '0 2px 12px rgba(239,68,68,0.06)',
      transition:'all 0.15s',
    }}>
      {/* Main row */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', flexWrap:'wrap' }}>

        {/* Avatar + identity */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flex:'1 1 200px', minWidth:0 }}>
          <div style={{
            width:44, height:44, borderRadius:11, flexShrink:0,
            background: allPaid ? 'var(--secondary-light)' : 'var(--primary-light)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-display)', fontSize:19, fontWeight:800,
            color: allPaid ? 'var(--secondary)' : 'var(--primary)',
          }}>
            {(partner.partnerName||'?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
              {partner.pickuppartnerId && (
                <code style={{ fontSize:10, fontWeight:800, color:'white', background:'var(--secondary)', padding:'1px 6px', borderRadius:4 }}>
                  {partner.pickuppartnerId}
                </code>
              )}
              <span style={{ fontWeight:700, fontSize:15 }}>{partner.partnerName}</span>
            </div>
            {partner.mobile && (
              <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                <Phone size={10}/>{partner.mobile}
              </div>
            )}
          </div>
        </div>

        {/* Financial figures */}
        <div style={{ display:'flex', gap:0, flex:'0 0 auto' }}>
          {[
            { l:'Billed',   v:money(partner.total),   c:'var(--text-primary)' },
            { l:'Received', v:money(partner.paid),    c:'var(--secondary)' },
            { l:'Pending',  v:money(partner.pending), c:partner.pending>0?'var(--danger)':'var(--secondary)' },
          ].map((item,i) => (
            <div key={item.l} style={{
              textAlign:'center', padding:'0 18px',
              borderLeft: i>0 ? '1px solid var(--border-light)' : 'none',
            }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, color:item.c, lineHeight:1 }}>{item.v}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:3 }}>{item.l}</div>
            </div>
          ))}
        </div>

        {/* Status + progress */}
        <div style={{ flex:'0 0 120px', display:'flex', flexDirection:'column', gap:6 }}>
          {allPaid ? (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'var(--secondary)' }}>
              <BadgeCheck size={14}/> All Clear
            </div>
          ) : (
            <div style={{ fontSize:12, fontWeight:700, color:'var(--danger)' }}>
              {urgentCount} pending
            </div>
          )}
          {partner.total > 0 && (
            <div>
              <div style={{ height:5, background:'var(--border-light)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:3,
                  width:`${Math.min(100,collPct)}%`,
                  background: collPct===100 ? 'var(--secondary)' : collPct>=50 ? 'var(--warning)' : 'var(--danger)',
                  transition:'width 0.5s' }}/>
              </div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{collPct}% collected</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, flex:'0 0 auto', alignItems:'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onViewHistory(partner)}
            style={{ fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
            <History size={13}/> History
          </button>

          {partner.pending > 0 ? (
            <>
              <button className="btn btn-primary"
                onClick={() => onRecordPayment({ partner })}
                style={{ fontSize:13, fontWeight:700, padding:'8px 16px', display:'flex', alignItems:'center', gap:5 }}>
                <IndianRupee size={13}/> Record
              </button>
              {canWriteOff && (
                <button onClick={() => onWriteOffPartner(partner)}
                  style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid rgba(239,68,68,0.3)',
                    background:'var(--danger-bg)', color:'var(--danger)', cursor:'pointer',
                    fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                  W/O All
                </button>
              )}
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700,
              color:'var(--secondary)', padding:'7px 14px', background:'var(--secondary-light)', borderRadius:8 }}>
              <BadgeCheck size={14}/> Paid
            </div>
          )}

          <button onClick={() => setOpen(o=>!o)}
            style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', color:'var(--text-muted)', transition:'all 0.15s' }}>
            {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
      </div>

      {/* Expandable pickup rows */}
      {open && (
        <div style={{ borderTop:'1px solid var(--border-light)' }}>
          <div style={{ padding:'8px 20px 6px', background:'var(--surface-alt)',
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Pickup Records
            </span>
            <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>{partner.records.length} entries</span>
          </div>
          {[...partner.records]
            .sort((a,b) => {
              const ap = STATUS_PRIORITY[a.paymentStatus||getPickupPayStatus(a.totalValue,a.amountPaid)]??99
              const bp = STATUS_PRIORITY[b.paymentStatus||getPickupPayStatus(b.totalValue,b.amountPaid)]??99
              if(ap!==bp) return ap-bp
              return (b.date||'').localeCompare(a.date||'')
            })
            .map(r => (
              <PickupRow key={r.id||r.orderId} pickup={r}
                onPay={onRecordPayment}
                onWriteOff={p => onWriteOffEntry(p)}
                canWriteOff={canWriteOff}/>
            ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTNER PAYMENT HUB — main redesigned section
// ══════════════════════════════════════════════════════════════════════════════
function PartnerPaymentHub({ pickups, PickupPartners, recordPickupPartnerPayment, clearPartnerBalance }) {
  const { role } = useRole()
  const canWriteOff = role==='admin'||role==='manager'
  const { toasts, showToast, removeToast } = useToastStack()

  const [datePreset,   setDatePreset]   = useState('all')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [globalSearch, setGlobalSearch] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('')

  const [payContext,  setPayContext]  = useState(null)
  const [writeOffCtx, setWriteOffCtx] = useState(null)
  const [histPartner, setHistPartner] = useState(null)
  const [saving,      setSaving]      = useState(false)

  const setContextFeedback = useCallback(() => {}, [])

  const notify = useCallback((message, type = 'success', sub = '') => {
    showToast(message, type, sub)
  }, [showToast])

  const { from:dateFrom, to:dateTo } = useMemo(() => getDateRange(datePreset,customFrom,customTo), [datePreset,customFrom,customTo])

  // Build partner rows
  const partnerRows = useMemo(() => {
    const q = globalSearch.toLowerCase().trim()
    const relevant = pickups.filter(p => {
  if(p.status!=='Completed'||!p.PickupPartner) return false
  const inDate = (!dateFrom||(p.date||'')>=dateFrom)&&(!dateTo||(p.date||'')<=dateTo)
  const inSearch = !q||(p.PickupPartner||'').toLowerCase().includes(q)||(p.donorName||'').toLowerCase().includes(q)||(p.orderId||'').toLowerCase().includes(q)
  const inPartner = !partnerFilter || p.PickupPartner === partnerFilter    
  return inDate&&inSearch&&inPartner                                        
})
    const map = {}
    relevant.forEach(p => {
      const name = p.PickupPartner
      const kab = PickupPartners.find(k=>k.name===name)||{}
      if(!map[name]) map[name] = { pickuppartnerId:kab.id||name, partnerName:name, mobile:kab.mobile||p.pickuppartneradiMobile||'', total:0,paid:0,pending:0,writeOff:0,count:0,records:[],history:[] }
      const total=Number(p.totalValue)||0, paid=Math.min(total,Number(p.amountPaid)||0)
      const ps=p.paymentStatus||getPickupPayStatus(total,paid), isWO=ps==='Write Off'
      const pend=isWO?0:Math.max(0,total-paid), wo=isWO?Math.max(0,total-paid):0
      const history=(p.payHistory||[]).map(h=>({...h,pickupId:p.id,orderId:p.orderId,donorName:p.donorName}))
      map[name].total+=total; map[name].paid+=paid; map[name].pending+=pend; map[name].writeOff+=wo
      map[name].count+=1; map[name].records.push(p); map[name].history.push(...history)
    })
    let rows = Object.values(map).sort((a,b)=>b.pending-a.pending||a.partnerName.localeCompare(b.partnerName))
    if(statusFilter==='pending') rows=rows.filter(r=>r.pending>0)
    if(statusFilter==='clear')   rows=rows.filter(r=>r.pending===0)
    return rows
 }, [pickups,PickupPartners,dateFrom,dateTo,globalSearch,statusFilter,partnerFilter])

  const kpis = useMemo(() => ({
    totalPartners: partnerRows.length,
    withPending:   partnerRows.filter(r=>r.pending>0).length,
    totalRevenue:  partnerRows.reduce((s,r)=>s+r.total,0),
    totalReceived: partnerRows.reduce((s,r)=>s+r.paid,0),
    totalPending:  partnerRows.reduce((s,r)=>s+r.pending,0),
    totalWriteOff: partnerRows.reduce((s,r)=>s+r.writeOff,0),
  }), [partnerRows])

  // Action handlers
  const openPayModal = useCallback(({ partner, pickup }) => {
    if(partner) {
      setPayContext({ partnerName:partner.partnerName, pickuppartnerId:partner.pickuppartnerId, mobile:partner.mobile, isPartnerLevel:true, total:partner.total, paid:partner.paid, pending:partner.pending })
    } else {
      const pp = PickupPartners.find(k=>k.name===pickup.PickupPartner)||{}
      setPayContext({ partnerName:pickup.PickupPartner, pickuppartnerId:pp.id||pickup.PickupPartner, pickupId:pickup.id, orderId:pickup.orderId, donorName:pickup.donorName, isPartnerLevel:false, total:pickup._total, paid:pickup._paid, pending:pickup._pending })
    }
  }, [PickupPartners])

  const openWriteOffEntry = useCallback((pickup) => {
    const pp = PickupPartners.find(k=>k.name===pickup.PickupPartner)||{}
    setWriteOffCtx({ mode:'entry', partnerName:pickup.PickupPartner, pickuppartnerId:pp.id||pickup.PickupPartner, pickupId:pickup.id, orderId:pickup.orderId, donorName:pickup.donorName, pending:pickup._pending })
  }, [PickupPartners])

  const openWriteOffPartner = useCallback((partner) => {
    setWriteOffCtx({ mode:'partner', partnerName:partner.partnerName, pickuppartnerId:partner.pickuppartnerId, pending:partner.pending })
  }, [])

  const handlePaySave = useCallback(async ({ amount, date, method, reference, notes, screenshot, isFull }) => {
    if(!payContext) return
    setSaving(true)
    try {
      if(payContext.isPartnerLevel&&isFull) {
        await clearPartnerBalance({ pickuppartnerId:payContext.pickuppartnerId, pickuppartnerName:payContext.partnerName }, { refMode:method, refValue:reference, notes, date, screenshot, writeOff:false })
      } else {
        await recordPickupPartnerPayment(payContext.pickuppartnerId, { pickupId:payContext.isPartnerLevel?undefined:payContext.pickupId, amount, date, refMode:method, refValue:reference, notes, screenshot })
      }
      notify('Payment recorded', 'success', `${money(amount)} from ${payContext.partnerName}`)
      setPayContext(null)
    } catch(err) {
      notify('Payment failed', 'error', 'Please try again.')
    } finally { setSaving(false) }
  }, [payContext, clearPartnerBalance, recordPickupPartnerPayment, notify])

  const handleWriteOffConfirm = useCallback(async ({ reason }) => {
    if(!writeOffCtx) return
    setSaving(true)
    try {
      if(writeOffCtx.mode==='partner') {
        await clearPartnerBalance({ pickuppartnerId:writeOffCtx.pickuppartnerId, pickuppartnerName:writeOffCtx.partnerName }, { refMode:'writeoff', refValue:'', notes:reason, date:new Date().toISOString().slice(0,10), writeOff:true })
      } else {
        await recordPickupPartnerPayment(writeOffCtx.pickuppartnerId, { pickupId:writeOffCtx.pickupId, amount:0, date:new Date().toISOString().slice(0,10), refMode:'writeoff', refValue:'', notes:reason, screenshot:null, writeOff:true })
      }
      notify('Write-off saved', 'success', `${writeOffCtx.partnerName} updated.`)
      setWriteOffCtx(null)
    } catch(err) {
      notify('Write-off failed', 'error')
    } finally { setSaving(false) }
  }, [writeOffCtx, clearPartnerBalance, recordPickupPartnerPayment, notify])

  const handleExport = () => {
    try {
      exportToExcel(partnerRows.map(r => ({ 'Partner':r.partnerName,'Mobile':r.mobile,'Total (₹)':r.total,'Received (₹)':r.paid,'Pending (₹)':r.pending,'Written Off (₹)':r.writeOff,'Pickups':r.count })), 'Partner_Payments')
      notify('Exported', 'success', `${partnerRows.length} partner rows downloaded.`)
    } catch(err) { notify('Export failed', 'error') }
  }

  const collectionPct = kpis.totalRevenue > 0 ? Math.round((kpis.totalReceived/kpis.totalRevenue)*100) : 0

  return (
    <div>
   {/* ── Summary Bar ── */}
<div style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-light)' }}>

  {/* Dark hero row */}
  <div style={{ background: '#1e293b', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>

    {/* Pending amount */}
    <div style={{ flex: '1 1 200px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fca5a5', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 99, padding: '3px 10px', marginBottom: 10 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
        {kpis.totalPending > 0 ? 'Pending Balance' : 'All Clear'}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: kpis.totalPending > 0 ? '#f87171' : '#4ade80' }}>
        {money(kpis.totalPending)}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
        {kpis.withPending} of {kpis.totalPartners} partners have outstanding dues
      </div>
    </div>

    {/* Vertical divider */}
    <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

    {/* Stat cards */}
    <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
      {[
        {
          label: 'Total Billed', value: money(kpis.totalRevenue),
          sub: `${kpis.totalPartners} partners`,
          bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)',
          labelColor: 'rgba(255,255,255,0.4)', valueColor: '#f1f5f9', subColor: 'rgba(255,255,255,0.3)',
        },
        {
          label: 'Received', value: money(kpis.totalReceived),
          sub: `${collectionPct}% collected`,
          bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)',
          labelColor: '#4ade80', valueColor: '#4ade80', subColor: 'rgba(74,222,128,0.6)',
        },
        {
          label: 'Written Off', value: money(kpis.totalWriteOff),
          sub: 'non-recoverable',
          bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)',
          labelColor: 'rgba(255,255,255,0.2)', valueColor: 'rgba(255,255,255,0.25)', subColor: 'rgba(255,255,255,0.15)',
        },
      ].map(s => (
        <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 18px', minWidth: 110 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.labelColor, marginBottom: 6 }}>
            {s.label}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, lineHeight: 1, color: s.valueColor }}>
            {s.value}
          </div>
          <div style={{ fontSize: 10.5, color: s.subColor, marginTop: 4 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  </div>

  {/* Progress strip */}
  {kpis.totalRevenue > 0 && (
    <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border-light)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Collection rate</span>
      <div style={{ flex: 1, height: 6, background: 'var(--border-light)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, collectionPct)}%`, background: collectionPct >= 80 ? '#22c55e' : collectionPct >= 50 ? 'var(--warning)' : 'var(--danger)', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: collectionPct >= 80 ? '#16a34a' : collectionPct >= 50 ? 'var(--warning)' : 'var(--danger)', whiteSpace: 'nowrap' }}>
        {collectionPct}%
      </span>
      {kpis.withPending > 0 && (
        <span style={{ marginLeft: 4, fontSize: 10.5, fontWeight: 600, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
          {kpis.withPending} with pending
        </span>
      )}
    </div>
  )}
</div>

      {/* ── Toolbar ── */}
      <div
        style={{ ...styles.surface, padding: "12px 16px", marginBottom: 14 }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Date pills */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "var(--bg)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: datePreset === p.id ? 700 : 400,
                  color:
                    datePreset === p.id
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  background:
                    datePreset === p.id ? "var(--surface)" : "transparent",
                  boxShadow: datePreset === p.id ? "var(--shadow)" : "none",
                  transition: "all 0.12s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ width: 136, fontSize: 12 }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                –
              </span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ width: 136, fontSize: 12 }}
              />
            </div>
          )}

          <div
            style={{
              height: 20,
              width: 1,
              background: "var(--border-light)",
              flexShrink: 0,
            }}
          />

          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search partner, donor, order…"
              style={{ paddingLeft: 32, width: "100%", fontSize: 13 }}
            />
          </div>
          {/* Partner filter */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            style={{
              fontSize: 13,
              padding: "5px 10px",
              height: 34,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              flexShrink: 0,
              maxWidth: 160,
            }}
          >
            <option value="">All Partners</option>
            {PickupPartners.map((k) => (
              <option key={k.id} value={k.name}>
                {k.name}
              </option>
            ))}
          </select>
          {/* Status filter */}
          <div
            style={{
              display: "flex",
              background: "var(--bg)",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            {[
              { id: "all", label: "All", count: partnerRows.length },
              {
                id: "pending",
                label: "Pending",
                count: partnerRows.filter((r) => r.pending > 0).length,
              },
              {
                id: "clear",
                label: "Paid",
                count: partnerRows.filter((r) => r.pending === 0).length,
              },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: statusFilter === t.id ? 700 : 400,
                  color:
                    statusFilter === t.id
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  background:
                    statusFilter === t.id ? "var(--surface)" : "transparent",
                  boxShadow: statusFilter === t.id ? "var(--shadow)" : "none",
                  transition: "all 0.12s",
                }}
              >
                {t.label}
                <span
                  style={{
                    background:
                      statusFilter === t.id
                        ? t.id === "pending"
                          ? "var(--danger)"
                          : t.id === "clear"
                            ? "var(--secondary)"
                            : "var(--primary)"
                        : "var(--border)",
                    color:
                      statusFilter === t.id ? "white" : "var(--text-muted)",
                    borderRadius: 20,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "0 6px",
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExport}
            style={{ flexShrink: 0 }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      <div
        style={{
          fontSize: 12.5,
          color: "var(--text-muted)",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>
          <strong style={{ color: "var(--text-primary)" }}>
            {partnerRows.length}
          </strong>{" "}
          partners
        </span>
        {kpis.withPending > 0 && statusFilter !== "clear" && (
          <span style={{ color: "var(--danger)", fontWeight: 600 }}>
            · {kpis.withPending} with pending
          </span>
        )}
      </div>

      {/* ── Partner Rows ── */}
      {partnerRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Users size={24} />
          </div>
          <h3>No Partners Found</h3>
          <p>Try adjusting date range or filters.</p>
        </div>
      ) : (
        partnerRows.map((partner) => (
          <PartnerRow
            key={partner.partnerName}
            partner={partner}
            onRecordPayment={openPayModal}
            onWriteOffEntry={openWriteOffEntry}
            onWriteOffPartner={openWriteOffPartner}
            onViewHistory={(p) => setHistPartner(p)}
            canWriteOff={canWriteOff}
          />
        ))
      )}

      {payContext && (
        <RecordPaymentModal
          context={payContext}
          onClose={() => setPayContext(null)}
          onSave={handlePaySave}
          saving={saving}
        />
      )}
      {writeOffCtx && (
        <WriteOffModal
          context={writeOffCtx}
          onClose={() => setWriteOffCtx(null)}
          onConfirm={handleWriteOffConfirm}
          saving={saving}
        />
      )}
      {histPartner && (
        <HistoryModal
          partner={histPartner}
          onClose={() => setHistPartner(null)}
        />
      )}
      <ToastStack toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RST ANALYTICS  
// ══════════════════════════════════════════════════════════════════════════════
function PayBadge({ status }) {
  const MAP = {
    'Paid':           { bg:'var(--secondary-light)', color:'var(--secondary)' },
    'Not Paid':       { bg:'var(--danger-bg)',        color:'var(--danger)' },
    'Partially Paid': { bg:'var(--warning-bg)',       color:'#92400E' },
    'Write Off':      { bg:'var(--border-light)',     color:'var(--text-muted)' },
    'Received':       { bg:'var(--secondary-light)',  color:'var(--secondary)' },
    'Yet to Receive': { bg:'var(--warning-bg)',       color:'#92400E' },
    'Write-off':      { bg:'var(--border-light)',     color:'var(--text-muted)' },
  }
  const c = MAP[status]||{ bg:'var(--border-light)', color:'var(--text-muted)' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:20,
      fontSize:11, fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
      {status}
    </span>
  )
}

function RSTAnalytics({ raddiRecords, pickups }) {
  const [datePreset,   setDatePreset]   = useState('all')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [filterCity,   setFilterCity]   = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [filterPay,    setFilterPay]    = useState('')
  const [search,       setSearch]       = useState('')
  const [sortKey,      setSortKey]      = useState('pickupDate')
  const [sortDir,      setSortDir]      = useState('desc')

  const { from:dateFrom, to:dateTo } = useMemo(() => getDateRange(datePreset,customFrom,customTo), [datePreset,customFrom,customTo])
  const pickupMap = useMemo(() => { const m={}; (pickups||[]).forEach(p=>{m[p.id]=p; if(p.orderId)m[p.orderId]=p}); return m }, [pickups])
  const uniqueSectors = useMemo(() => {
    if(filterCity&&CITY_SECTORS[filterCity]) return CITY_SECTORS[filterCity]
    return [...new Set(raddiRecords.filter(r=>!filterCity||r.city===filterCity).map(r=>r.sector).filter(Boolean))].sort()
  }, [raddiRecords,filterCity])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const rows = raddiRecords.map(r => {
      const pickup=pickupMap[r.orderId]||pickupMap[r.pickupId]||{}
      const total=Number(r.totalAmount)||0, collected=Math.min(total,Number(r.amountPaid)||0)
      const pending=r.paymentStatus==='Write-off'?0:Math.max(0,total-collected)
      return { ...r,total,collected,pending, partnerName:r.PickupPartnerName||pickup.PickupPartner||'Unassigned', donorName:r.name||pickup.donorName||'' }
    }).filter(r => {
      const inDate=(!dateFrom||(r.pickupDate||'')>=dateFrom)&&(!dateTo||(r.pickupDate||'')<=dateTo)
      const inCity=!filterCity||r.city===filterCity
      const inSec=!filterSector||r.sector===filterSector
      const inPay=!filterPay||r.paymentStatus===filterPay
      const inSearch=!q||r.partnerName.toLowerCase().includes(q)||r.donorName.toLowerCase().includes(q)||(r.society||'').toLowerCase().includes(q)||(r.orderId||'').toLowerCase().includes(q)
      return inDate&&inCity&&inSec&&inPay&&inSearch
    })
    rows.sort((a,b) => {
      const av=a[sortKey]??'',bv=b[sortKey]??''
      if(typeof av==='number'||typeof bv==='number') return sortDir==='asc'?Number(av)-Number(bv):Number(bv)-Number(av)
      return sortDir==='asc'?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av))
    })
    return rows
  }, [raddiRecords,pickupMap,dateFrom,dateTo,filterCity,filterSector,filterPay,search,sortKey,sortDir])

  const totals = useMemo(() => ({
    revenue:   filtered.reduce((s,r)=>s+r.total,0),
    collected: filtered.reduce((s,r)=>s+r.collected,0),
    pending:   filtered.reduce((s,r)=>s+r.pending,0),
    kg:        filtered.reduce((s,r)=>s+(Number(r.totalKg)||0),0),
  }), [filtered])

  const toggleSort = (key) => { setSortDir(d=>sortKey===key?(d==='asc'?'desc':'asc'):'desc'); setSortKey(key) }
  const SortTh = ({ k, children, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor:'pointer', userSelect:'none', textAlign:align||'left' }}>
      {children}
      <span style={{ marginLeft:4, opacity:sortKey===k?0.7:0.2 }}>{sortKey===k?(sortDir==='asc'?'↑':'↓'):'↕'}</span>
    </th>
  )

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          { l:'Total Revenue', v:money(totals.revenue), tone:'orange', icon:IndianRupee },
          { l:'Collected',     v:money(totals.collected), tone:'green', icon:CheckCircle },
          { l:'Pending',       v:money(totals.pending), tone:'red', icon:AlertCircle },
          { l:'Weight',        v:`${totals.kg.toFixed(1)} kg`, tone:'blue', icon:Package },
        ].map(item => { const Icon=item.icon; return (
          <div key={item.l} className={`stat-card ${item.tone}`}>
            <div className="stat-icon"><Icon size={18}/></div>
            <div className="stat-value">{item.v}</div>
            <div className="stat-label">{item.l}</div>
          </div>
        )})}
      </div>

      {/* Filters */}
      <div style={{ ...styles.surface, padding:'12px 16px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
          {DATE_PRESETS.map(p=>(
            <button key={p.id} className={`btn btn-sm ${datePreset===p.id?'btn-primary':'btn-ghost'}`} style={{ fontSize:11.5 }} onClick={()=>setDatePreset(p.id)}>{p.label}</button>
          ))}
          {datePreset==='custom'&&(
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{ width:136, fontSize:12 }}/>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>–</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{ width:136, fontSize:12 }}/>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:'2 1 200px' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search partner, donor, order…" style={{ paddingLeft:32, fontSize:12.5, width:'100%' }}/>
          </div>
          <select value={filterCity} onChange={e=>{setFilterCity(e.target.value);setFilterSector('')}} style={{ flex:'1 1 120px', fontSize:12.5 }}>
            <option value="">All Cities</option>
            {CITIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={filterSector} onChange={e=>setFilterSector(e.target.value)} disabled={!filterCity} style={{ flex:'1 1 140px', fontSize:12.5 }}>
            <option value="">{filterCity?'All Sectors':'Select city'}</option>
            {uniqueSectors.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterPay} onChange={e=>setFilterPay(e.target.value)} style={{ flex:'1 1 140px', fontSize:12.5 }}>
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Yet to Receive">Yet to Receive</option>
            <option value="Write-off">Write-off</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={()=>exportToExcel(filtered.map(r=>({'Partner':r.partnerName,'Donor':r.donorName,'Order':r.orderId,'Date':r.pickupDate,'Total':r.total,'Paid':r.collected,'Pending':r.pending,'Status':r.paymentStatus})),'RST_Revenue')}>
            <Download size={13}/> Export
          </button>
        </div>
      </div>

      <div style={{ fontSize:12.5, color:'var(--text-muted)', marginBottom:10 }}>
        <strong style={{ color:'var(--text-primary)' }}>{filtered.length}</strong> records
        {(search||filterCity||filterPay) && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11, marginLeft:8 }} onClick={()=>{setSearch('');setFilterCity('');setFilterSector('');setFilterPay('')}}>
            <X size={10}/> Clear
          </button>
        )}
      </div>

      {filtered.length===0 ? (
        <div className="empty-state"><div className="empty-icon"><BarChart3 size={24}/></div><h3>No records</h3><p>Try different filters.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh k="partnerName">Partner</SortTh>
                <SortTh k="donorName">Donor</SortTh>
                <SortTh k="pickupDate">Date</SortTh>
                <SortTh k="total" align="right">Billed</SortTh>
                <SortTh k="collected" align="right">Received</SortTh>
                <SortTh k="pending" align="right">Pending</SortTh>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.orderId||r.pickupId}>
                  <td>
                    <div style={{ fontWeight:700 }}>{r.partnerName}</div>
                    <OrderIdChip id={r.orderId||r.pickupId}/>
                  </td>
                  <td>
                    <div style={{ fontWeight:600 }}>{r.donorName||'—'}</div>
                    <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{[r.society,r.sector].filter(Boolean).join(', ')}</div>
                  </td>
                  <td style={{ whiteSpace:'nowrap', fontSize:12.5 }}>{fmtDate(r.pickupDate)}</td>
                  <td style={{ textAlign:'right', fontWeight:700, color:'var(--primary)' }}>{money(r.total)}</td>
                  <td style={{ textAlign:'right', fontWeight:700, color:'var(--secondary)' }}>{r.collected>0?money(r.collected):'—'}</td>
                  <td style={{ textAlign:'right', fontWeight:700, color:r.pending>0?'var(--danger)':'var(--text-muted)' }}>{r.pending>0?money(r.pending):'—'}</td>
                  <td><PayBadge status={r.paymentStatus}/></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--secondary-light)', fontWeight:800 }}>
                <td colSpan={3}>Totals ({filtered.length} records)</td>
                <td style={{ textAlign:'right', color:'var(--primary)' }}>{money(totals.revenue)}</td>
                <td style={{ textAlign:'right', color:'var(--secondary)' }}>{money(totals.collected)}</td>
                <td style={{ textAlign:'right', color:totals.pending>0?'var(--danger)':'var(--secondary)' }}>{totals.pending>0?money(totals.pending):'All clear ✓'}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SKS PAYMENT ANALYTICS  
// ══════════════════════════════════════════════════════════════════════════════
function SKSPaymentAnalytics() {
  const { sksOutflows } = useApp()
  const [datePreset, setDatePreset] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const { from:dateFrom, to:dateTo } = useMemo(() => getDateRange(datePreset,customFrom,customTo), [datePreset,customFrom,customTo])
  const enriched = useMemo(() => (sksOutflows||[]).map(r => {
    const pay=r.payment||{}
    const paid=Number(pay.amount)||0, total=Number(pay.totalValue)||0
    return { ...r, _paid:paid, _total:total, _pending:Math.max(0,total-paid), _status:pay.status||(total===0?'Not Recorded':paid>=total?'Paid':paid>0?'Partially Paid':'Not Paid'), _method:(pay.method||'CASH').toUpperCase(), _screenshot:pay.screenshot||null }
  }), [sksOutflows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return enriched.filter(r => {
      const inDate=(!dateFrom||(r.date||'')>=dateFrom)&&(!dateTo||(r.date||'')<=dateTo)
      const inStatus=!filterStatus||r._status===filterStatus
      const inSearch=!q||(r.partnerName||'').toLowerCase().includes(q)||(r.id||'').toLowerCase().includes(q)
      return inDate&&inStatus&&inSearch
    }).sort((a,b) => {
      const av=a[sortKey]??'',bv=b[sortKey]??''
      if(['_paid','_total','_pending'].includes(sortKey)) return sortDir==='asc'?Number(av)-Number(bv):Number(bv)-Number(av)
      return sortDir==='asc'?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av))
    })
  }, [enriched,dateFrom,dateTo,filterStatus,search,sortKey,sortDir])

  const kpis = useMemo(() => ({
    totalPaid:    filtered.reduce((s,r)=>s+r._paid,0),
    totalPending: filtered.reduce((s,r)=>s+r._pending,0),
    totalItems:   filtered.reduce((s,r)=>s+(r.items||[]).reduce((a,it)=>a+it.qty,0),0),
  }), [filtered])

  if((sksOutflows||[]).length === 0) {
    return (
      <div className="empty-state" style={{ padding:80 }}>
        <div className="empty-icon" style={{ background:'var(--info-bg)', color:'var(--info)' }}><Gift size={28}/></div>
        <h3>No SKS Dispatches Yet</h3>
        <p>Dispatch goods from the SKS Stock page to see payment analytics here.</p>
      </div>
    )
  }

  const toggleSort = (key) => { setSortDir(d=>sortKey===key?(d==='asc'?'desc':'asc'):'desc'); setSortKey(key) }
  const SortTh = ({ k, children, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor:'pointer', userSelect:'none', textAlign:align||'left' }}>
      {children}<span style={{ marginLeft:4, opacity:sortKey===k?0.7:0.2 }}>{sortKey===k?(sortDir==='asc'?'↑':'↓'):'↕'}</span>
    </th>
  )

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        <div className="stat-card blue"><div className="stat-icon"><Package size={18}/></div><div className="stat-value">{filtered.length}</div><div className="stat-label">Dispatches</div><div className="stat-change up">{kpis.totalItems} items</div></div>
        <div className="stat-card green"><div className="stat-icon"><CheckCircle size={18}/></div><div className="stat-value">{fmtCurrency(kpis.totalPaid)}</div><div className="stat-label">Received</div></div>
        <div className="stat-card red"><div className="stat-icon"><AlertCircle size={18}/></div><div className="stat-value">{fmtCurrency(kpis.totalPending)}</div><div className="stat-label">Pending</div></div>
      </div>

      <div style={{ ...styles.surface, padding:'12px 16px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
          {DATE_PRESETS.map(p=>(
            <button key={p.id} className={`btn btn-sm ${datePreset===p.id?'btn-primary':'btn-ghost'}`} style={{ fontSize:11.5 }} onClick={()=>setDatePreset(p.id)}>{p.label}</button>
          ))}
          {datePreset==='custom'&&(
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{ width:136, fontSize:12 }}/>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>–</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{ width:136, fontSize:12 }}/>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:'2 1 200px' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search recipient or dispatch ID…" style={{ paddingLeft:32, fontSize:12.5, width:'100%' }}/>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ flex:'1 1 140px', fontSize:12.5 }}>
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Not Paid">Not Paid</option>
            <option value="Not Recorded">Not Recorded</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(filtered.map(r=>({'ID':r.id,'Date':r.date,'Recipient':r.partnerName,'Items':(r.items||[]).map(it=>`${it.name} ×${it.qty}`).join(', '),'Received (₹)':r._paid,'Pending (₹)':r._pending,'Status':r._status})),'SKS_Payment')}>
            <Download size={13}/> Export
          </button>
        </div>
      </div>

      {filtered.length===0 ? (
        <div className="empty-state"><div className="empty-icon"><Package size={24}/></div><h3>No records match</h3><p>Adjust filters.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh k="id">ID</SortTh>
                <SortTh k="date">Date</SortTh>
                <SortTh k="partnerName">Recipient</SortTh>
                <th>Items</th>
                <SortTh k="_paid" align="right">Received</SortTh>
                <SortTh k="_pending" align="right">Pending</SortTh>
                <th>Status</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><code style={{ fontSize:11, fontWeight:700, color:'var(--secondary)', background:'var(--secondary-light)', padding:'2px 7px', borderRadius:5 }}>{r.id}</code></td>
                  <td style={{ whiteSpace:'nowrap', fontWeight:600, fontSize:12.5 }}>{fmtDate(r.date)}</td>
                  <td><div style={{ fontWeight:700 }}>{r.partnerName||'—'}</div>{r.partnerPhone&&<div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{r.partnerPhone}</div>}</td>
                  <td>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {(r.items||[]).slice(0,3).map(it=>(
                        <span key={it.name} style={{ fontSize:10, padding:'1px 6px', borderRadius:20, background:'var(--info-bg)', color:'var(--info)', fontWeight:600 }}>{it.name} ×{it.qty}</span>
                      ))}
                      {(r.items||[]).length>3&&<span style={{ fontSize:10, color:'var(--text-muted)' }}>+{r.items.length-3}</span>}
                    </div>
                  </td>
                  <td style={{ textAlign:'right', fontWeight:700, color:r._paid>0?'var(--secondary)':'var(--text-muted)' }}>{r._paid>0?money(r._paid):'—'}</td>
                  <td style={{ textAlign:'right', fontWeight:700, color:r._pending>0?'var(--danger)':'var(--text-muted)' }}>{r._pending>0?money(r._pending):'—'}</td>
                  <td><PayBadge status={r._status}/></td>
                  <td>{r._screenshot?<ScreenshotThumb src={r._screenshot} size={36}/>:<span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAYMENTS PAGE 
// ══════════════════════════════════════════════════════════════════════════════
export default function Payments() {
  const { pickups, PickupPartners, raddiRecords, recordPickupPartnerPayment, clearPartnerBalance } = useApp()
  const [activeTab, setActiveTab] = useState('partners')

  const TABS = [
    { id:'partners', label:'Revenue Collection',   desc:'Track and record dues from pickup partners' },
    { id:'rst',      label:'RST Analytics',         desc:'Per-order revenue and payment status' },
    { id:'sks',      label:'SKS Payments',          desc:'Dispatch payment records' },
  ]

  return (
    <div className="page-body">
      {/* Tab bar */}
      <div style={{ marginBottom:24, borderBottom:'1px solid var(--border-light)' }}>
        <div style={{ display:'flex', gap:0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding:'12px 22px', border:'none', cursor:'pointer',
                fontSize:13.5, fontWeight:activeTab===tab.id?700:500,
                color:activeTab===tab.id?'var(--primary)':'var(--text-muted)',
                background:'transparent',
                borderBottom:`2.5px solid ${activeTab===tab.id?'var(--primary)':'transparent'}`,
                transition:'all 0.15s', marginBottom:-1,
                outline:'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab description */}
      <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
        {TABS.find(t=>t.id===activeTab)?.desc}
      </div>

      {activeTab==='partners' && (
        <PartnerPaymentHub pickups={pickups} PickupPartners={PickupPartners}
          recordPickupPartnerPayment={recordPickupPartnerPayment}
          clearPartnerBalance={clearPartnerBalance}/>
      )}
      {activeTab==='rst' && <RSTAnalytics raddiRecords={raddiRecords} pickups={pickups}/>}
      {activeTab==='sks' && <SKSPaymentAnalytics/>}
    </div>
  )
}