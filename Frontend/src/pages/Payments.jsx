// Frontend/src/pages/Payments.jsx
// REDESIGNED: Partner Payments — simple, clean, easy for non-technical users
// RST Revenue Analytics & SKS Payment Analytics kept as-is

import { useMemo, useState, useCallback } from 'react'
import {
  AlertCircle, BarChart3, Calendar, CheckCircle, CreditCard,
  Download, FileText, History, Image, IndianRupee, AlertTriangle,
  Plus, Search, Smartphone, Upload, X, Hash, MapPin,
  ChevronDown, ChevronUp, Truck, Clock,
  Phone, Filter, Lock, RefreshCw, Package,
  Eye, ShoppingBag, Gift, Users, TrendingUp,
  ArrowRight, Wallet, BadgeCheck,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'
import { fmtDate, fmtCurrency, exportToExcel } from '../utils/helpers'
import { CITIES, CITY_SECTORS } from '../data/mockData'

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_PRIORITY = { 'Not Paid': 0, 'Partially Paid': 1, 'Paid': 2, 'Write Off': 3 }

const REF_MODES = [
  { value: 'cash',   label: 'Cash',          icon: IndianRupee,  placeholder: 'Receipt number (optional)' },
  { value: 'upi',    label: 'UPI',           icon: Smartphone,   placeholder: 'UPI transaction ID' },
  { value: 'bank',   label: 'Bank Transfer', icon: CreditCard,   placeholder: 'Bank reference number' },
  { value: 'cheque', label: 'Cheque',        icon: FileText,     placeholder: 'Cheque number' },
]

const DATE_PRESETS = [
  { id: 'all',        label: 'All Time' },
  { id: 'month',      label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom',     label: 'Custom' },
]

const padM = (n) => String(n).padStart(2, '0')
const money = (n) => fmtCurrency(Number(n) || 0)
const refModeLabel = (m) => REF_MODES.find(r => r.value === m)?.label || m || 'Cash'

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
  if (preset === 'month') return { from: `${y}-${padM(m + 1)}-01`, to: fmt(now) }
  if (preset === 'last_month') {
    const lm = m === 0 ? 11 : m - 1; const ly = m === 0 ? y - 1 : y
    const last = new Date(ly, lm + 1, 0).getDate()
    return { from: `${ly}-${padM(lm + 1)}-01`, to: `${ly}-${padM(lm + 1)}-${padM(last)}` }
  }
  if (preset === 'custom') return { from: customFrom || '', to: customTo || '' }
  return { from: '', to: '' }
}

// ── Image viewer helper ───────────────────────────────────────────────────────
function openImageInTab(src, title = 'Payment Proof') {
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style></head><body><img src="${src}" style="max-width:100vw;max-height:100vh;object-fit:contain;"/></body></html>`)
  win.document.close()
}

function ScreenshotThumb({ src, label = 'Payment Proof', size = 48 }) {
  if (!src) return null
  return (
    <div onClick={() => openImageInTab(src, label)} title="Click to view"
      style={{ cursor: 'pointer', width: size, height: size, borderRadius: 7, overflow: 'hidden', border: '2px solid var(--secondary)', flexShrink: 0, position: 'relative', background: 'var(--bg)', display: 'inline-block' }}>
      <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

function OrderIdChip({ id }) {
  if (!id) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 7px', borderRadius: 5, border: '1px solid rgba(232,82,26,0.18)', whiteSpace: 'nowrap', flexShrink: 0 }}>
      <Hash size={9} />{id}
    </span>
  )
}

// ── Status dot with label ─────────────────────────────────────────────────────
function StatusPill({ status }) {
  const MAP = {
    'Paid':           { dot: 'var(--secondary)', label: 'Paid',           bg: 'var(--secondary-light)', color: 'var(--secondary)' },
    'Not Paid':       { dot: 'var(--danger)',    label: 'Not Paid',        bg: 'var(--danger-bg)',       color: 'var(--danger)'   },
    'Partially Paid': { dot: 'var(--warning)',   label: 'Partially Paid',  bg: 'var(--warning-bg)',      color: '#92400E'         },
    'Write Off':      { dot: 'var(--text-muted)',label: 'Write Off',       bg: 'var(--border-light)',    color: 'var(--text-muted)' },
  }
  const c = MAP[status] || MAP['Not Paid']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: c.bg, color: c.color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

function CompactMethodPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {REF_MODES.map(mode => {
        const Icon = mode.icon
        const active = value === mode.value
        return (
          <button key={mode.value} type="button" onClick={() => onChange(mode.value)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 9, cursor: 'pointer', border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary-light)' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-muted)', fontWeight: active ? 700 : 400, fontSize: 11.5, transition: 'all 0.12s' }}>
            <Icon size={15} />
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RECORD PAYMENT MODAL — kept same logic, cleaned up UI
// ══════════════════════════════════════════════════════════════════════════════
function RecordPaymentModal({ context, onClose, onSave, saving }) {
  const [amount,     setAmount]     = useState(() => context.pending > 0 ? String(Math.round(context.pending)) : '')
  const [date,       setDate]       = useState(() => new Date().toISOString().slice(0, 10))
  const [method,     setMethod]     = useState('cash')
  const [reference,  setReference]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [error,      setError]      = useState('')

  const entered  = Number(amount) || 0
  const afterPay = Math.max(0, context.pending - entered)
  const isFull   = entered > 0 && entered >= context.pending - 0.01
  const hasRef   = method !== 'cash'

  const REF_LABELS = { upi: 'UPI Transaction ID', bank: 'Bank Reference No.', cheque: 'Cheque Number' }

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setScreenshot(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (context.pending <= 0) { setError('No pending balance.'); return }
    if (entered <= 0)         { setError('Please enter a valid amount.'); return }
    if (entered > context.pending + 0.01) { setError(`Maximum allPending: ${money(context.pending)}`); return }
    if (hasRef && !reference.trim()) { setError(`Please enter the ${REF_LABELS[method] || 'reference number'}.`); return }
    onSave({ amount: entered, date, method, reference: reference.trim(), notes: notes.trim(), screenshot, isFull })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440, width: '95vw' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px 14px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IndianRupee size={18} color="var(--primary)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="modal-title" style={{ fontSize: 15 }}>Record Payment</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {context.partnerName}{context.donorName ? ` · ${context.donorName}` : ''}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={15}/></button>
        </div>

        {/* Balance summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--surface-alt)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
          {[
            { label: 'Total',   val: money(context.total),   color: 'var(--text-primary)' },
            { label: 'Paid',    val: money(context.paid),    color: 'var(--secondary)' },
            { label: 'Balance', val: money(context.pending), color: context.pending > 0 ? 'var(--danger)' : 'var(--secondary)' },
          ].map((item, i) => (
            <div key={item.label} style={{ textAlign: 'center', padding: '12px 4px', borderLeft: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {context.pending <= 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--secondary)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--secondary)', marginBottom: 4 }}>Fully Paid!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No balance remaining for this entry.</div>
          </div>
        ) : (
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Amount + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 12 }}>
                  Amount to Record (₹) <span className="required">*</span>
                  {isFull && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--secondary)', fontWeight: 700, background: 'var(--secondary-light)', padding: '1px 6px', borderRadius: 20 }}>Full Balance ✓</span>}
                </label>
                <input type="number" min={0} max={context.pending} inputMode="decimal"
                  value={amount} onChange={e => { setAmount(e.target.value); setError('') }}
                  placeholder={`Max ${money(context.pending)}`} autoFocus
                  style={{ fontWeight: 700, fontSize: 15, borderColor: entered > 0 ? 'var(--primary)' : undefined }} />
                {entered > 0 && afterPay > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 3, fontWeight: 600 }}>Still Pending after: {money(afterPay)}</div>
                )}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 12 }}>Payment Date <span className="required">*</span></label>
                <input type="date" value={date} onChange={e => { setDate(e.target.value); setError('') }} />
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>How was it paid? <span className="required">*</span></label>
              <CompactMethodPicker value={method} onChange={m => { setMethod(m); setReference(''); setScreenshot(null); setError('') }} />
            </div>

            {hasRef && (
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 12 }}>{REF_LABELS[method]} <span className="required">*</span></label>
                <input value={reference} onChange={e => { setReference(e.target.value); setError('') }}
                  placeholder={REF_MODES.find(r => r.value === method)?.placeholder || 'Reference'} />
              </div>
            )}

            {method === 'upi' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Image size={12} color="var(--info)" /> UPI Screenshot
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                {screenshot ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <ScreenshotThumb src={screenshot} label="UPI Proof" />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary)', marginBottom: 4 }}>Screenshot attached ✓</div>
                      <button type="button" onClick={() => setScreenshot(null)}
                        style={{ fontSize: 11.5, color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', cursor: 'pointer' }}>
                    <Upload size={13} /> Upload Screenshot
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScreenshot} />
                  </label>
                )}
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>Notes <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks…" />
            </div>

            {error && (
              <div style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 8 }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
              </div>
            )}
          </div>
        )}

        <div className="modal-footer" style={{ padding: '12px 20px', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          {context.pending > 0 && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || entered <= 0}
              style={{ flex: 2, justifyContent: 'center' }}>
              {saving ? 'Saving…' : isFull ? '✓ Mark as Fully Paid' : `Record ${entered > 0 ? money(entered) : 'Payment'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// WRITE-OFF MODAL
// ══════════════════════════════════════════════════════════════════════════════
function WriteOffModal({ context, onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (!reason.trim()) { setError('Please describe why this amount is being written off.'); return }
    if (!confirmed)     { setError('Please check the confirmation box to continue.'); return }
    onConfirm({ reason: reason.trim() })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header" style={{ background: 'var(--danger-bg)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={18} color="var(--danger)" />
          <div>
            <div className="modal-title" style={{ color: 'var(--danger)' }}>Write Off Amount</div>
            <div style={{ fontSize: 11.5, color: 'var(--danger)', opacity: 0.75, marginTop: 1 }}>
              {context.partnerName} · {money(context.pending)} will be marked as uncollectable
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{ margin: '0 0 16px' }}>
            <label>Reason for write-off <span className="required">*</span></label>
            <textarea value={reason} onChange={e => { setReason(e.target.value); setError('') }}
              placeholder="e.g. Partner unreachable, amount disputed…" style={{ minHeight: 80 }} autoFocus />
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${confirmed ? 'var(--danger)' : 'var(--border)'}`, background: confirmed ? 'var(--danger-bg)' : 'var(--surface)', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}
            onClick={() => { setConfirmed(c => !c); setError('') }}>
            <input type="checkbox" checked={confirmed} onChange={() => {}} style={{ width: 16, height: 16, accentColor: 'var(--danger)', flexShrink: 0, marginTop: 2, cursor: 'pointer', padding: 0, border: 'none' }} />
            <div style={{ fontSize: 12.5, color: confirmed ? 'var(--danger)' : 'var(--text-secondary)' }}>
              I understand this cannot be undone. The amount of <strong>{money(context.pending)}</strong> will be permanently marked as non-recoverable.
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={13} />{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={saving || !reason.trim() || !confirmed}>
            {saving ? 'Processing…' : `Write Off ${money(context.pending)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT HISTORY MODAL
// ══════════════════════════════════════════════════════════════════════════════
function HistoryModal({ partner, onClose }) {
  const entries = (partner.history || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <History size={18} color="var(--info)" />
          <div className="modal-title">Payment History — {partner.partnerName}</div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding: 28 }}><p>No payments recorded yet.</p></div>
          ) : entries.map((e, i) => (
            <div key={`${e.pickupId}-${i}`} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < entries.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: e.refMode === 'writeoff' ? 'var(--danger-bg)' : 'var(--secondary-light)', color: e.refMode === 'writeoff' ? 'var(--danger)' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {e.refMode === 'writeoff' ? <AlertTriangle size={16} /> : <IndianRupee size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: e.refMode === 'writeoff' ? 'var(--danger)' : 'var(--secondary)' }}>
                    {e.refMode === 'writeoff' ? 'Written Off' : money(e.amount)}
                  </strong>
                  <span className="badge badge-muted" style={{ fontSize: 10 }}>{refModeLabel(e.refMode)}</span>
                  <OrderIdChip id={e.orderId || e.pickupId} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{e.donorName || '—'}{e.refValue ? ` · Ref: ${e.refValue}` : ''}</div>
                {e.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{e.notes}</div>}
                {e.screenshot && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ScreenshotThumb src={e.screenshot} size={44} />
                    <button onClick={() => openImageInTab(e.screenshot)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--secondary)', background: 'var(--secondary-light)', cursor: 'pointer', color: 'var(--secondary)', fontWeight: 600 }}>
                      <Eye size={10} style={{ marginRight: 4 }} />View Proof
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDate(e.date)}</div>
            </div>
          ))}
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PICKUP ROW — compact row inside the expandable ledger
// ══════════════════════════════════════════════════════════════════════════════
function PickupRow({ pickup, onPay, onWriteOff, canWriteOff }) {
  const total   = Number(pickup.totalValue) || 0
  const paid    = Math.min(total, Number(pickup.amountPaid) || 0)
  const pending = Math.max(0, total - paid)
  const ps      = pickup.paymentStatus || getPickupPayStatus(total, paid)
  const isPending = ps === 'Not Paid' || ps === 'Partially Paid'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      borderBottom: '1px solid var(--border-light)',
      background: pending > 0 ? 'rgba(239,68,68,0.02)' : 'transparent',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <OrderIdChip id={pickup.orderId || pickup.id} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{pickup.donorName}</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtDate(pickup.date)}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
          {total > 0 && <span style={{ color: 'var(--text-secondary)' }}>Billed: <strong style={{ color: 'var(--primary)' }}>{money(total)}</strong></span>}
          {paid  > 0 && <span style={{ color: 'var(--text-secondary)' }}>Received: <strong style={{ color: 'var(--secondary)' }}>{money(paid)}</strong></span>}
          {pending > 0 && <span style={{ color: 'var(--text-secondary)' }}>Pending: <strong style={{ color: 'var(--danger)' }}>{money(pending)}</strong></span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <StatusPill status={ps} />
        {isPending && pending > 0 && (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => onPay({ pickup: { ...pickup, _total: total, _paid: paid, _pending: pending } })}
              style={{ fontSize: 11.5, padding: '5px 12px' }}>
              Pay
            </button>
            {canWriteOff && (
              <button onClick={() => onWriteOff({ ...pickup, _total: total, _paid: paid, _pending: pending })}
                style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'var(--danger-bg)', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600 }}>
                Write Off
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTNER CARD — redesigned for clarity and ease of use
// ══════════════════════════════════════════════════════════════════════════════
function PartnerCard({ partner, onRecordPayment, onWriteOffEntry, onWriteOffPartner, onViewHistory, canWriteOff }) {
  const [open, setOpen] = useState(false)

  const collPct     = partner.total > 0 ? Math.round((partner.paid / partner.total) * 100) : 0
  const allPaid     = partner.pending === 0
  const urgentCount = partner.records.filter(p => {
    const ps = p.paymentStatus || getPickupPayStatus(p.totalValue, p.amountPaid)
    return ps === 'Not Paid' || ps === 'Partially Paid'
  }).length

  // Determine card accent color
  const accentColor = allPaid ? 'var(--secondary)' : urgentCount > 0 ? 'var(--danger)' : 'var(--warning)'
  const statusLabel = allPaid ? 'All Clear' : `${urgentCount} pickup${urgentCount !== 1 ? 's' : ''} pending`
  const statusBg    = allPaid ? 'var(--secondary-light)' : urgentCount > 0 ? 'var(--danger-bg)' : 'var(--warning-bg)'
  const statusColor = allPaid ? 'var(--secondary)' : urgentCount > 0 ? 'var(--danger)' : '#92400E'

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
      marginBottom: 14,
      transition: 'box-shadow 0.15s',
    }}>
      {/* ── TOP ACCENT BAR ── */}
      <div style={{ height: 4, background: accentColor }} />

      {/* ── PARTNER IDENTITY ROW ── */}
      <div style={{ padding: '16px 20px 14px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: allPaid ? 'var(--secondary-light)' : 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
          color: allPaid ? 'var(--secondary)' : 'var(--primary)',
        }}>
          {(partner.partnerName || '?')[0].toUpperCase()}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {partner.pickuppartnerId && (
              <span style={{ fontFamily: 'monospace', fontSize: 10.5, fontWeight: 800, color: 'white', background: 'var(--secondary)', padding: '1px 7px', borderRadius: 4 }}>
                {partner.pickuppartnerId}
              </span>
            )}
            <span style={{ fontWeight: 800, fontSize: 16 }}>{partner.partnerName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {partner.mobile && (
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={11} /> {partner.mobile}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusBg, color: statusColor }}>
              {allPaid ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
              {statusLabel}
            </span>
          </div>
        </div>

        {/* History button */}
        <button className="btn btn-ghost btn-sm" onClick={() => onViewHistory(partner)} style={{ flexShrink: 0, fontSize: 12 }}>
          <History size={13} /> History
        </button>
      </div>

      {/* ── MONEY SUMMARY ── */}
      <div style={{
        margin: '0 20px 14px',
        background: 'var(--bg)',
        borderRadius: 12,
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
      }}>
        {/* Three money boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[
            { label: 'Total Valued',   val: money(partner.total),   color: 'var(--text-primary)',   icon: IndianRupee, hint: 'Total value of all pickups' },
            { label: 'Money Received', val: money(partner.paid),    color: 'var(--secondary)',       icon: CheckCircle, hint: 'Amount already collected' },
            { label: 'Still Pending',     val: money(partner.pending), color: partner.pending > 0 ? 'var(--danger)' : 'var(--secondary)', icon: Wallet, hint: 'Pending balance to collect' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={item.label} title={item.hint} style={{
                padding: '14px 12px', textAlign: 'center',
                borderLeft: i > 0 ? '1px solid var(--border-light)' : 'none',
                cursor: 'help',
              }}>
                <Icon size={14} color={item.color} style={{ margin: '0 auto 6px', display: 'block' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: item.color, lineHeight: 1, marginBottom: 4 }}>
                  {item.val}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        {partner.total > 0 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-light)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Collection progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: collPct === 100 ? 'var(--secondary)' : collPct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {collPct}% collected
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
                width: `${Math.min(100, collPct)}%`,
                background: collPct === 100 ? 'var(--secondary)' : collPct >= 50 ? 'var(--warning)' : 'var(--danger)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{partner.records.length} pickup{partner.records.length !== 1 ? 's' : ''}</span>
              {partner.writeOff > 0 && <span style={{ color: 'var(--text-muted)' }}>Written off: {money(partner.writeOff)}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Toggle pickup details */}
        <button
          className={`btn btn-ghost btn-sm`}
          onClick={() => setOpen(o => !o)}
          style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {open ? 'Hide Pickups' : `View ${partner.records.length} Pickup${partner.records.length !== 1 ? 's' : ''}`}
        </button>

        <div style={{ flex: 1 }} />

        {partner.pending > 0 ? (
          <>
            <button
              className="btn btn-primary"
              onClick={() => onRecordPayment({ partner })}
              style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px' }}
            >
              <IndianRupee size={14} />
              Record Payment
            </button>
            {canWriteOff && (
              <button
                onClick={() => onWriteOffPartner(partner)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1.5px solid rgba(239,68,68,0.4)', background: 'var(--danger-bg)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                Write Off All
              </button>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--secondary)', padding: '8px 16px', background: 'var(--secondary-light)', borderRadius: 8 }}>
            <BadgeCheck size={15} /> Fully Paid
          </div>
        )}
      </div>

      {/* ── EXPANDABLE PICKUP LIST ── */}
      {open && (
        <div style={{ borderTop: '2px solid var(--border-light)' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 6px', background: 'var(--surface-alt)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pickup Records
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{partner.records.length} total</span>
          </div>
          {/* Pickup rows */}
          <div>
            {[...partner.records]
              .sort((a, b) => {
                const ap = STATUS_PRIORITY[a.paymentStatus || getPickupPayStatus(a.totalValue, a.amountPaid)] ?? 99
                const bp = STATUS_PRIORITY[b.paymentStatus || getPickupPayStatus(b.totalValue, b.amountPaid)] ?? 99
                if (ap !== bp) return ap - bp
                return (b.date || '').localeCompare(a.date || '')
              })
              .map(r => (
                <PickupRow
                  key={r.id || r.orderId}
                  pickup={r}
                  onPay={onRecordPayment}
                  onWriteOff={(p) => {
                    const pickuppartner = { id: partner.pickuppartnerId }
                    onWriteOffEntry(p)
                  }}
                  canWriteOff={canWriteOff}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTNER PAYMENT HUB — redesigned main view
// ══════════════════════════════════════════════════════════════════════════════
function PartnerPaymentHub({ pickups, PickupPartners, recordPickupPartnerPayment, clearPartnerBalance }) {
  const { role } = useRole()
  const canWriteOff = role === 'admin' || role === 'manager'

  const [datePreset,   setDatePreset]   = useState('all')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')   // 'all' | 'pending' | 'clear'
  const [globalSearch, setGlobalSearch] = useState('')

  const [payContext,   setPayContext]   = useState(null)
  const [writeOffCtx,  setWriteOffCtx]  = useState(null)
  const [histPartner,  setHistPartner]  = useState(null)
  const [saving,       setSaving]       = useState(false)

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  const pickuppartnerNames = useMemo(() =>
    [...new Set(pickups.map(p => p.PickupPartner).filter(Boolean))].sort(),
    [pickups]
  )

  // Build partner rows
  const partnerRows = useMemo(() => {
    const q = globalSearch.toLowerCase().trim()
    const relevantPickups = pickups.filter(p => {
      if (p.status !== 'Completed') return false
      if (!p.PickupPartner) return false
      const inDate   = (!dateFrom || (p.date || '') >= dateFrom) && (!dateTo || (p.date || '') <= dateTo)
      const inSearch = !q || (p.PickupPartner || '').toLowerCase().includes(q) || (p.donorName || '').toLowerCase().includes(q) || (p.orderId || '').toLowerCase().includes(q)
      return inDate && inSearch
    })

    const map = {}
    relevantPickups.forEach(p => {
      const name      = p.PickupPartner
      const pickuppartner = PickupPartners.find(k => k.name === name) || {}
      if (!map[name]) {
        map[name] = {
          pickuppartnerId: pickuppartner.id || name,
          partnerName: name,
          mobile: pickuppartner.mobile || p.pickuppartneradiMobile || '',
          total: 0, paid: 0, pending: 0, writeOff: 0,
          count: 0, records: [], history: [],
        }
      }
      const total   = Number(p.totalValue) || 0
      const paid    = Math.min(total, Number(p.amountPaid) || 0)
      const ps      = p.paymentStatus || getPickupPayStatus(total, paid)
      const isWO    = ps === 'Write Off'
      const pend    = isWO ? 0 : Math.max(0, total - paid)
      const wo      = isWO ? Math.max(0, total - paid) : 0

      const history = (p.payHistory || []).map(h => ({ ...h, pickupId: p.id, orderId: p.orderId, donorName: p.donorName }))
      map[name].total    += total
      map[name].paid     += paid
      map[name].pending  += pend
      map[name].writeOff += wo
      map[name].count    += 1
      map[name].records.push(p)
      map[name].history.push(...history)
    })

    let rows = Object.values(map).sort((a, b) => b.pending - a.pending || a.partnerName.localeCompare(b.partnerName))

    if (statusFilter === 'pending') rows = rows.filter(r => r.pending > 0)
    if (statusFilter === 'clear')   rows = rows.filter(r => r.pending === 0)

    return rows
  }, [pickups, PickupPartners, dateFrom, dateTo, globalSearch, statusFilter])

  const globalKPIs = useMemo(() => ({
    totalPartners:  partnerRows.length,
    withPending:    partnerRows.filter(r => r.pending > 0).length,
    totalRevenue:   partnerRows.reduce((s, r) => s + r.total,    0),
    totalReceived:  partnerRows.reduce((s, r) => s + r.paid,     0),
    totalPending:   partnerRows.reduce((s, r) => s + r.pending,  0),
    totalWriteOff:  partnerRows.reduce((s, r) => s + r.writeOff, 0),
  }), [partnerRows])

  // Actions
  const openPayModal = useCallback(({ partner, pickup }) => {
    if (partner) {
      setPayContext({ partnerName: partner.partnerName, pickuppartnerId: partner.pickuppartnerId, mobile: partner.mobile, isPartnerLevel: true, total: partner.total, paid: partner.paid, pending: partner.pending })
    } else {
      const pp = PickupPartners.find(k => k.name === pickup.PickupPartner) || {}
      setPayContext({ partnerName: pickup.PickupPartner, pickuppartnerId: pp.id || pickup.PickupPartner, pickupId: pickup.id, orderId: pickup.orderId, donorName: pickup.donorName, isPartnerLevel: false, total: pickup._total, paid: pickup._paid, pending: pickup._pending })
    }
  }, [PickupPartners])

  const openWriteOffEntry = useCallback((pickup) => {
    const pp = PickupPartners.find(k => k.name === pickup.PickupPartner) || {}
    setWriteOffCtx({ mode: 'entry', partnerName: pickup.PickupPartner, pickuppartnerId: pp.id || pickup.PickupPartner, pickupId: pickup.id, orderId: pickup.orderId, donorName: pickup.donorName, pending: pickup._pending })
  }, [PickupPartners])

  const openWriteOffPartner = useCallback((partner) => {
    setWriteOffCtx({ mode: 'partner', partnerName: partner.partnerName, pickuppartnerId: partner.pickuppartnerId, pending: partner.pending })
  }, [])

  const handlePaySave = useCallback(async ({ amount, date, method, reference, notes, screenshot, isFull }) => {
    if (!payContext) return
    setSaving(true)
    try {
      if (payContext.isPartnerLevel && isFull) {
        await clearPartnerBalance(
          { pickuppartnerId: payContext.pickuppartnerId, pickuppartnerName: payContext.partnerName },
          { refMode: method, refValue: reference, notes, date, screenshot, writeOff: false }
        )
      } else {
        await recordPickupPartnerPayment(payContext.pickuppartnerId, {
          pickupId: payContext.isPartnerLevel ? undefined : payContext.pickupId,
          amount, date, refMode: method, refValue: reference, notes, screenshot,
        })
      }
      setPayContext(null)
    } finally { setSaving(false) }
  }, [payContext, clearPartnerBalance, recordPickupPartnerPayment])

  const handleWriteOffConfirm = useCallback(async ({ reason }) => {
    if (!writeOffCtx) return
    setSaving(true)
    try {
      if (writeOffCtx.mode === 'partner') {
        await clearPartnerBalance(
          { pickuppartnerId: writeOffCtx.pickuppartnerId, pickuppartnerName: writeOffCtx.partnerName },
          { refMode: 'writeoff', refValue: '', notes: reason, date: new Date().toISOString().slice(0, 10), writeOff: true }
        )
      } else {
        await recordPickupPartnerPayment(writeOffCtx.pickuppartnerId, {
          pickupId: writeOffCtx.pickupId, amount: 0,
          date: new Date().toISOString().slice(0, 10),
          refMode: 'writeoff', refValue: '', notes: reason, screenshot: null, writeOff: true,
        })
      }
      setWriteOffCtx(null)
    } finally { setSaving(false) }
  }, [writeOffCtx, clearPartnerBalance, recordPickupPartnerPayment])

  const handleExport = () => exportToExcel(
    partnerRows.map(r => ({
      'Pickup Partner': r.partnerName, 'Mobile': r.mobile,
      'Total Value (₹)': r.total, 'Money Received (₹)': r.paid,
      'Still Pending (₹)': r.pending, 'Written Off (₹)': r.writeOff, 'Pickups': r.count,
    })),
    'Pickup_Partner_Payments'
  )

  return (
    <div>
      {/* ── SUMMARY BANNER ── */}
      {globalKPIs.totalPending > 0 ? (
        <div style={{
          marginBottom: 20, padding: '16px 20px',
          background: 'linear-gradient(135deg, #FEE2E2 0%, #FFF9F5 100%)',
          borderRadius: 'var(--radius)', border: '1.5px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={20} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--danger)' }}>
              {money(globalKPIs.totalPending)} still to collect
            </div>
            <div style={{ fontSize: 12.5, color: '#991B1B', marginTop: 2 }}>
              {globalKPIs.withPending} of {globalKPIs.totalPartners} partners have Pending balances
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total billed</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{money(globalKPIs.totalRevenue)}</div>
          </div>
        </div>
      ) : (
        <div style={{
          marginBottom: 20, padding: '16px 20px',
          background: 'linear-gradient(135deg, var(--secondary-light) 0%, #F0FFF4 100%)',
          borderRadius: 'var(--radius)', border: '1.5px solid rgba(27,94,53,0.2)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <BadgeCheck size={28} color="var(--secondary)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--secondary)' }}>All balances cleared! 🎉</div>
            <div style={{ fontSize: 12.5, color: 'var(--secondary)', opacity: 0.8, marginTop: 2 }}>
              Total collected: {money(globalKPIs.totalReceived)} from {globalKPIs.totalPartners} partner{globalKPIs.totalPartners !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Value',   val: fmtCurrency(globalKPIs.totalRevenue),  tone: 'orange', icon: IndianRupee,  hint: 'Total value of all completed pickups' },
          { label: 'Money Received', val: fmtCurrency(globalKPIs.totalReceived), tone: 'green',  icon: CheckCircle,  hint: 'Amount already collected from partners' },
          { label: 'Amount Pending',     val: fmtCurrency(globalKPIs.totalPending),  tone: 'red',    icon: Wallet,       hint: 'Pending balance — needs collection' },
          { label: 'Written Off',    val: fmtCurrency(globalKPIs.totalWriteOff), tone: 'blue',   icon: TrendingUp,   hint: 'Amounts marked as non-recoverable' },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.label} className={`stat-card ${item.tone}`} title={item.hint} style={{ cursor: 'help' }}>
              <div className="stat-icon"><Icon size={18} /></div>
              <div className="stat-value">{item.val}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          )
        })}
      </div>

      {/* ── FILTERS BAR ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16,
        boxShadow: 'var(--shadow)',
      }}>
        {/* Date filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <Calendar size={13} color="var(--primary)" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>Pickup Date:</span>
          {DATE_PRESETS.map(p => (
            <button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12 }} onClick={() => setDatePreset(p.id)}>
              {p.label}
            </button>
          ))}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 140, fontSize: 12 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 140, fontSize: 12 }} />
            </div>
          )}
        </div>

        {/* Search + Status filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '2 1 200px', minWidth: 0 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search by partner name, donor, or order…"
              style={{ paddingLeft: 32, fontSize: 13, width: '100%' }} />
          </div>

          {/* Status tabs */}
          <div style={{ display: 'flex', background: 'var(--border-light)', borderRadius: 8, padding: 3, gap: 2 }}>
            {[
              { id: 'all',     label: 'All',          count: partnerRows.length },
              { id: 'pending', label: 'Pending Payments', count: partnerRows.filter(r => r.pending > 0).length },
              { id: 'clear',   label: 'All Paid',      count: partnerRows.filter(r => r.pending === 0).length },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: statusFilter === tab.id ? 700 : 500,
                  color: statusFilter === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: statusFilter === tab.id ? 'var(--surface)' : 'transparent',
                  boxShadow: statusFilter === tab.id ? 'var(--shadow)' : 'none',
                  transition: 'all 0.12s',
                }}>
                {tab.label}
                <span style={{
                  background: statusFilter === tab.id
                    ? (tab.id === 'pending' ? 'var(--danger)' : tab.id === 'clear' ? 'var(--secondary)' : 'var(--primary)')
                    : 'var(--border)',
                  color: statusFilter === tab.id ? 'white' : 'var(--text-muted)',
                  borderRadius: 20, fontSize: 10.5, fontWeight: 700, padding: '0 6px',
                }}>{tab.count}</span>
              </button>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={handleExport} style={{ flexShrink: 0 }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* ── RESULTS COUNT ── */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{partnerRows.length}</strong> partner{partnerRows.length !== 1 ? 's' : ''}
        {globalKPIs.withPending > 0 && statusFilter !== 'clear' && (
          <span style={{ marginLeft: 8, color: 'var(--danger)', fontWeight: 600 }}>
            · {globalKPIs.withPending} with Pending balance
          </span>
        )}
      </div>

      {/* ── PARTNER CARDS ── */}
      {partnerRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={24} /></div>
          <h3>No Partners Found</h3>
          <p>Try adjusting the date range or search filters.</p>
        </div>
      ) : (
        partnerRows.map(partner => (
          <PartnerCard
            key={partner.partnerName}
            partner={partner}
            onRecordPayment={openPayModal}
            onWriteOffEntry={openWriteOffEntry}
            onWriteOffPartner={openWriteOffPartner}
            onViewHistory={setHistPartner}
            canWriteOff={canWriteOff}
          />
        ))
      )}

      {/* Modals */}
      {payContext  && <RecordPaymentModal context={payContext}  onClose={() => setPayContext(null)}  onSave={handlePaySave}           saving={saving} />}
      {writeOffCtx && <WriteOffModal      context={writeOffCtx} onClose={() => setWriteOffCtx(null)} onConfirm={handleWriteOffConfirm} saving={saving} />}
      {histPartner && <HistoryModal       partner={histPartner} onClose={() => setHistPartner(null)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RST REVENUE ANALYTICS (unchanged)
// ══════════════════════════════════════════════════════════════════════════════
function PayBadge({ status }) {
  const MAP = {
    'Paid':           { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
    'Not Paid':       { bg: 'var(--danger-bg)',        color: 'var(--danger)'   },
    'Partially Paid': { bg: 'var(--warning-bg)',       color: '#92400E'         },
    'Write Off':      { bg: 'var(--border-light)',     color: 'var(--text-muted)' },
    'Received':       { bg: 'var(--secondary-light)',  color: 'var(--secondary)' },
    'Yet to Receive': { bg: 'var(--warning-bg)',       color: '#92400E'         },
    'Write-off':      { bg: 'var(--border-light)',     color: 'var(--text-muted)' },
  }
  const c = MAP[status] || { bg: 'var(--border-light)', color: 'var(--text-muted)' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
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

  const { from: dateFrom, to: dateTo } = useMemo(() => getDateRange(datePreset, customFrom, customTo), [datePreset, customFrom, customTo])

  const pickupMap = useMemo(() => {
    const map = {}
    ;(pickups || []).forEach(p => { map[p.id] = p; if (p.orderId) map[p.orderId] = p })
    return map
  }, [pickups])

  const uniqueSectors = useMemo(() => {
    if (filterCity && CITY_SECTORS[filterCity]) return CITY_SECTORS[filterCity]
    return [...new Set(raddiRecords.filter(r => !filterCity || r.city === filterCity).map(r => r.sector).filter(Boolean))].sort()
  }, [raddiRecords, filterCity])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const rows = raddiRecords.map(r => {
      const pickup    = pickupMap[r.orderId] || pickupMap[r.pickupId] || {}
      const total     = Number(r.totalAmount) || 0
      const collected = Math.min(total, Number(r.amountPaid) || 0)
      const pending   = r.paymentStatus === 'Write-off' ? 0 : Math.max(0, total - collected)
      return { ...r, total, collected, pending, partnerName: r.PickupPartnerName || pickup.PickupPartner || 'Unassigned', donorName: r.name || pickup.donorName || '' }
    }).filter(r => {
      const inDate   = (!dateFrom || (r.pickupDate || '') >= dateFrom) && (!dateTo || (r.pickupDate || '') <= dateTo)
      const inCity   = !filterCity   || r.city   === filterCity
      const inSector = !filterSector || r.sector === filterSector
      const inPay    = !filterPay    || r.paymentStatus === filterPay
      const inSearch = !q || r.partnerName.toLowerCase().includes(q) || r.donorName.toLowerCase().includes(q) || (r.society || '').toLowerCase().includes(q) || (r.orderId || '').toLowerCase().includes(q)
      return inDate && inCity && inSector && inPay && inSearch
    })
    rows.sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number' || typeof bv === 'number') return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return rows
  }, [raddiRecords, pickupMap, dateFrom, dateTo, filterCity, filterSector, filterPay, search, sortKey, sortDir])

  const totals = useMemo(() => ({ revenue: filtered.reduce((s, r) => s + r.total, 0), collected: filtered.reduce((s, r) => s + r.collected, 0), pending: filtered.reduce((s, r) => s + r.pending, 0), kg: filtered.reduce((s, r) => s + (Number(r.totalKg) || 0), 0) }), [filtered])

  const toggleSort = (key) => { setSortDir(d => sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); setSortKey(key) }
  const SortTh = ({ k, children, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor: 'pointer', userSelect: 'none', textAlign: align || 'left' }}>
      {children}<span style={{ marginLeft: 4, opacity: sortKey === k ? 0.7 : 0.2 }}>{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Revenue', val: money(totals.revenue), icon: IndianRupee, tone: 'orange' },
          { label: 'Collected',     val: money(totals.collected), icon: CheckCircle, tone: 'green' },
          { label: 'Pending',       val: money(totals.pending), icon: AlertCircle, tone: 'red' },
          { label: 'Weight (kg)',   val: `${totals.kg.toFixed(1)} kg`, icon: Package, tone: 'blue' },
        ].map(item => { const Icon = item.icon; return (
          <div key={item.label} className={`stat-card ${item.tone}`}>
            <div className="stat-icon"><Icon size={18} /></div>
            <div className="stat-value">{item.val}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        )})}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <Calendar size={13} color="var(--primary)" />
          {DATE_PRESETS.map(p => (<button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11.5 }} onClick={() => setDatePreset(p.id)}>{p.label}</button>))}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 138, fontSize: 12 }} />
              <span style={{ fontSize: 11 }}>to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 138, fontSize: 12 }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '2 1 200px' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partner, donor, order…" style={{ paddingLeft: 32, fontSize: 12.5, width: '100%' }} />
          </div>
          <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterSector('') }} style={{ flex: '1 1 130px', fontSize: 12.5 }}><option value="">All Cities</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)} disabled={!filterCity} style={{ flex: '1 1 140px', fontSize: 12.5 }}><option value="">{filterCity ? 'All Sectors' : 'Select city first'}</option>{uniqueSectors.map(s => <option key={s}>{s}</option>)}</select>
          <select value={filterPay} onChange={e => setFilterPay(e.target.value)} style={{ flex: '1 1 140px', fontSize: 12.5 }}><option value="">All Statuses</option><option value="Received">Received</option><option value="Yet to Receive">Yet to Receive</option><option value="Write-off">Write-off</option></select>
          <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(filtered.map(r => ({ 'Partner': r.partnerName, 'Donor': r.donorName, 'Order': r.orderId, 'Date': r.pickupDate, 'Total': r.total, 'Paid': r.collected, 'Pending': r.pending, 'Status': r.paymentStatus })), 'RST_Revenue')}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
        <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> records
        {(search || filterCity || filterPay) && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginLeft: 8 }} onClick={() => { setSearch(''); setFilterCity(''); setFilterSector(''); setFilterPay('') }}>
            <X size={10} /> Clear
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><BarChart3 size={24} /></div><h3>No records found</h3><p>Try a different date range or filter.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh k="partnerName">Pickup Partner</SortTh>
                <SortTh k="donorName">Donor</SortTh>
                <SortTh k="pickupDate">Pickup Date</SortTh>
                <SortTh k="total" align="right">Total ₹</SortTh>
                <SortTh k="collected" align="right">Received ₹</SortTh>
                <SortTh k="pending" align="right">Pending ₹</SortTh>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.orderId || r.pickupId}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.partnerName}</div>
                    <OrderIdChip id={r.orderId || r.pickupId} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.donorName || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{[r.society, r.sector].filter(Boolean).join(', ')}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.pickupDate)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{money(r.total)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>{r.collected > 0 ? money(r.collected) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: r.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.pending > 0 ? money(r.pending) : '—'}</td>
                  <td><PayBadge status={r.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--secondary-light)', fontWeight: 800 }}>
                <td colSpan={3}>Totals ({filtered.length} records)</td>
                <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{money(totals.revenue)}</td>
                <td style={{ textAlign: 'right', color: 'var(--secondary)' }}>{money(totals.collected)}</td>
                <td style={{ textAlign: 'right', color: totals.pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>{totals.pending > 0 ? money(totals.pending) : 'All clear ✓'}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SKS PAYMENT ANALYTICS (unchanged from original)
// ══════════════════════════════════════════════════════════════════════════════
function SKSPaymentAnalytics() {
  const { sksOutflows } = useApp()

  const [datePreset,   setDatePreset]   = useState('all')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')
  const [sortKey,      setSortKey]      = useState('date')
  const [sortDir,      setSortDir]      = useState('desc')

  const { from: dateFrom, to: dateTo } = useMemo(() => getDateRange(datePreset, customFrom, customTo), [datePreset, customFrom, customTo])

  const enriched = useMemo(() => (sksOutflows || []).map(r => {
    const pay = r.payment || {}
    const paid = Number(pay.amount) || 0
    const total = Number(pay.totalValue) || 0
    return { ...r, _paid: paid, _total: total, _pending: Math.max(0, total - paid), _status: pay.status || (total === 0 ? 'Not Recorded' : paid >= total ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Not Paid'), _method: (pay.method || 'CASH').toUpperCase(), _screenshot: pay.screenshot || null }
  }), [sksOutflows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return enriched.filter(r => {
      const inDate   = (!dateFrom || (r.date || '') >= dateFrom) && (!dateTo || (r.date || '') <= dateTo)
      const inStatus = !filterStatus || r._status === filterStatus
      const inSearch = !q || (r.partnerName || '').toLowerCase().includes(q) || (r.id || '').toLowerCase().includes(q)
      return inDate && inStatus && inSearch
    }).sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (['_paid','_total','_pending'].includes(sortKey)) return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [enriched, dateFrom, dateTo, filterStatus, search, sortKey, sortDir])

  const kpis = useMemo(() => ({
    totalPaid:    filtered.reduce((s, r) => s + r._paid, 0),
    totalPending: filtered.reduce((s, r) => s + r._pending, 0),
    totalItems:   filtered.reduce((s, r) => s + (r.items || []).reduce((a, it) => a + it.qty, 0), 0),
  }), [filtered])

  if ((sksOutflows || []).length === 0) {
    return (
      <div className="empty-state" style={{ padding: 80 }}>
        <div className="empty-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><Gift size={28} /></div>
        <h3>No SKS Dispatches Yet</h3>
        <p>Dispatch goods from the SKS Stock page to see payment analytics here.</p>
      </div>
    )
  }

  const toggleSort = (key) => { setSortDir(d => sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); setSortKey(key) }
  const SortTh = ({ k, children, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor: 'pointer', userSelect: 'none', textAlign: align || 'left' }}>
      {children}<span style={{ marginLeft: 4, opacity: sortKey === k ? 0.7 : 0.2 }}>{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card blue"><div className="stat-icon"><Package size={18} /></div><div className="stat-value">{filtered.length}</div><div className="stat-label">Total Dispatches</div><div className="stat-change up">{kpis.totalItems} items</div></div>
        <div className="stat-card green"><div className="stat-icon"><CheckCircle size={18} /></div><div className="stat-value">{fmtCurrency(kpis.totalPaid)}</div><div className="stat-label">Amount Received</div></div>
        <div className="stat-card red"><div className="stat-icon"><AlertCircle size={18} /></div><div className="stat-value">{fmtCurrency(kpis.totalPending)}</div><div className="stat-label">Pending</div></div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          {DATE_PRESETS.map(p => (<button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11.5 }} onClick={() => setDatePreset(p.id)}>{p.label}</button>))}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 138, fontSize: 12 }} />
              <span>to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 138, fontSize: 12 }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '2 1 200px' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipient or dispatch ID…" style={{ paddingLeft: 32, fontSize: 12.5, width: '100%' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: '1 1 140px', fontSize: 12.5 }}>
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Not Paid">Not Paid</option>
            <option value="Not Recorded">Not Recorded</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(filtered.map(r => ({ 'Dispatch ID': r.id, 'Date': r.date, 'Recipient': r.partnerName, 'Items': (r.items || []).map(it => `${it.name} ×${it.qty}`).join(', '), 'Received (₹)': r._paid, 'Pending (₹)': r._pending, 'Status': r._status })), 'SKS_Payment')}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><Package size={24} /></div><h3>No records match</h3><p>Try adjusting your filters.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh k="id">Dispatch ID</SortTh>
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
                  <td><span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '2px 7px', borderRadius: 5 }}>{r.id}</span></td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtDate(r.date)}</td>
                  <td><div style={{ fontWeight: 700 }}>{r.partnerName || '—'}</div>{r.partnerPhone && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.partnerPhone}</div>}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {(r.items || []).slice(0, 3).map(it => (<span key={it.name} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--info)', fontWeight: 600 }}>{it.name} ×{it.qty}</span>))}
                      {(r.items || []).length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{r.items.length - 3}</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: r._paid > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>{r._paid > 0 ? money(r._paid) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: r._pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r._pending > 0 ? money(r._pending) : '—'}</td>
                  <td><PayBadge status={r._status} /></td>
                  <td>{r._screenshot ? <ScreenshotThumb src={r._screenshot} size={38} /> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
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
    { id: 'partners', label: '🤝 Revenue',      desc: 'Track & record dues from pickup partners' },
    { id: 'rst',      label: '♻️ RST Revenue Analytics',  desc: 'Per-order revenue & payment status' },
    { id: 'sks',      label: '🎁 SKS Payment Analytics',  desc: 'Dispatch payment records' },
  ]

  return (
    <div className="page-body">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 6px', background: 'var(--border-light)', borderRadius: 12, width: 'fit-content', marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)', background: activeTab === tab.id ? 'var(--surface)' : 'transparent', boxShadow: activeTab === tab.id ? 'var(--shadow)' : 'none', transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab description */}
      {(() => {
        const tab = TABS.find(t => t.id === activeTab)
        return tab ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{tab.label}</span> — {tab.desc}
          </div>
        ) : null
      })()}

      {activeTab === 'partners' && (
        <PartnerPaymentHub
          pickups={pickups}
          PickupPartners={PickupPartners}
          recordPickupPartnerPayment={recordPickupPartnerPayment}
          clearPartnerBalance={clearPartnerBalance}
        />
      )}
      {activeTab === 'rst' && <RSTAnalytics raddiRecords={raddiRecords} pickups={pickups} />}
      {activeTab === 'sks' && <SKSPaymentAnalytics />}
    </div>
  )
}