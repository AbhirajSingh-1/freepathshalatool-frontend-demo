// Frontend/src/pages/TodayPickups.jsx
// Tabs: Pending / Completed / Others — real-time via AppContext
// FIX: handleRecord now passes pickupId so Pickups page calls recordPickup()
//      on the existing scheduled entry instead of creating a duplicate.
import { useMemo, useState } from 'react'
import {
  Calendar, Truck, CheckCircle, Clock,
  MapPin, Phone, Hash, AlertTriangle,
  Users, ChevronRight, ClipboardList,
} from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { useRole } from '../context/RoleContext'

const todayStr = () => new Date().toISOString().slice(0, 10)

// ── Chips ─────────────────────────────────────────────────────────────────────
function OrderIdChip({ id }) {
  if (!id) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700,
      color: 'var(--primary)', background: 'var(--primary-light)',
      padding: '2px 7px', borderRadius: 5,
      border: '1px solid rgba(232,82,26,0.2)', whiteSpace: 'nowrap',
    }}>
      <Hash size={9} />{id}
    </span>
  )
}

function TimeSlotBadge({ slot }) {
  if (!slot) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10.5, fontWeight: 600, padding: '2px 9px',
      borderRadius: 20, background: 'var(--border-light)',
      color: 'var(--text-muted)', whiteSpace: 'nowrap',
    }}>
      <Clock size={9} />{slot}
    </span>
  )
}

