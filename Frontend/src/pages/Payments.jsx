// Frontend/src/pages/Payments.jsx
// ══════════════════════════════════════════════════════════════════════════════
// PICKUP PARTNER PAYMENT MODULE
// Write-Off System (v2):
//   Level 1 — Pickup-level write-off: entire pickup marked unrecoverable
//   Level 2 — Entry-level write-off: only the specific row's pending is closed
// ══════════════════════════════════════════════════════════════════════════════

import { useMemo, useState, useCallback } from 'react'
import {
  AlertCircle, BarChart3, Calendar, CheckCircle, CreditCard,
  Download, FileText, History, Image, IndianRupee, AlertTriangle,
  Plus, Search, Smartphone, Upload, X, Hash, MapPin,
  ChevronDown, ChevronUp, Truck, Clock,
  Phone, Filter, Lock, RefreshCw, Package,
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

function buildMonthlyBreakdown(pickups) {
  const map = {}
  pickups.forEach(p => {
    const key = (p.date || '').slice(0, 7)
    if (!key) return
    if (!map[key]) map[key] = { month: key, count: 0, total: 0, paid: 0, pending: 0 }
    const total = Number(p.totalValue) || 0
    const paid  = Math.min(total, Number(p.amountPaid) || 0)
    map[key].count++
    map[key].total   += total
    map[key].paid    += paid
    map[key].pending += Math.max(0, total - paid)
  })
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v)
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI ATOMS
// ══════════════════════════════════════════════════════════════════════════════

function OrderIdChip({ id }) {
  if (!id) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700,
      color: 'var(--primary)', background: 'var(--primary-light)',
      padding: '2px 7px', borderRadius: 5,
      border: '1px solid rgba(232,82,26,0.18)', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <Hash size={9} />{id}
    </span>
  )
}

function PayBadge({ status }) {
  const MAP = {
    'Paid':            { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
    'Not Paid':        { bg: 'var(--danger-bg)',        color: 'var(--danger)'   },
    'Partially Paid':  { bg: 'var(--warning-bg)',       color: '#92400E'         },
    'Write Off':       { bg: 'var(--border-light)',     color: 'var(--text-muted)' },
    'Received':        { bg: 'var(--secondary-light)',  color: 'var(--secondary)' },
    'Yet to Receive':  { bg: 'var(--warning-bg)',       color: '#92400E'         },
    'Write-off':       { bg: 'var(--border-light)',     color: 'var(--text-muted)' },
  }
  const c = MAP[status] || { bg: 'var(--border-light)', color: 'var(--text-muted)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

function StatusDot({ status }) {
  const colors = {
    'Not Paid': 'var(--danger)', 'Partially Paid': 'var(--warning)',
    'Paid': 'var(--secondary)', 'Write Off': 'var(--text-muted)',
  }
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: colors[status] || 'var(--border)', flexShrink: 0,
    }} />
  )
}

function PaymentMethodPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
      {REF_MODES.map(mode => {
        const Icon = mode.icon; const active = value === mode.value
        return (
          <button key={mode.value} type="button" onClick={() => onChange(mode.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              borderRadius: 8, fontSize: 12.5, cursor: 'pointer', fontWeight: active ? 700 : 400,
              border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              background: active ? 'var(--primary-light)' : 'transparent',
              color: active ? 'var(--primary)' : 'var(--text-secondary)',
            }}>
            <Icon size={13} />{mode.label}
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RECORD PAYMENT MODAL — purely for payment, no write-off here
// ══════════════════════════════════════════════════════════════════════════════

function RecordPaymentModal({ context, onClose, onSave, saving }) {
  const [amount,     setAmount]     = useState(() => context.pending > 0 ? String(Math.round(context.pending)) : '')
  const [date,       setDate]       = useState(() => new Date().toISOString().slice(0, 10))
  const [method,     setMethod]     = useState('cash')
  const [reference,  setReference]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [error,      setError]      = useState('')

  const entered    = Number(amount) || 0
  const afterPay   = Math.max(0, context.pending - entered)
  const isFull     = entered >= context.pending - 0.01
  const selectedMode = REF_MODES.find(r => r.value === method)

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setScreenshot(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (context.pending <= 0) { setError('No pending amount to record.'); return }
    if (entered <= 0) { setError('Enter a valid amount.'); return }
    if (entered > context.pending + 0.01) { setError('Amount cannot exceed pending balance.'); return }
    if (method !== 'cash' && !reference.trim()) { setError(`Enter ${refModeLabel(method)} reference.`); return }
    onSave({ amount: entered, date, method, reference: reference.trim(), notes: notes.trim(), screenshot, isFull })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>

        <div className="modal-header">
          <IndianRupee size={18} color="var(--primary)" />
          <div>
            <div className="modal-title" style={{ fontSize: 15 }}>
              Record Payment — {context.partnerName}
            </div>
            {context.donorName && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {context.donorName} · <OrderIdChip id={context.pickupId} />
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '68vh' }}>

          {/* Summary strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border-light)', borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
            {[
              { label: 'Total', val: money(context.total), color: 'var(--primary)', bg: 'var(--primary-light)' },
              { label: 'Already Paid', val: money(context.paid), color: 'var(--secondary)', bg: 'var(--secondary-light)' },
              { label: 'Pending', val: money(context.pending), color: context.pending > 0 ? 'var(--danger)' : 'var(--secondary)', bg: context.pending > 0 ? 'var(--danger-bg)' : 'var(--secondary-light)' },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px 14px', background: item.bg, textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, color: item.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>

          {context.pending <= 0 && (
            <div className="alert-strip alert-success" style={{ marginBottom: 14 }}>
              <CheckCircle size={14} /> This pickup is fully paid. No pending balance.
            </div>
          )}

          {context.pending > 0 && (
            <div className="form-grid">
              <div className="form-group full">
                <label>Amount Received Now (₹) <span className="required">*</span></label>
                <input type="number" min={0} max={context.pending} inputMode="decimal"
                  value={amount} onChange={e => { setAmount(e.target.value); setError('') }}
                  placeholder={`Max ${money(context.pending)}`} autoFocus />
                {entered > 0 && (
                  <div style={{ marginTop: 8, padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12.5, display: 'flex', gap: 14 }}>
                    <span>Remaining: <strong style={{ color: afterPay > 0 ? 'var(--danger)' : 'var(--secondary)' }}>{money(afterPay)}</strong></span>
                    <span>Status: <strong>{afterPay > 0 ? 'Partial' : '✓ Fully Paid'}</strong></span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Payment Date <span className="required">*</span></label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Payment Method <span className="required">*</span></label>
                <PaymentMethodPicker value={method} onChange={m => { setMethod(m); setReference(''); setScreenshot(null); setError('') }} />
              </div>
              <div className="form-group full">
                <label>{refModeLabel(method)} Reference {method !== 'cash' && <span className="required">*</span>}</label>
                <input value={reference} onChange={e => { setReference(e.target.value); setError('') }}
                  placeholder={selectedMode?.placeholder || 'Reference'} />
              </div>
              {method === 'upi' && (
                <div className="form-group full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Image size={13} color="var(--info)" /> UPI Screenshot</label>
                  {screenshot ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={screenshot} alt="UPI" style={{ maxWidth: 200, maxHeight: 160, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }} />
                      <button type="button" onClick={() => setScreenshot(null)} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}>
                      <Upload size={15} /> Upload Screenshot
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScreenshot} />
                    </label>
                  )}
                </div>
              )}
              <div className="form-group full">
                <label>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment notes…" style={{ minHeight: 60 }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={13} />{error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={saving || context.pending <= 0 || entered <= 0}>
            {saving ? 'Saving…' : isFull ? '✓ Clear Balance' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// WRITE-OFF MODAL — clean, focused, requires reason
// Supports two modes: 'entry' (single pickup) | 'partner' (all pending)
// ══════════════════════════════════════════════════════════════════════════════

function WriteOffModal({ context, onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const isPartnerLevel = context.mode === 'partner'

  const handleConfirm = () => {
    if (!reason.trim()) { setError('A reason is required for write-off.'); return }
    if (!confirmed)     { setError('Please check the confirmation checkbox.'); return }
    onConfirm({ reason: reason.trim() })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>

        <div className="modal-header" style={{ background: 'var(--danger-bg)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={18} color="var(--danger)" />
          <div>
            <div className="modal-title" style={{ fontSize: 15, color: 'var(--danger)' }}>
              {isPartnerLevel ? 'Write Off All Pending' : 'Write Off This Entry'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--danger)', opacity: 0.75, marginTop: 2 }}>
              {isPartnerLevel
                ? `${context.partnerName} — all unpaid pickups`
                : `${context.donorName} · ${context.pickupId}`}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">

          {/* What will be written off */}
          <div style={{
            padding: '16px', borderRadius: 10, marginBottom: 20,
            background: 'var(--danger-bg)', border: '1.5px solid rgba(239,68,68,0.25)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              {isPartnerLevel ? 'Partner Write-Off Summary' : 'Entry Write-Off Summary'}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600, opacity: 0.7, marginBottom: 2 }}>AMOUNT TO WRITE OFF</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>
                  {money(context.pending)}
                </div>
              </div>
              {isPartnerLevel && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600, opacity: 0.7, marginBottom: 2 }}>AFFECTED PICKUPS</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>
                    {context.pickupCount}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* What this does */}
          <div style={{ padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--border-light)', marginBottom: 20, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {isPartnerLevel ? (
              <>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>This will:</div>
                <div>• Mark all pending pickups for <strong>{context.partnerName}</strong> as Write Off</div>
                <div>• Close all unpaid balances ({money(context.pending)})</div>
                <div>• <strong>No money will be recorded as received</strong></div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>This will:</div>
                <div>• Write off <strong>{money(context.pending)}</strong> pending for this specific pickup</div>
                <div>• <strong>Only this entry</strong> is affected — other pickups are unchanged</div>
                <div>• No money will be recorded as received</div>
              </>
            )}
          </div>

          {/* Reason — required */}
          <div className="form-group" style={{ margin: '0 0 16px' }}>
            <label>
              Reason for Write-Off <span className="required">*</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                (required — will be saved in payment history)
              </span>
            </label>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              placeholder="e.g. Partner unreachable, amount disputed, goods not received…"
              style={{ minHeight: 76, borderColor: reason.trim() ? 'var(--border)' : error ? 'var(--danger)' : 'var(--border)' }}
              autoFocus
            />
          </div>

          {/* Confirmation checkbox */}
          <div
            style={{
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${confirmed ? 'var(--danger)' : 'var(--border)'}`,
              background: confirmed ? 'var(--danger-bg)' : 'var(--surface)',
              display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12,
              transition: 'all 0.15s',
            }}
            onClick={() => { setConfirmed(c => !c); setError('') }}
          >
            <input
              type="checkbox"
              checked={confirmed}
              onChange={() => {}}
              style={{ width: 16, height: 16, accentColor: 'var(--danger)', flexShrink: 0, marginTop: 2, cursor: 'pointer', padding: 0, border: 'none' }}
            />
            <div style={{ fontSize: 12.5, color: confirmed ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: confirmed ? 700 : 400 }}>
              I understand this is final. The written-off amount ({money(context.pending)}) will be permanently marked as non-recoverable.
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={13} />{error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={saving || !reason.trim() || !confirmed}
          >
            {saving ? 'Processing…' : `✗ Write Off ${money(context.pending)}`}
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
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <History size={18} color="var(--info)" />
          <div className="modal-title">Payment History — {partner.partnerName}</div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding: 28 }}><p>No payment history recorded yet.</p></div>
          ) : entries.map((e, i) => (
            <div key={`${e.pickupId}-${e.date}-${i}`} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < entries.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: e.refMode === 'writeoff' ? 'var(--danger-bg)' : 'var(--secondary-light)', color: e.refMode === 'writeoff' ? 'var(--danger)' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {e.refMode === 'writeoff' ? <AlertTriangle size={16} /> : <IndianRupee size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: e.refMode === 'writeoff' ? 'var(--danger)' : 'var(--secondary)' }}>
                    {e.refMode === 'writeoff' ? 'Write-off' : money(e.amount)}
                  </strong>
                  <span className="badge badge-muted" style={{ fontSize: 10 }}>{refModeLabel(e.refMode)}</span>
                  <OrderIdChip id={e.orderId || e.pickupId} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {e.donorName || '—'}{e.refValue ? ` — Ref: ${e.refValue}` : ''}
                </div>
                {e.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{e.notes}</div>}
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
// MONTHLY BREAKDOWN TABLE
// ══════════════════════════════════════════════════════════════════════════════

function MonthlyBreakdown({ pickups }) {
  const months = useMemo(() => buildMonthlyBreakdown(pickups), [pickups])
  if (months.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Calendar size={11} color="var(--primary)" /> Monthly Breakdown
      </div>
      <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 60px 1fr 1fr 1fr', padding: '6px 12px', background: 'var(--surface-alt)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Month</span><span style={{ textAlign: 'center' }}>Pickups</span><span style={{ textAlign: 'right' }}>Value</span><span style={{ textAlign: 'right' }}>Received</span><span style={{ textAlign: 'right' }}>Pending</span>
        </div>
        {months.map((m, idx) => {
          const [y, mo] = m.month.split('-')
          const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' })
          return (
            <div key={m.month} style={{ display: 'grid', gridTemplateColumns: '90px 60px 1fr 1fr 1fr', padding: '7px 12px', fontSize: 12.5, borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{label}</span>
              <span style={{ textAlign: 'center', fontWeight: 600 }}>{m.count}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{m.total > 0 ? money(m.total) : '—'}</span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>{m.paid > 0 ? money(m.paid) : '—'}</span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: m.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                {m.pending > 0 ? money(m.pending) : <span style={{ fontWeight: 400, fontSize: 11 }}>Nil</span>}
              </span>
            </div>
          )
        })}
        {(() => {
          const tot = months.reduce((a, m) => ({ total: a.total + m.total, paid: a.paid + m.paid, pending: a.pending + m.pending, count: a.count + m.count }), { total: 0, paid: 0, pending: 0, count: 0 })
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '90px 60px 1fr 1fr 1fr', padding: '8px 12px', background: 'var(--secondary-light)', fontWeight: 800, fontSize: 12.5, borderTop: '1.5px solid rgba(27,94,53,0.2)' }}>
              <span style={{ color: 'var(--secondary)' }}>Total</span>
              <span style={{ textAlign: 'center', color: 'var(--secondary)' }}>{tot.count}</span>
              <span style={{ textAlign: 'right', color: 'var(--primary)' }}>{money(tot.total)}</span>
              <span style={{ textAlign: 'right', color: 'var(--secondary)' }}>{money(tot.paid)}</span>
              <span style={{ textAlign: 'right', color: tot.pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                {tot.pending > 0 ? money(tot.pending) : 'All clear ✓'}
              </span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PICKUP LEDGER — per-row Pay + Write Off actions (clear & separate)
// ══════════════════════════════════════════════════════════════════════════════

function PickupLedger({ pickups, onRecordPayment, onWriteOffEntry, canWriteOff, sortKey, setSortKey, sortDir, setSortDir, search, setSearch }) {
  const enriched = useMemo(() => {
    return pickups.map(p => {
      const total   = Number(p.totalValue) || 0
      const paid    = Math.min(total, Number(p.amountPaid) || 0)
      const pending = Math.max(0, total - paid)
      const ps      = p.paymentStatus || getPickupPayStatus(total, paid)
      return { ...p, _total: total, _paid: paid, _pending: pending, _ps: ps }
    })
  }, [pickups])

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? enriched.filter(r =>
          (r.donorName || '').toLowerCase().includes(q) ||
          (r.society   || '').toLowerCase().includes(q) ||
          (r.orderId   || '').toLowerCase().includes(q))
      : enriched

    return [...filtered].sort((a, b) => {
      const ap = STATUS_PRIORITY[a._ps] ?? 99
      const bp = STATUS_PRIORITY[b._ps] ?? 99
      if (ap !== bp) return ap - bp
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (['_total', '_paid', '_pending'].includes(sortKey)) {
        return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      }
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [enriched, search, sortKey, sortDir])

  const toggleSort = k => {
    setSortDir(d => sortKey === k ? (d === 'asc' ? 'desc' : 'asc') : 'desc')
    setSortKey(k)
  }

  const Th = ({ k, label, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor: 'pointer', userSelect: 'none', textAlign: align || 'left', whiteSpace: 'nowrap' }}>
      {label}
      <span style={{ marginLeft: 4, opacity: sortKey === k ? 0.7 : 0.2 }}>
        {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )

  const totals = useMemo(() => sorted.reduce((a, r) => ({
    total: a.total + r._total, paid: a.paid + r._paid, pending: a.pending + r._pending
  }), { total: 0, paid: 0, pending: 0 }), [sorted])

  const statusStyle = ps => ({
    'Paid':           { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
    'Not Paid':       { bg: 'var(--danger-bg)',        color: 'var(--danger)' },
    'Partially Paid': { bg: 'var(--warning-bg)',       color: '#92400E' },
    'Write Off':      { bg: 'var(--border-light)',     color: 'var(--text-muted)' },
  }[ps] || { bg: 'var(--border-light)', color: 'var(--text-muted)' })

  return (
    <div>
      <div style={{ marginBottom: 10, position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by donor, society, order…"
          style={{ paddingLeft: 32, fontSize: 12.5, width: '100%' }} />
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No pickups match your search.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--border-light)' }}>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <Th k="orderId" label="Order ID" />
                  <Th k="donorName" label="Donor" />
                  <th>Location</th>
                  <Th k="date" label="Date" />
                  <Th k="_total" label="Value" align="right" />
                  <Th k="_paid" label="Paid" align="right" />
                  <Th k="_pending" label="Pending" align="right" />
                  <th style={{ minWidth: canWriteOff ? 160 : 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const sc        = statusStyle(r._ps)
                  const isPending = r._ps === 'Not Paid' || r._ps === 'Partially Paid'
                  return (
                    <tr key={r.id || r.orderId} style={{ background: r._pending > 0 ? 'rgba(239,68,68,0.02)' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <StatusDot status={r._ps} />
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 700 }}>{r._ps}</span>
                        </div>
                      </td>
                      <td><OrderIdChip id={r.orderId || r.id} /></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.donorName || '—'}</div>
                        {r.mobile && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.mobile}</div>}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 120 }}>
                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.society || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.sector || ''}</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 600 }}>{fmtDate(r.date)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: r._total > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {r._total > 0 ? money(r._total) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: r._paid > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                        {r._paid > 0 ? money(r._paid) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: r._pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {r._pending > 0 ? money(r._pending) : '—'}
                      </td>

                      {/* ── Actions: Pay | Write Off (clearly separated) ── */}
                      <td>
                        {isPending && r._pending > 0 ? (
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {/* Pay button */}
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => onRecordPayment({ pickup: r })}
                              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Plus size={10} /> Pay
                            </button>
                            {/* Write Off — only for managers & admins */}
                            {canWriteOff && (
                              <button
                                onClick={() => onWriteOffEntry(r)}
                                style={{
                                  fontSize: 11, padding: '4px 10px',
                                  borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)',
                                  background: 'var(--danger-bg)', color: 'var(--danger)',
                                  cursor: 'pointer', fontWeight: 600,
                                  display: 'flex', alignItems: 'center', gap: 3,
                                  whiteSpace: 'nowrap',
                                }}>
                                ✗ Write Off
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {r._ps === 'Paid' ? '✓ Paid' : r._ps === 'Write Off' ? 'Written off' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {sorted.length > 1 && (
                <tfoot>
                  <tr style={{ background: 'var(--secondary-light)', fontWeight: 800 }}>
                    <td colSpan={5} style={{ fontWeight: 700 }}>Totals ({sorted.length} pickups)</td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{money(totals.total)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--secondary)' }}>{money(totals.paid)}</td>
                    <td style={{ textAlign: 'right', color: totals.pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                      {totals.pending > 0 ? money(totals.pending) : 'All clear ✓'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-cards">
            {sorted.map(r => {
              const sc = statusStyle(r._ps)
              const isPending = r._ps === 'Not Paid' || r._ps === 'Partially Paid'
              return (
                <div key={r.id || r.orderId} className="card" style={{ marginBottom: 8, padding: 12, borderLeft: `3px solid ${sc.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div>
                      <OrderIdChip id={r.orderId || r.id} />
                      <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>{r.donorName || '—'}</div>
                    </div>
                    <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 700, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>{r._ps}</span>
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 8, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r._total > 0 && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{money(r._total)}</span>}
                      {r._paid  > 0 && <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>Paid {money(r._paid)}</span>}
                      {r._pending > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Due {money(r._pending)}</span>}
                    </div>
                    {isPending && r._pending > 0 && (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => onRecordPayment({ pickup: r })} style={{ fontSize: 11, padding: '4px 10px' }}>
                          + Pay
                        </button>
                        {canWriteOff && (
                          <button onClick={() => onWriteOffEntry(r)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'var(--danger-bg)', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600 }}>
                            ✗ Write Off
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTNER CARD — collapsible with clear action separation
// ══════════════════════════════════════════════════════════════════════════════

function PartnerCard({ partner, onRecordPayment, onWriteOffEntry, onWriteOffPartner, onViewHistory, canWriteOff }) {
  const [open,      setOpen]      = useState(false)
  const [sortKey,   setSortKey]   = useState('date')
  const [sortDir,   setSortDir]   = useState('desc')
  const [ledSearch, setLedSearch] = useState('')

  const statusCounts = useMemo(() => {
    const c = { 'Not Paid': 0, 'Partially Paid': 0, 'Paid': 0, 'Write Off': 0 }
    partner.records.forEach(p => {
      const ps = p.paymentStatus || getPickupPayStatus(p.totalValue, p.amountPaid)
      c[ps] = (c[ps] || 0) + 1
    })
    return c
  }, [partner.records])

  const urgentCount = (statusCounts['Not Paid'] || 0) + (statusCounts['Partially Paid'] || 0)

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${urgentCount > 0 ? 'var(--danger)' : 'var(--secondary)'}` }}>

      {/* ── Partner Header ── */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: urgentCount > 0 ? 'var(--danger-bg)' : 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: urgentCount > 0 ? 'var(--danger)' : 'var(--secondary)', flexShrink: 0 }}>
            {(partner.partnerName || '?')[0].toUpperCase()}
          </div>

          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              {partner.kabId && <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--secondary)', padding: '2px 8px', borderRadius: 5 }}>{partner.kabId}</span>}
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>{partner.partnerName}</div>
              {urgentCount > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠ {urgentCount} pending
                </span>
              )}
            </div>
            {partner.mobile && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <Phone size={11} /> {partner.mobile}
              </div>
            )}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {Object.entries(statusCounts).filter(([, c]) => c > 0).map(([s, c]) => {
                const colors = { 'Not Paid': ['var(--danger-bg)', 'var(--danger)'], 'Partially Paid': ['var(--warning-bg)', '#92400E'], 'Paid': ['var(--secondary-light)', 'var(--secondary)'], 'Write Off': ['var(--border-light)', 'var(--text-muted)'] }
                const [bg, color] = colors[s] || ['var(--border-light)', 'var(--text-muted)']
                return (
                  <span key={s} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: bg, color, fontWeight: 700 }}>
                    {c} {s}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Financial summary */}
          <div style={{ display: 'flex', gap: 0, flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            {[
              { label: 'Total', val: money(partner.total), color: 'var(--primary)', bg: 'var(--primary-light)' },
              { label: 'Received', val: money(partner.paid), color: 'var(--secondary)', bg: 'var(--secondary-light)' },
              { label: 'Pending', val: money(partner.pending), color: partner.pending > 0 ? 'var(--danger)' : 'var(--secondary)', bg: partner.pending > 0 ? 'var(--danger-bg)' : 'var(--surface)' },
            ].map((item, i) => (
              <div key={item.label} style={{ padding: '10px 16px', textAlign: 'center', background: item.bg, borderLeft: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: item.color, lineHeight: 1, whiteSpace: 'nowrap' }}>{item.val}</div>
                <div style={{ fontSize: 9.5, color: item.color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3, fontWeight: 700 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {partner.total > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              <span>Collection progress</span>
              <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{Math.round((partner.paid / partner.total) * 100)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, (partner.paid / partner.total) * 100)}%`, background: partner.pending === 0 ? 'var(--secondary)' : partner.paid / partner.total > 0.7 ? 'var(--warning)' : 'var(--danger)', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Action Bar ── */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{partner.records.length}</strong> pickup{partner.records.length !== 1 ? 's' : ''}
          {partner.lastPaymentDate && <span> · Last payment: <strong>{fmtDate(partner.lastPaymentDate)}</strong></span>}
        </div>

        {/* History */}
        <button className="btn btn-ghost btn-sm" onClick={() => onViewHistory(partner)} style={{ fontSize: 12 }}>
          <History size={12} /> History
        </button>

        {/* Expand ledger */}
        <button className={`btn btn-sm ${open ? 'btn-outline' : 'btn-ghost'}`} onClick={() => setOpen(o => !o)} style={{ fontSize: 12 }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {open ? 'Collapse' : 'View Pickups'}
        </button>

        {partner.pending > 0 ? (
          <>
            {/* Record Payment — primary CTA */}
            <button className="btn btn-primary btn-sm" onClick={() => onRecordPayment({ partner })} style={{ fontSize: 12 }}>
              <Plus size={12} /> Record Payment
            </button>

            {/* Write Off All — only for managers+admins, visually distinct from Pay */}
            {canWriteOff && (
              <button
                onClick={() => onWriteOffPartner(partner)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8,
                  border: '1.5px solid rgba(239,68,68,0.5)',
                  background: 'var(--danger-bg)', color: 'var(--danger)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  transition: 'all 0.15s',
                }}>
                ✗ Write Off All
              </button>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--secondary)', padding: '6px 12px', background: 'var(--secondary-light)', borderRadius: 8 }}>
            <CheckCircle size={13} /> All Clear
          </div>
        )}
      </div>

      {/* ── Expanded Ledger ── */}
      {open && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--surface)' }}>
          <MonthlyBreakdown pickups={partner.records} />

          {/* Write-off legend — only shown if canWriteOff */}
          {canWriteOff && partner.pending > 0 && (
            <div style={{ padding: '9px 14px', background: 'rgba(239,68,68,0.04)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', marginBottom: 12, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              <span>
                <strong>Write Off</strong> on each row closes only that entry.
                Use <strong>"Write Off All"</strong> above to close all pending at once.
              </span>
            </div>
          )}

          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Truck size={13} color="var(--primary)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pickup Ledger — {partner.records.length} records
            </span>
          </div>

          <PickupLedger
            pickups={partner.records}
            onRecordPayment={onRecordPayment}
            onWriteOffEntry={onWriteOffEntry}
            canWriteOff={canWriteOff}
            sortKey={sortKey} setSortKey={setSortKey}
            sortDir={sortDir} setSortDir={setSortDir}
            search={ledSearch} setSearch={setLedSearch}
          />
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTNER PAYMENT HUB — main view
// ══════════════════════════════════════════════════════════════════════════════

function PartnerPaymentHub({ pickups, kabadiwalas, recordKabadiwalaPayment, clearPartnerBalance }) {
  const { role } = useRole()
  const isAdmin      = role === 'admin'
  const canWriteOff  = role === 'admin' || role === 'manager'  // managers can also write off

  const [datePreset,   setDatePreset]   = useState('all')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [filterKab,    setFilterKab]    = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [globalSearch, setGlobalSearch] = useState('')

  // Modal state
  const [payContext,    setPayContext]    = useState(null)
  const [writeOffCtx,  setWriteOffCtx]  = useState(null)  // unified write-off context
  const [histPartner,   setHistPartner]  = useState(null)
  const [saving,        setSaving]       = useState(false)

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  const kabNames = useMemo(() => [...new Set(pickups.map(p => p.kabadiwala).filter(Boolean))].sort(), [pickups])

  const partnerRows = useMemo(() => {
    const q = globalSearch.toLowerCase().trim()
    const relevantPickups = pickups.filter(p => {
      if (p.status !== 'Completed') return false
      if (!p.kabadiwala) return false
      const inDate   = (!dateFrom || (p.date || '') >= dateFrom) && (!dateTo || (p.date || '') <= dateTo)
      const inKab    = filterKab === 'All' || p.kabadiwala === filterKab
      const ps       = p.paymentStatus || getPickupPayStatus(p.totalValue, p.amountPaid)
      const inStatus = filterStatus === 'All' || ps === filterStatus
      const inSearch = !q || (p.kabadiwala || '').toLowerCase().includes(q) || (p.donorName || '').toLowerCase().includes(q) || (p.orderId || '').toLowerCase().includes(q)
      return inDate && inKab && inStatus && inSearch
    })

    const map = {}
    relevantPickups.forEach(p => {
      const name = p.kabadiwala
      const kab  = kabadiwalas.find(k => k.name === name) || {}
      if (!map[name]) {
        map[name] = { kabId: kab.id || name, partnerName: name, mobile: kab.mobile || p.kabadiMobile || '', total: 0, paid: 0, pending: 0, count: 0, records: [], history: [], lastPaymentDate: '' }
      }
      const total   = Number(p.totalValue) || 0
      const paid    = Math.min(total, Number(p.amountPaid) || 0)
      const pend    = Math.max(0, total - paid)
      const history = (p.payHistory || []).map(h => ({ ...h, pickupId: p.id, orderId: p.orderId, donorName: p.donorName }))
      const fallback = history.length === 0 && paid > 0 ? [{ date: p.date, amount: paid, refMode: 'recorded', pickupId: p.id, orderId: p.orderId, donorName: p.donorName }] : []
      const allH = [...history, ...fallback]
      map[name].total   += total
      map[name].paid    += paid
      map[name].pending += pend
      map[name].count   += 1
      map[name].records.push(p)
      map[name].history.push(...allH)
      allH.forEach(h => { if (h.date && (!map[name].lastPaymentDate || h.date > map[name].lastPaymentDate)) map[name].lastPaymentDate = h.date })
    })
    return Object.values(map).sort((a, b) => {
      if (b.pending !== a.pending) return b.pending - a.pending
      return a.partnerName.localeCompare(b.partnerName)
    })
  }, [pickups, kabadiwalas, dateFrom, dateTo, filterKab, filterStatus, globalSearch])

  const globalKPIs = useMemo(() => ({
    totalPartners: partnerRows.length,
    withPending:   partnerRows.filter(r => r.pending > 0).length,
    totalRevenue:  partnerRows.reduce((s, r) => s + r.total, 0),
    totalReceived: partnerRows.reduce((s, r) => s + r.paid, 0),
    totalPending:  partnerRows.reduce((s, r) => s + r.pending, 0),
    totalPickups:  partnerRows.reduce((s, r) => s + r.count, 0),
  }), [partnerRows])

  // Open payment modal (from either partner-level or pickup-level)
  const openPayModal = useCallback(({ partner, pickup }) => {
    if (partner) {
      setPayContext({
        partnerName: partner.partnerName, kabId: partner.kabId,
        mobile: partner.mobile, isPartnerLevel: true,
        total: partner.total, paid: partner.paid, pending: partner.pending,
      })
    } else {
      const kab = kabadiwalas.find(k => k.name === pickup.kabadiwala) || {}
      setPayContext({
        partnerName: pickup.kabadiwala, kabId: kab.id || pickup.kabadiwala,
        pickupId: pickup.id, orderId: pickup.orderId,
        donorName: pickup.donorName, isPartnerLevel: false,
        total: pickup._total, paid: pickup._paid, pending: pickup._pending,
      })
    }
  }, [kabadiwalas])

  // Open write-off for a single pickup entry
  const openWriteOffEntry = useCallback((pickup) => {
    const kab = kabadiwalas.find(k => k.name === pickup.kabadiwala) || {}
    setWriteOffCtx({
      mode: 'entry',
      partnerName: pickup.kabadiwala, kabId: kab.id || pickup.kabadiwala,
      pickupId: pickup.id, orderId: pickup.orderId,
      donorName: pickup.donorName,
      pending: pickup._pending,
    })
  }, [kabadiwalas])

  // Open write-off for all pending of a partner
  const openWriteOffPartner = useCallback((partner) => {
    const pendingPickups = partner.records.filter(p => {
      const ps = p.paymentStatus || getPickupPayStatus(p.totalValue, p.amountPaid)
      return ps === 'Not Paid' || ps === 'Partially Paid'
    })
    setWriteOffCtx({
      mode: 'partner',
      partnerName: partner.partnerName, kabId: partner.kabId,
      pending: partner.pending,
      pickupCount: pendingPickups.length,
    })
  }, [])

  // Save payment
  const handlePaySave = useCallback(async ({ amount, date, method, reference, notes, screenshot, isFull }) => {
    if (!payContext) return
    setSaving(true)
    try {
      if (payContext.isPartnerLevel && isFull) {
        await clearPartnerBalance(
          { kabId: payContext.kabId, kabName: payContext.partnerName },
          { refMode: method, refValue: reference, notes, date, screenshot, writeOff: false }
        )
      } else {
        await recordKabadiwalaPayment(payContext.kabId, {
          pickupId:  payContext.isPartnerLevel ? undefined : payContext.pickupId,
          amount, date, refMode: method, refValue: reference, notes, screenshot,
        })
      }
      setPayContext(null)
    } finally { setSaving(false) }
  }, [payContext, clearPartnerBalance, recordKabadiwalaPayment])

  // Confirm write-off
  const handleWriteOffConfirm = useCallback(async ({ reason }) => {
    if (!writeOffCtx) return
    setSaving(true)
    try {
      if (writeOffCtx.mode === 'partner') {
        // Write off all pending for this partner
        await clearPartnerBalance(
          { kabId: writeOffCtx.kabId, kabName: writeOffCtx.partnerName },
          { refMode: 'writeoff', refValue: '', notes: reason, date: new Date().toISOString().slice(0, 10), writeOff: true }
        )
      } else {
        // Write off only this specific pickup entry
        await recordKabadiwalaPayment(writeOffCtx.kabId, {
          pickupId: writeOffCtx.pickupId,
          amount: 0, date: new Date().toISOString().slice(0, 10),
          refMode: 'writeoff', refValue: '', notes: reason, screenshot: null,
          writeOff: true, pendingToClose: writeOffCtx.pending,
        })
      }
      setWriteOffCtx(null)
    } finally { setSaving(false) }
  }, [writeOffCtx, clearPartnerBalance, recordKabadiwalaPayment])

  const handleExport = () => exportToExcel(
    partnerRows.map(r => ({
      'Pickup Partner': r.partnerName, 'Mobile': r.mobile,
      'Total (₹)': r.total, 'Received (₹)': r.paid, 'Pending (₹)': r.pending,
      'Pickups': r.count, 'Last Payment': r.lastPaymentDate || '',
    })),
    'Pickup_Partner_Payments'
  )

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card orange">
          <div className="stat-icon"><IndianRupee size={18} /></div>
          <div className="stat-value">{fmtCurrency(globalKPIs.totalRevenue)}</div>
          <div className="stat-label">Total RST Revenue</div>
          <div className="stat-change up">{globalKPIs.totalPickups} pickups</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle size={18} /></div>
          <div className="stat-value">{fmtCurrency(globalKPIs.totalReceived)}</div>
          <div className="stat-label">Total Received</div>
          <div className="stat-change up">{Math.round((globalKPIs.totalReceived / (globalKPIs.totalRevenue || 1)) * 100)}% collected</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><AlertCircle size={18} /></div>
          <div className="stat-value">{fmtCurrency(globalKPIs.totalPending)}</div>
          <div className="stat-label">Pending</div>
          <div className="stat-change down">{globalKPIs.withPending} partners</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Truck size={18} /></div>
          <div className="stat-value">{globalKPIs.totalPartners}</div>
          <div className="stat-label">Active Partners</div>
        </div>
      </div>

      {/* Write-off capability legend */}
      {canWriteOff && (
        <div style={{ padding: '9px 14px', marginBottom: 16, background: 'rgba(239,68,68,0.04)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ color: 'var(--danger)' }}>Write-Off Access Enabled</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
              <strong>Write Off</strong> on a row = only that pickup is closed.
              <span style={{ margin: '0 6px' }}>·</span>
              <strong>Write Off All</strong> on a partner card = all their pending entries are closed.
              <span style={{ margin: '0 6px' }}>·</span>
              Both require a reason and confirmation.
            </span>
          </div>
        </div>
      )}

      {/* ── Sync indicator ── */}
      <div style={{ marginBottom: 16, padding: '8px 14px', background: 'linear-gradient(135deg, rgba(27,94,53,0.06), rgba(232,82,26,0.06))', borderRadius: 8, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw size={12} color="var(--secondary)" />
        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
          Live sync — changes here reflect in Dashboard, Raddi Master &amp; RST Analytics
        </span>
      </div>

      {/* ── Filters ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <Calendar size={13} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period:</span>
          {DATE_PRESETS.map(p => (
            <button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11.5 }} onClick={() => setDatePreset(p.id)}>
              {p.label}
            </button>
          ))}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 138, fontSize: 12 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 138, fontSize: 12 }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '2 1 200px', minWidth: 0 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search partner, donor, order…" style={{ paddingLeft: 32, fontSize: 12.5, width: '100%' }} />
          </div>
          <select value={filterKab} onChange={e => setFilterKab(e.target.value)} style={{ flex: '1 1 150px', fontSize: 12.5 }}>
            <option value="All">All Partners</option>
            {kabNames.map(n => <option key={n}>{n}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: '1 1 140px', fontSize: 12.5 }}>
            <option value="All">All Statuses</option>
            <option value="Not Paid">Not Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Write Off">Write Off</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={handleExport} style={{ flexShrink: 0 }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
        <strong style={{ color: 'var(--text-primary)' }}>{partnerRows.length}</strong> partners ·
        <span style={{ color: 'var(--danger)', fontWeight: 600, marginLeft: 4 }}>{globalKPIs.withPending}</span> with pending
      </div>

      {/* ── Partner Cards ── */}
      {partnerRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><IndianRupee size={24} /></div>
          <h3>No payment records found</h3>
          <p>Try adjusting the date range or filters.</p>
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

      {/* ── Modals ── */}
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
        <HistoryModal partner={histPartner} onClose={() => setHistPartner(null)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RST REVENUE ANALYTICS (unchanged from original)
// ══════════════════════════════════════════════════════════════════════════════

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

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

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
      const lastH     = (pickup.payHistory || []).slice(-1)[0]
      return {
        ...r, total, collected, pending,
        partnerName: r.kabadiwalaName || pickup.kabadiwala || 'Unassigned',
        donorName:   r.name || pickup.donorName || '',
        lastPaymentDate: lastH?.date || (collected > 0 ? (pickup.date || r.pickupDate) : ''),
      }
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
      if (typeof av === 'number' || typeof bv === 'number')
        return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return rows
  }, [raddiRecords, pickupMap, dateFrom, dateTo, filterCity, filterSector, filterPay, search, sortKey, sortDir])

  const totals = useMemo(() => ({
    revenue:   filtered.reduce((s, r) => s + r.total, 0),
    collected: filtered.reduce((s, r) => s + r.collected, 0),
    pending:   filtered.reduce((s, r) => s + r.pending, 0),
    kg:        filtered.reduce((s, r) => s + (Number(r.totalKg) || 0), 0),
  }), [filtered])

  const toggleSort = (key) => {
    setSortDir(d => sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'desc')
    setSortKey(key)
  }

  const SortTh = ({ k, children, align }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor: 'pointer', userSelect: 'none', textAlign: align || 'left' }}>
      {children}
      <span style={{ marginLeft: 4, opacity: sortKey === k ? 0.7 : 0.2 }}>
        {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Revenue', val: money(totals.revenue), icon: IndianRupee, tone: 'orange' },
          { label: 'Collected',     val: money(totals.collected), icon: CheckCircle, tone: 'green' },
          { label: 'Pending',       val: money(totals.pending),   icon: AlertCircle, tone: 'red' },
          { label: 'Weight (kg)',   val: `${totals.kg.toFixed(1)} kg`, icon: Package, tone: 'blue' },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.label} className={`stat-card ${item.tone}`}>
              <div className="stat-icon"><Icon size={18} /></div>
              <div className="stat-value">{item.val}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <Calendar size={13} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup Date:</span>
          {DATE_PRESETS.map(p => (
            <button key={p.id} className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11.5 }} onClick={() => setDatePreset(p.id)}>
              {p.label}
            </button>
          ))}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 138, fontSize: 12 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 138, fontSize: 12 }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '2 1 200px', minWidth: 0 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partner, donor, society, order…" style={{ paddingLeft: 32, fontSize: 12.5, width: '100%' }} />
          </div>
          <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterSector('') }} style={{ flex: '1 1 130px', fontSize: 12.5 }}>
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={{ flex: '1 1 140px', fontSize: 12.5 }} disabled={!filterCity}>
            <option value="">{filterCity ? 'All Sectors' : 'Select city first'}</option>
            {uniqueSectors.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPay} onChange={e => setFilterPay(e.target.value)} style={{ flex: '1 1 140px', fontSize: 12.5 }}>
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Yet to Receive">Yet to Receive</option>
            <option value="Write-off">Write-off</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(
            filtered.map(r => ({ 'Partner': r.partnerName, 'Donor': r.donorName, 'Order ID': r.orderId, 'Date': r.pickupDate, 'Total (₹)': r.total, 'Paid (₹)': r.collected, 'Pending (₹)': r.pending, 'Status': r.paymentStatus, 'City': r.city, 'Sector': r.sector })),
            'RST_Revenue_Analytics'
          )}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
        <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> records
        {(search || filterCity || filterPay) && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginLeft: 8 }} onClick={() => { setSearch(''); setFilterCity(''); setFilterSector(''); setFilterPay('') }}>
            <X size={10} /> Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><BarChart3 size={24} /></div>
          <h3>No records found</h3>
          <p>Try a different date range or filter.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh k="partnerName">Pickup Partner</SortTh>
                  <SortTh k="donorName">Donor</SortTh>
                  <SortTh k="pickupDate">Pickup Date</SortTh>
                  <SortTh k="lastPaymentDate">Last Payment</SortTh>
                  <SortTh k="total" align="right">Total ₹</SortTh>
                  <SortTh k="collected" align="right">Paid ₹</SortTh>
                  <SortTh k="pending" align="right">Pending ₹</SortTh>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.orderId || r.pickupId}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.partnerName}</div>
                      <OrderIdChip id={r.orderId || r.pickupId} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.donorName || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{[r.society, r.sector].filter(Boolean).join(', ')}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{fmtDate(r.pickupDate)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{r.lastPaymentDate ? fmtDate(r.lastPaymentDate) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>{money(r.total)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>{r.collected > 0 ? money(r.collected) : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: r.pending > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {r.pending > 0 ? money(r.pending) : '—'}
                    </td>
                    <td><PayBadge status={r.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--secondary-light)', fontWeight: 800 }}>
                  <td colSpan={4} style={{ fontWeight: 700 }}>Totals ({filtered.length} records)</td>
                  <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{money(totals.revenue)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--secondary)' }}>{money(totals.collected)}</td>
                  <td style={{ textAlign: 'right', color: totals.pending > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                    {totals.pending > 0 ? money(totals.pending) : 'All clear ✓'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mobile-cards">
            {filtered.map(r => (
              <div key={r.orderId || r.pickupId} className="card" style={{ marginBottom: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{r.partnerName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.donorName || '—'}</div>
                    <OrderIdChip id={r.orderId || r.pickupId} />
                  </div>
                  <PayBadge status={r.paymentStatus} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{[r.society, r.sector, r.city].filter(Boolean).join(', ')}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{fmtDate(r.pickupDate)}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{money(r.total)}</span>
                  {r.collected > 0 && <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>Paid {money(r.collected)}</span>}
                  {r.pending > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Due {money(r.pending)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAYMENTS PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function Payments() {
  const { pickups, raddiRecords, kabadiwalas, recordKabadiwalaPayment, clearPartnerBalance } = useApp()
  const { role } = useRole()
  const [view, setView] = useState('partners')

  if (role === 'executive') {
    return (
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <Lock size={24} />
          </div>
          <h3>Access Restricted</h3>
          <p>Payment Tracking is available to Managers and Admins only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-body">
      <div style={{ marginBottom: 24 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${view === 'partners' ? 'active' : ''}`} onClick={() => setView('partners')}>
            <IndianRupee size={13} style={{ marginRight: 4 }} /> Pickup Partner Payments
          </button>
          <button className={`tab ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')}>
            <BarChart3 size={13} style={{ marginRight: 4 }} /> RST Revenue Analytics
          </button>
        </div>
      </div>

      {view === 'partners' && (
        <PartnerPaymentHub
          pickups={pickups}
          kabadiwalas={kabadiwalas}
          recordKabadiwalaPayment={recordKabadiwalaPayment}
          clearPartnerBalance={clearPartnerBalance}
        />
      )}
      {view === 'analytics' && (
        <RSTAnalytics raddiRecords={raddiRecords} pickups={pickups} />
      )}
    </div>
  )
}