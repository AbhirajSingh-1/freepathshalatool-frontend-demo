import {
  LayoutDashboard, Users, Truck, UserCheck, BarChart3,
  CalendarSearch, PackageSearch, IndianRupee, CalendarDays,
} from 'lucide-react'

const NAV = [
  { section: 'Main' },
  { id: 'dashboard',       label: 'Dashboard',            icon: LayoutDashboard },
  { section: 'Management' },
  { id: 'donors',          label: 'Donors',               icon: Users },
  { id: 'pickups',         label: 'Pickups',              icon: Truck },
  { id: 'kabadiwala',      label: 'Kabadiwala',           icon: UserCheck },
  { section: 'Finance' },
  { id: 'payments',        label: 'Payment Tracking',     icon: IndianRupee },
  { section: 'Pickup Views' },
  { id: 'pickupscheduler', label: 'Pickup Scheduler',     icon: CalendarDays, showOverdueBadge: true },
  { id: 'kabadipickups',   label: 'Kabadi Pickup List',   icon: CalendarSearch },
  { id: 'customerpickups', label: 'Donor Pickup History', icon: PackageSearch },
  { section: 'Insights' },
  { id: 'reports',         label: 'Reports',              icon: BarChart3 },
]

export default function Sidebar({ active, onNav, open, onClose, overdueCount, onLogoClick }) {
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
          title="Go to Dashboard"
        >
          <div className="sidebar-logo">
            <div className="logo-icon">F</div>
            <div>
              <div className="logo-text">FreePathshala</div>
              <div className="logo-sub">Donor & Pickup</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} className="nav-section-label">{item.section}</div>
            )
            const Icon = item.icon
            const badge = (item.id === 'pickups' || item.showOverdueBadge) && overdueCount > 0
              ? overdueCount : null

            return (
              <button
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => { onNav(item.id); onClose() }}
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
            <div>12A & 80G Certified</div>
            <div style={{ marginTop: 2 }}>v1.2.0</div>
          </div>
        </div>
      </aside>
    </>
  )
}
