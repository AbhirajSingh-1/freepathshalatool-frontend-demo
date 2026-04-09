import { Menu, Bell } from 'lucide-react'

const PAGE_META = {
  dashboard:       { title: 'Dashboard',         sub: 'Overview & quick stats' },
  donors:          { title: 'Donors',            sub: 'Manage donor profiles' },
  pickups:         { title: 'Pickups',           sub: 'RST & SKS pickup management' },
  kabadiwala:      { title: 'Kabadiwala',        sub: 'Scrap dealer directory & financials' },
  payments:        { title: 'Payment Tracking',  sub: 'Track and update kabadiwala payments' },
  pickupscheduler: { title: 'Pickup Scheduler',  sub: 'Schedule and manage donor pickups from the office desk' },
  kabadipickups:   { title: 'Kabadi Pickup List', sub: 'Date-wise pickup schedule' },
  customerpickups: { title: 'Donor Pickup History', sub: 'Date-wise donor pickup tracker' },
  lostpostponed:   { title: 'Lost & Postponed',  sub: 'Inactive donor management' },
  whatsapp:        { title: 'WhatsApp',          sub: 'Communication templates' },
  reports:         { title: 'Reports',           sub: 'Analytics & insights' },
}

export default function Header({ page, onMenuClick, onAddDonor, onAddPickup }) {
  const meta = PAGE_META[page] || {}

  return (
    <header className="header">
      <button className="hamburger btn-icon" onClick={onMenuClick}>
        <Menu size={20} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="header-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.title}
        </div>
        <div className="header-subtitle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.sub}
        </div>
      </div>

      <div className="header-actions">
        {page === 'donors' && (
          <button className="btn btn-primary btn-sm" onClick={onAddDonor}>
            + Add Donor
          </button>
        )}
        {page === 'pickups' && (
          <button className="btn btn-primary btn-sm" onClick={onAddPickup}>
            + Record Pickup
          </button>
        )}
        {page === 'pickupscheduler' && (
          <button className="btn btn-primary btn-sm" onClick={onAddPickup}>
            + Schedule Pickup
          </button>
        )}
        <button className="btn btn-ghost btn-icon" title="Notifications">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
