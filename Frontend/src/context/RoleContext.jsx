// src/context/RoleContext.jsx
import { createContext, useContext, useState } from 'react'

export const ROLES = {
  admin:     { label: 'Admin',     color: '#E8521A', bg: '#FDE7DA' },
  manager:   { label: 'Manager',   color: '#1B5E35', bg: '#E8F5EE' },
  executive: { label: 'Executive', color: '#3B82F6', bg: '#DBEAFE' },
}

// Pages each role may access
export const ROLE_PAGES = {
  admin:     ['dashboard', 'donors', 'pickups', 'pickuppartners', 'payments', 'pickupscheduler', 'pickupoverview', 'raddimaster', 'sksoverview'],
  manager:   ['dashboard', 'donors', 'pickups', 'pickuppartners', 'payments', 'pickupscheduler', 'pickupoverview', 'sksoverview'],
  executive: ['pickups', 'pickuppartners'],
}

export const DEFAULT_PAGE = {
  admin:     'dashboard',
  manager:   'dashboard',
  executive: 'pickups',
}

const RoleContext = createContext(null)

export const useRole = () => {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be inside <RoleProvider>')
  return ctx
}

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('fp_role') || 'admin')

  const changeRole = (r) => {
    if (!ROLES[r]) return
    setRole(r)
    localStorage.setItem('fp_role', r)
  }

  const can = {
    viewDashboard:      role === 'admin' || role === 'manager',
    viewDonors:         role === 'admin' || role === 'manager',
    viewPayments:       role === 'admin' || role === 'manager',
    viewRaddiMaster:    role === 'admin',
    viewScheduler:      role === 'admin' || role === 'manager',
    viewReports:        role === 'admin' || role === 'manager',
    viewFinancials:     role === 'admin' || role === 'manager',
    viewPickupOverview: role === 'admin' || role === 'manager',
    viewPartnerReports: role === 'admin' || role === 'manager',
    viewSKSOverview:    role === 'admin' || role === 'manager',

    deletePartner:   role === 'admin',
    deletePickup:    role === 'admin',
    deleteDonor:     role === 'admin' || role === 'manager',
    addPartner:      true,
    editPartner:     role === 'admin' || role === 'manager',
    recordPickup:    true,
    schedulePickup:  role === 'admin' || role === 'manager',
    manageDonors:    role === 'admin' || role === 'manager',

    canAccessPage: (page) => (ROLE_PAGES[role] || []).includes(page),
  }

  return (
    <RoleContext.Provider value={{ role, changeRole, can, ROLES, ROLE_PAGES, DEFAULT_PAGE }}>
      {children}
    </RoleContext.Provider>
  )
}