// ── Single pickup card ────────────────────────────────────────────────────────
function PickupCard({ pickup, onRecord }) {
  const isPending   = pickup.status === 'Pending'
  const isCompleted = pickup.status === 'Completed'
  const isDrive     = pickup.pickupMode === 'Drive'

  const borderColor = isCompleted ? 'var(--secondary)' : isPending ? 'var(--info)' : 'var(--warning)'
  const avatarBg    = isCompleted ? 'var(--secondary-light)' : isPending ? 'var(--info-bg)' : 'var(--warning-bg)'
  const avatarColor = isCompleted ? 'var(--secondary)' : isPending ? 'var(--info)' : 'var(--warning)'

  const rstCount   = (pickup.rstItems  || []).length
  const sksCount   = (pickup.sksItems  || []).length
  const totalItems = rstCount + sksCount
  const MAX_TAGS   = 4

  return (
    <div
      className="card"
      style={{
        marginBottom: 10,
        borderLeft: `4px solid ${borderColor}`,
        opacity: isCompleted ? 0.88 : 1,
        transition: 'box-shadow 0.15s',
      }}
    >
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* Avatar */}
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
            color: avatarColor,
          }}>
            {(pickup.donorName || '?')[0].toUpperCase()}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              <OrderIdChip id={pickup.orderId || pickup.id} />
              {isDrive && (
                <span className="badge badge-info" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Users size={8} />Drive
                </span>
              )}
              <span
                className={`badge ${isCompleted ? 'badge-success' : isPending ? 'badge-info' : 'badge-warning'}`}
                style={{ fontSize: 10 }}
              >
                {isCompleted ? 'Completed' : isPending ? 'Scheduled' : pickup.status}
              </span>
              <TimeSlotBadge slot={pickup.timeSlot} />
            </div>

            <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)', marginBottom: 3 }}>
              {pickup.donorName}
            </div>
            {pickup.mobile && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Phone size={10} /> {pickup.mobile}
              </div>
            )}
            {(pickup.society || pickup.sector) && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={10} style={{ flexShrink: 0 }} />
                <span className="truncate">
                  {[pickup.society, pickup.sector, pickup.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {totalItems > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 7 }}>
                {(pickup.rstItems || []).slice(0, MAX_TAGS).map(item => (
                  <span key={item} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--secondary-light)', color: 'var(--secondary)', fontWeight: 600 }}>
                    {item}
                  </span>
                ))}
                {(pickup.sksItems || []).slice(0, Math.max(0, MAX_TAGS - rstCount)).map(item => (
                  <span key={item} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--info)', fontWeight: 600 }}>
                    {item}
                  </span>
                ))}
                {totalItems > MAX_TAGS && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '1px 4px' }}>+{totalItems - MAX_TAGS} more</span>
                )}
              </div>
            )}
            {pickup.notes && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 6, padding: '4px 8px', background: 'var(--bg)', borderRadius: 5 }}>
                📝 {pickup.notes}
              </div>
            )}
          </div>

          {/* Action */}
          <div style={{ flexShrink: 0, paddingTop: 2 }}>
            {isPending ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onRecord(pickup)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                <Truck size={13} />Record Pickup<ChevronRight size={12} />
              </button>
            ) : isCompleted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--secondary)', padding: '7px 12px', background: 'var(--secondary-light)', borderRadius: 8, whiteSpace: 'nowrap' }}>
                <CheckCircle size={13} /> Done
              </div>
            ) : (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--warning)', padding: '6px 10px', background: 'var(--warning-bg)', borderRadius: 8, whiteSpace: 'nowrap' }}>
                {pickup.status}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ label, count, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 8, border: 'none',
        cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? color : 'var(--text-muted)',
        background: active ? 'var(--surface)' : 'transparent',
        boxShadow: active ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {label}
      <span style={{
        background: active ? color : 'var(--border)',
        color: active ? 'white' : 'var(--text-muted)',
        borderRadius: 20, fontSize: 11, fontWeight: 700,
        padding: '1px 8px', lineHeight: 1.5,
        transition: 'all 0.15s',
      }}>
        {count}
      </span>
      {active && (
        <span style={{
          position: 'absolute', bottom: -4, left: '50%',
          transform: 'translateX(-50%)',
          width: 32, height: 3, borderRadius: 2,
          background: color,
        }} />
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function TodayPickups({ onNav }) {
  const { pickups } = useApp()
  const { role, ROLE_PAGES } = useRole()

  const [activeTab, setActiveTab] = useState('pending')

  const today = todayStr()

  const todayPickups = useMemo(() => {
    const timeOrder = [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
    ]
    return pickups
      .filter(p => p.date === today)
      .sort((a, b) => {
        const at = timeOrder.findIndex(t => (a.timeSlot || '').startsWith(t))
        const bt = timeOrder.findIndex(t => (b.timeSlot || '').startsWith(t))
        if (at !== -1 && bt !== -1 && at !== bt) return at - bt
        if (at === -1 && bt !== -1) return 1
        if (at !== -1 && bt === -1) return -1
        return (a.donorName || '').localeCompare(b.donorName || '')
      })
  }, [pickups, today])

  const pending   = useMemo(() => todayPickups.filter(p => p.status === 'Pending'),   [todayPickups])
  const completed = useMemo(() => todayPickups.filter(p => p.status === 'Completed'), [todayPickups])
  const others    = useMemo(() => todayPickups.filter(p => p.status !== 'Pending' && p.status !== 'Completed'), [todayPickups])

  /**
   * FIX: Pass both donorId AND pickupId to the Pickups page.
   * Pickups.jsx will detect initialPickupId and call recordPickup() on the
   * existing scheduled entry instead of createPickup() — preventing duplicates
   * and correctly moving the card from Pending → Completed.
   */
  const handleRecord = (pickup) => onNav('pickups', {
    donorId:  pickup.donorId,
    pickupId: pickup.id,
  })

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const canSchedule = (ROLE_PAGES[role] || []).includes('pickupscheduler')
  const progressPct = todayPickups.length > 0
    ? Math.round((completed.length / todayPickups.length) * 100)
    : 0

  return (
    <div className="page-body">

      {/* ── Hero header ── */}
      <div style={{
        marginBottom: 20, padding: '18px 22px',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        borderRadius: 'var(--radius)', boxShadow: '0 4px 18px rgba(232,82,26,0.28)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Calendar size={23} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
            Today's Pickups
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', marginTop: 3 }}>{todayFormatted}</div>
          {todayPickups.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden', width: 200, maxWidth: '100%' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${progressPct}%`, background: 'rgba(255,255,255,0.9)', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                {completed.length} of {todayPickups.length} completed · {progressPct}%
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {todayPickups.length}
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
            Total Today
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card blue">
          <div className="stat-icon"><Clock size={18} /></div>
          <div className="stat-value">{pending.length}</div>
          <div className="stat-label">Pending</div>
          <div className="stat-change up">Awaiting recording</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle size={18} /></div>
          <div className="stat-value">{completed.length}</div>
          <div className="stat-label">Completed</div>
          <div className="stat-change up">Done today ✓</div>
        </div>
        {others.length > 0 && (
          <div className="stat-card yellow">
            <div className="stat-icon"><AlertTriangle size={18} /></div>
            <div className="stat-value">{others.length}</div>
            <div className="stat-label">Postponed / No Answer</div>
            <div className="stat-change down">Needs follow-up</div>
          </div>
        )}
      </div>

      {/* ── "Others" alert (always visible when non-empty) ── */}
      {others.length > 0 && (
        <div className="alert-strip alert-warning" style={{ marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>{others.length} pickup{others.length > 1 ? 's' : ''}</strong> marked as Postponed or No Answer — follow up required.
          </span>
        </div>
      )}

      {/* ── Tabs ── */}
      {todayPickups.length > 0 && (
        <div style={{
          display: 'flex', gap: 4, padding: '4px 6px',
          background: 'var(--border-light)', borderRadius: 12,
          width: 'fit-content', marginBottom: 20,
        }}>
          <TabBtn
            label="Pending"
            count={pending.length}
            active={activeTab === 'pending'}
            color="var(--info)"
            onClick={() => setActiveTab('pending')}
          />
          <TabBtn
            label="Completed"
            count={completed.length}
            active={activeTab === 'completed'}
            color="var(--secondary)"
            onClick={() => setActiveTab('completed')}
          />
          {others.length > 0 && (
            <TabBtn
              label="Others"
              count={others.length}
              active={activeTab === 'others'}
              color="var(--warning)"
              onClick={() => setActiveTab('others')}
            />
          )}
        </div>
      )}

      {/* ── Tab Content ── */}
      {todayPickups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <ClipboardList size={26} />
          </div>
          <h3>No Pickups Scheduled Today</h3>
          <p>
            {canSchedule
              ? "No pickups are assigned for today. Use the Pickup Scheduler to plan today's collection."
              : "No pickups are assigned for today. Your manager will schedule pickups and they will appear here."}
          </p>
          {canSchedule && (
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => onNav('pickupscheduler')}>
              Open Pickup Scheduler →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* PENDING TAB */}
          {activeTab === 'pending' && (
            <>
              {pending.length === 0 ? (
                <div className="empty-state" style={{ padding: 48 }}>
                  <div className="empty-icon" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
                    <CheckCircle size={24} />
                  </div>
                  <h3>All Done! 🎉</h3>
                  <p>All pickups for today have been completed.</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} color="var(--info)" />
                    <span><strong style={{ color: 'var(--text-primary)' }}>{pending.length}</strong> pickup{pending.length !== 1 ? 's' : ''} awaiting recording — tap <strong>Record Pickup</strong> to complete</span>
                  </div>
                  {pending.map(p => <PickupCard key={p.id} pickup={p} onRecord={handleRecord} />)}
                </>
              )}
            </>
          )}

          {/* COMPLETED TAB */}
          {activeTab === 'completed' && (
            <>
              {completed.length === 0 ? (
                <div className="empty-state" style={{ padding: 48 }}>
                  <div className="empty-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                    <Truck size={24} />
                  </div>
                  <h3>No Completed Pickups Yet</h3>
                  <p>Completed pickups will appear here once recorded.</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={12} color="var(--secondary)" />
                    <span><strong style={{ color: 'var(--text-primary)' }}>{completed.length}</strong> pickup{completed.length !== 1 ? 's' : ''} completed today</span>
                  </div>
                  {completed.map(p => <PickupCard key={p.id} pickup={p} onRecord={handleRecord} />)}
                </>
              )}
            </>
          )}

          {/* OTHERS TAB */}
          {activeTab === 'others' && others.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                <strong style={{ color: 'var(--warning)' }}>{others.length}</strong> pickup{others.length !== 1 ? 's' : ''} with status requiring attention
              </div>
              {others.map(p => <PickupCard key={p.id} pickup={p} onRecord={handleRecord} />)}
            </>
          )}
        </>
      )}
    </div>
  )
}