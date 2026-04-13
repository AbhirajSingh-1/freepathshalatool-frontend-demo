// Frontend/src/App.jsx
import { useState, useEffect } from 'react'
import { AppProvider }    from './context/AppContext'
import { RoleProvider, useRole, ROLES, ROLE_PAGES, DEFAULT_PAGE } from './context/RoleContext'
import Sidebar            from './component/Layout/Sidebar'
import Header             from './component/Layout/Header'
import Dashboard          from './pages/Dashboard'
import Donors             from './pages/Donors'
import Pickups            from './pages/Pickups'
import PickupPartners     from './pages/Pickuppartners'
import Payments           from './pages/Payments'
import PickupScheduler    from './pages/PickupScheduler'
import PickupOverview     from './pages/PickupOverview'
import RaddiMaster        from './pages/RaddiMaster'
import SKSOverview        from './pages/SKSOverview'

const PAGES = {
  dashboard:       Dashboard,
  donors:          Donors,
  pickups:         Pickups,
  pickuppartners:  PickupPartners,
  payments:        Payments,
  pickupscheduler: PickupScheduler,
  pickupoverview:  PickupOverview,
  raddimaster:     RaddiMaster,
  sksoverview:     SKSOverview,
}

// ── Role Switcher (demo widget) ───────────────────────────────────────────────
function RoleSwitcher() {
  const { role, changeRole, ROLES } = useRole()
  const [open, setOpen] = useState(false)
  const current = ROLES[role]

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 300 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-md)', padding: 8, minWidth: 180,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px 8px' }}>
            Switch Role (Demo)
          </div>
          {Object.entries(ROLES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { changeRole(key); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '8px 12px', borderRadius: 8, border: 'none',
                background: role === key ? val.bg : 'transparent', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.15s',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: val.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: role === key ? 700 : 400, color: role === key ? val.color : 'var(--text-secondary)' }}>
                {val.label}
              </span>
              {role === key && <span style={{ marginLeft: 'auto', fontSize: 10, color: val.color }}>✓</span>}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderRadius: 20, border: `2px solid ${current.color}`, background: current.bg,
          cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: current.color,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: current.color }} />
        {current.label}
      </button>
    </div>
  )
}

// ── Access Denied page ────────────────────────────────────────────────────────
function AccessDenied({ onBack }) {
  return (
    <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="empty-state">
        <div className="empty-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h3>Access Restricted</h3>
        <p>You don't have permission to view this page. Contact your admin to request access.</p>
        <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={onBack}>
          ← Go Back
        </button>
      </div>
    </div>
  )
}

// ── Main App Shell ────────────────────────────────────────────────────────────
function AppShell() {
  const { can, role, ROLE_PAGES, DEFAULT_PAGE } = useRole()

  const ROLE_PAGES_EXTENDED = {
    admin:     [...(ROLE_PAGES.admin || []), 'sksoverview'],
    manager:   [...(ROLE_PAGES.manager || []), 'sksoverview'],
    executive: ROLE_PAGES.executive || [],
  }

  const getValidPage = (hash) => {
    const page = PAGES[hash] ? hash : DEFAULT_PAGE[role] || 'pickups'
    return ROLE_PAGES_EXTENDED[role]?.includes(page) ? page : (DEFAULT_PAGE[role] || 'pickups')
  }

  const [page, setPage]      = useState(() => getValidPage(window.location.hash.replace('#', '')))
  const [sidebarOpen, setSO] = useState(false)
  const [addDonor, setAddD]  = useState(false)

  useEffect(() => {
    if (!ROLE_PAGES_EXTENDED[role]?.includes(page)) {
      const fallback = DEFAULT_PAGE[role] || 'pickups'
      setPage(fallback)
      window.location.hash = fallback
    }
  }, [role]) // eslint-disable-line

  const navigate = (p) => {
    if (!ROLE_PAGES_EXTENDED[role]?.includes(p)) return
    setPage(p)
    window.location.hash = p
    setSO(false)
  }

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      const valid = getValidPage(hash)
      setPage(valid)
      if (valid !== hash) window.location.hash = valid
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [role]) // eslint-disable-line

  const PageComponent  = PAGES[page] || Dashboard
  const isAccessible   = ROLE_PAGES_EXTENDED[role]?.includes(page)

  return (
    <div className="app-layout">
      <Sidebar
        active={page}
        onNav={navigate}
        open={sidebarOpen}
        onClose={() => setSO(false)}
        onLogoClick={() => navigate(DEFAULT_PAGE[role] || 'pickups')}
        role={role}
      />
      <div className="main-content">
        <Header
          page={page}
          onMenuClick={() => setSO(o => !o)}
          onAddDonor={() => setAddD(true)}
        />
        {isAccessible ? (
          <PageComponent
            onNav={navigate}
            triggerAddDonor={addDonor}
            onAddDonorDone={() => setAddD(false)}
          />
        ) : (
          <AccessDenied onBack={() => navigate(DEFAULT_PAGE[role] || 'pickups')} />
        )}
      </div>
      <RoleSwitcher />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <RoleProvider>
        <AppShell />
      </RoleProvider>
    </AppProvider>
  )
}