import { useState, useEffect } from 'react'
import Sidebar         from './component/Layout/Sidebar'
import Header          from './component/Layout/Header'
import Dashboard       from './pages/Dashboard'
import Donors          from './pages/Donors'
import Pickups         from './pages/Pickups'
import Kabadiwala      from './pages/Kabadiwala'
import Payments        from './pages/Payments'
import PickupScheduler from './pages/PickupScheduler'
import KabadiPickups   from './pages/KabadiPickups'
import CustomerPickups from './pages/CustomerPickups'
// import LostPostponed   from './pages/LostPostponed'
import Reports         from './pages/Reports'
import WhatsApp        from './pages/WhatsApp'
import { fetchPickups, fetchDonors } from './services/api'

const PAGES = {
  dashboard:       Dashboard,
  donors:          Donors,
  pickups:         Pickups,
  kabadiwala:      Kabadiwala,
  payments:        Payments,
  pickupscheduler: PickupScheduler,
  kabadipickups:   KabadiPickups,
  customerpickups: CustomerPickups,
  // lostpostponed:   LostPostponed,
  reports:         Reports,
  whatsapp:        WhatsApp,
}

// Read initial page from URL hash, fall back to 'dashboard'
function getPageFromHash() {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'pickupcalendar') return 'pickupscheduler'
  return PAGES[hash] ? hash : 'dashboard'
}

export default function App() {
  const [page, setPage]      = useState(getPageFromHash)
  const [sidebarOpen, setSO] = useState(false)
  const [addDonor, setAddD]  = useState(false)
  const [addPickup, setAddP] = useState(false)
  const [overdueCt, setOverdueCt] = useState(0)

  // Navigate: update state + URL hash
  const navigate = (p) => {
    setPage(p)
    window.location.hash = p
    setSO(false)
  }

  // Listen for browser back/forward button
  useEffect(() => {
    const onHashChange = () => {
      const p = getPageFromHash()
      setPage(p)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Compute overdue badge count
  useEffect(() => {
    Promise.all([fetchDonors(), fetchPickups()]).then(([donors]) => {
      const ct = donors.filter(d =>
        d.nextPickup && new Date(d.nextPickup) < new Date() && d.status === 'Active'
      ).length
      setOverdueCt(ct)
    })
  }, [page])

  const PageComponent = PAGES[page] || Dashboard

  return (
    <div className="app-layout">
      <Sidebar
        active={page}
        onNav={navigate}
        open={sidebarOpen}
        onClose={() => setSO(false)}
        overdueCount={overdueCt}
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
