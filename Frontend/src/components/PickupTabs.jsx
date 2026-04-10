import { AlertTriangle, Calendar, Clock, UserX, Hash } from 'lucide-react'
import { fmtDate } from '../utils/helpers'

const TABS = [
  { id: 'overdue',   label: 'Overdue Pickups',   icon: AlertTriangle, color: 'var(--danger)',    bg: 'var(--danger-bg)' },
  { id: 'scheduled', label: 'Scheduled Pickups',  icon: Calendar,      color: 'var(--info)',      bg: 'var(--info-bg)' },
  { id: 'atRisk',    label: 'At Risk Schedules',  icon: Clock,         color: 'var(--warning)',   bg: 'var(--warning-bg)' },
  { id: 'churned',   label: 'Churned Pickups',    icon: UserX,         color: 'var(--text-muted)', bg: 'var(--border-light)' },
]

// ── Order ID chip ─────────────────────────────────────────────────────────────
function OrderIdChip({ orderId }) {
  if (!orderId) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontFamily: 'monospace', fontSize: 10.5, fontWeight: 600,
      color: 'var(--primary)', background: 'var(--primary-light)',
      padding: '2px 7px', borderRadius: 5,
      border: '1px solid rgba(232,82,26,0.2)',
      whiteSpace: 'nowrap',
    }}>
      <Hash size={9} />{orderId}
    </span>
  )
}

// ── Overdue table ────────────────────────────────────────────────────────────
function OverdueTable({ data }) {
  if (!data.length) return <EmptySection message="No overdue pickups! Everything is on track." />
  return (
    <>
      <div className="alert-strip alert-danger" style={{ marginBottom: 16 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
        <span><strong>{data.length} pickup{data.length > 1 ? 's' : ''}</strong> missed their scheduled date. Follow up immediately.</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Donor</th>
              <th>Location</th>
              <th>Scheduled Date</th>
              <th>Time Slot</th>
              <th>Days Overdue</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id}>
                <td><OrderIdChip orderId={p.orderId} /></td>
                <td>
                  <div style={{ fontWeight: 700 }}>{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.mobile}</div>
                </td>
                <td style={{ fontSize: 12.5 }}>
                  <div>{p.society}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sector}, {p.city}</div>
                </td>
                <td style={{ fontSize: 12.5 }}>{fmtDate(p.scheduledDate)}</td>
                <td>
                  <span className="badge badge-muted" style={{ fontSize: 10.5 }}>{p.timeSlot}</span>
                </td>
                <td>
                  <span className="badge badge-danger" style={{ fontSize: 11 }}>{p.daysOverdue} days</span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: p.notes ? 'italic' : 'normal' }}>
                  {p.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards">
        {data.map(p => (
          <MobileCard key={p.id} p={p} badge={<span className="badge badge-danger">{p.daysOverdue}d overdue</span>} />
        ))}
      </div>
    </>
  )
}

// ── Scheduled table ──────────────────────────────────────────────────────────
function ScheduledTable({ data }) {
  if (!data.length) return <EmptySection message="No upcoming pickups scheduled yet." />
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Donor</th>
              <th>Location</th>
              <th>Pickup Date</th>
              <th>Time Slot</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id}>
                <td><OrderIdChip orderId={p.orderId} /></td>
                <td>
                  <div style={{ fontWeight: 700 }}>{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.mobile}</div>
                </td>
                <td style={{ fontSize: 12.5 }}>
                  <div>{p.society}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sector}, {p.city}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtDate(p.scheduledDate)}</div>
                </td>
                <td>
                  <span className="badge badge-info" style={{ fontSize: 10.5 }}>{p.timeSlot}</span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: p.notes ? 'italic' : 'normal' }}>
                  {p.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {data.map(p => (
          <MobileCard key={p.id} p={p} badge={<span className="badge badge-info">{fmtDate(p.scheduledDate)}</span>} />
        ))}
      </div>
    </>
  )
}

