// Frontend/src/component/Layout/Sidebar.jsx
import {
  LayoutDashboard, Users, Truck, UserCheck, BarChart3,
  IndianRupee, CalendarDays, Table2, Eye,
} from 'lucide-react'

const getRole = () => localStorage.getItem('fp_role') || 'admin'

const buildNav = (role) => {
  const isAdmin     = role === 'admin'
  const isManager   = role === 'manager'
  const isExecutive = role === 'executive'

  if (isExecutive) {
    return [
      { section: 'Field Operations' },
      { id: 'pickups',        label: 'Record Pickup',    icon: Truck },
      { id: 'pickuppartners', label: 'Pickup Partners',  icon: UserCheck },
    ]
  }

  return [
    { section: 'Main' },
    { id: 'dashboard',       label: 'Dashboard',        icon: LayoutDashboard },
    { section: 'Management' },
    { id: 'donors',          label: 'Donors',            icon: Users },
    { id: 'pickups',         label: 'Pickups',           icon: Truck },
    { id: 'pickuppartners',  label: 'Pickup Partners',   icon: UserCheck },
    { section: 'Finance' },
    { id: 'payments',        label: 'Payment Tracking',  icon: IndianRupee },
    { section: 'Scheduling' },
    { id: 'pickupscheduler', label: 'Pickup Scheduler',  icon: CalendarDays },
    ...(isAdmin || isManager
      ? [{ id: 'pickupoverview', label: 'Pickup Overview', icon: Eye }]
      : []
    ),
    { section: 'Insights' },
    ...(isAdmin
      ? [{ id: 'raddimaster', label: 'Raddi Master', icon: Table2 }]
      : []
    ),
  ]
}

export default function Sidebar({ active, onNav, open, onClose, overdueCount, onLogoClick }) {
  const role = getRole()
  const NAV  = buildNav(role)

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div
          className="sidebar-brand"
          onClick={onLogoClick}
          style={{ cursor: 'pointer' }}
          title="Go to Home"
        >
          <div className="sidebar-logo">
            <div className="logo-icon">F</div>
            <div>
              <div className="logo-text">FreePathshala</div>
              <div className="logo-sub">Donor &amp; Pickup</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} className="nav-section-label">{item.section}</div>
            )
            const Icon  = item.icon
            const badge = item.id === 'pickups' && overdueCount > 0 ? overdueCount : null

            return (
              <button
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => { onNav(item.id); onClose?.() }}
              >
                <Icon className="nav-icon" />
                {item.label}
                {badge && <span className="nav-badge">{badge}</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>FreePathshala NGO</div>
            <div>12A &amp; 80G Certified</div>
            <div style={{ marginTop: 2 }}>v2.1.0</div>
          </div>
        </div>
      </aside>
    </>
  )
}