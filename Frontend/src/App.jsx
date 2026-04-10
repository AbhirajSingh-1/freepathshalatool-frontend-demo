// Frontend/src/App.jsx
import { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import Sidebar           from './component/Layout/Sidebar'
import Header            from './component/Layout/Header'
import Dashboard         from './pages/Dashboard'
import Donors            from './pages/Donors'
import Pickups           from './pages/Pickups'
import Kabadiwala        from './pages/Kabadiwala'
import Payments          from './pages/Payments'
import PickupScheduler   from './pages/PickupScheduler'
// import KabadiPickups     from './pages/KabadiPickups'
// import CustomerPickups   from './pages/CustomerPickups'
import Reports           from './pages/Reports'
// import RaddiMaster       from './pages/RaddiMaster'

const PAGES = {
  dashboard:       Dashboard,
  donors:          Donors,
  pickups:         Pickups,
  kabadiwala:      Kabadiwala,
  payments:        Payments,
  pickupscheduler: PickupScheduler,
  // kabadipickups:   KabadiPickups,
  // customerpickups: CustomerPickups,
  reports:         Reports,
  // raddimaster:     RaddiMaster,
}

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '')
  return PAGES[hash] ? hash : 'dashboard'
}

function AppShell() {
  const [page, setPage]      = useState(getPageFromHash)
  const [sidebarOpen, setSO] = useState(false)
  const [addDonor, setAddD]  = useState(false)
  const [addPickup, setAddP] = useState(false)

  const navigate = (p) => {
    setPage(p)
    window.location.hash = p
    setSO(false)
  }

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const PageComponent = PAGES[page] || Dashboard

  return (
    <div className="app-layout">
      <Sidebar
        active={page}
        onNav={navigate}
        open={sidebarOpen}
        onClose={() => setSO(false)}
        onLogoClick={() => navigate('dashboard')}
      />
      <div className="main-content">
        <Header
          page={page}
          onMenuClick={() => setSO(o => !o)}
          onAddDonor={() => setAddD(true)}
          onAddPickup={() => setAddP(true)}
        />
        <PageComponent
          onNav={navigate}
          triggerAddDonor={addDonor}
          triggerAddPickup={addPickup}
          onAddDonorDone={() => setAddD(false)}
          onAddPickupDone={() => setAddP(false)}
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}