// ── At Risk table ────────────────────────────────────────────────────────────
function AtRiskTable({ data }) {
  if (!data.length) return <EmptySection message="No at-risk donors right now. Great job!" />
  return (
    <>
      <div className="alert-strip alert-warning" style={{ marginBottom: 16 }}>
        <Clock size={14} style={{ flexShrink: 0 }} />
        <span><strong>{data.length} donor{data.length > 1 ? 's' : ''}</strong> are delaying pickups frequently — proactive outreach recommended.</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Location</th>
              <th>Last Pickup</th>
              <th>Days Since</th>
              <th>Missed</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.mobile}</div>
                </td>
                <td style={{ fontSize: 12.5 }}>
                  <div>{p.society}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sector}, {p.city}</div>
                </td>
                <td style={{ fontSize: 12.5 }}>{fmtDate(p.lastPickup)}</td>
                <td>
                  <span className="badge badge-warning" style={{ fontSize: 11 }}>{p.daysSincePickup} days</span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{p.missedCount}×</span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: p.notes ? 'italic' : 'normal' }}>
                  {p.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {data.map(p => (
          <MobileCard key={p.id} p={p} badge={<span className="badge badge-warning">{p.daysSincePickup}d ago</span>} />
        ))}
      </div>
    </>
  )
}

// ── Churned table ────────────────────────────────────────────────────────────
function ChurnedTable({ data }) {
  if (!data.length) return <EmptySection message="No churned donors. Keep up the great engagement!" />
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Location</th>
              <th>Last Pickup</th>
              <th>Inactive For</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.mobile}</div>
                </td>
                <td style={{ fontSize: 12.5 }}>
                  <div>{p.society}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sector}, {p.city}</div>
                </td>
                <td style={{ fontSize: 12.5 }}>{fmtDate(p.lastPickup)}</td>
                <td>
                  <span className="badge badge-muted" style={{ fontSize: 11 }}>{p.daysSincePickup} days</span>
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{p.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {data.map(p => (
          <MobileCard key={p.id} p={p} badge={<span className="badge badge-muted">{p.daysSincePickup}d inactive</span>} />
        ))}
      </div>
    </>
  )
}

// ── Shared helpers ───────────────────────────────────────────────────────────
function EmptySection({ message }) {
  return (
    <div className="empty-state" style={{ padding: 48 }}>
      <p>{message}</p>
    </div>
  )
}

function MobileCard({ p, badge }) {
  return (
    <div className="card" style={{ marginBottom: 10, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.donorName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.mobile}</div>
        </div>
        {badge}
      </div>
      {p.orderId && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 6px', borderRadius: 4 }}>
            <Hash size={9} style={{ verticalAlign: 'middle', marginRight: 2 }} />{p.orderId}
          </span>
        </div>
      )}
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {p.society}, {p.sector}
      </div>
      {(p.timeSlot || p.scheduledDate) && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {p.timeSlot || fmtDate(p.scheduledDate)}
        </div>
      )}
      {p.notes && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>{p.notes}</div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PickupTabs component
// ════════════════════════════════════════════════════════════════════════════
export default function PickupTabs({ activeTab, onTabChange, data, loading }) {
  const counts = {
    overdue:   data.overdue?.length   ?? 0,
    scheduled: data.scheduled?.length ?? 0,
    atRisk:    data.atRisk?.length    ?? 0,
    churned:   data.churned?.length   ?? 0,
  }

  return (
    <div>
      {/* ── Tab Toggle Buttons ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {TABS.map(tab => {
          const Icon    = tab.icon
          const isActive = activeTab === tab.id
          const count   = counts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${isActive ? tab.color : 'var(--border)'}`,
                background: isActive ? tab.bg : 'var(--surface)',
                color: isActive ? tab.color : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Icon size={14} />
              {tab.label}
              {count > 0 && (
                <span style={{
                  background: isActive ? tab.color : 'var(--border)',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  fontSize: 10.5, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 20,
                  minWidth: 20, textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      {loading ? (
        <SkeletonTable />
      ) : (
        <div>
          {activeTab === 'overdue'   && <OverdueTable   data={data.overdue   || []} />}
          {activeTab === 'scheduled' && <ScheduledTable data={data.scheduled || []} />}
          {activeTab === 'atRisk'    && <AtRiskTable    data={data.atRisk    || []} />}
          {activeTab === 'churned'   && <ChurnedTable   data={data.churned   || []} />}
        </div>
      )}
    </div>
  )
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function SkeletonTable() {
  return (
    <div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: 52, borderRadius: 8,
          background: 'linear-gradient(90deg, var(--border-light) 25%, var(--bg) 50%, var(--border-light) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          marginBottom: 8,
        }} />
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
    </div>
  )
}