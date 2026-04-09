/**
 * AppContext.jsx — FreePathshala Central State Manager
 * All pages read from and write to this single source of truth.
 * Swap mock helpers for real API calls without touching any page.
 */

import { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import { raddiMasterData } from '../data/raddimockData'
import { donors as _donors, pickups as _pickups, kabadiwalas as _kabs } from '../data/mockData'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Compute health status label + tailwind-ish class from lastPickup date */
export function getDonorHealth(lastPickup) {
  if (!lastPickup) return { label: 'New', color: 'badge-info', days: null }
  const days = Math.floor((Date.now() - new Date(lastPickup)) / 86_400_000)
  if (days <= 30)  return { label: 'Active',      color: 'badge-success', days }
  if (days <= 45)  return { label: 'Pickup Due',  color: 'badge-info',    days }
  if (days <= 60)  return { label: 'At Risk',     color: 'badge-warning', days }
  return              { label: 'Churned',      color: 'badge-danger',  days }
}

function today() { return new Date().toISOString().slice(0, 10) }
let _seq = 9000  // mock ID counter

// ─── Initial State ────────────────────────────────────────────────────────────

/**
 * Enrich donors with computed fields so every page sees the same live status.
 * In production replace with server-derived fields.
 */
function enrichDonors(donors, pickups) {
  return donors.map(d => {
    const donorPickups = pickups
      .filter(p => p.donorId === d.id && p.status === 'Completed')
      .sort((a, b) => b.date.localeCompare(a.date))

    const lastPickup   = donorPickups[0]?.date || d.lastPickup || null
    const health       = getDonorHealth(lastPickup)
    const totalRST     = donorPickups.reduce((s, p) => s + (p.totalValue || 0), 0) || d.totalRST || 0
    const totalSKS     = donorPickups.filter(p => p.type === 'SKS').length || d.totalSKS || 0
    const status       = d.status === 'Lost' ? 'Lost' : health.label

    return { ...d, lastPickup, status, totalRST, totalSKS, _health: health }
  })
}

function buildInitialState() {
  const pickups = _pickups.map(p => ({ ...p }))
  const donors  = enrichDonors(_donors.map(d => ({ ...d })), pickups)

  // Build KabadiwalaPayments from pickups
  const kabPayments = _kabs.map(k => {
    const kPickups  = pickups.filter(p => p.kabadiwala === k.name && p.status === 'Completed')
    const total     = kPickups.reduce((s, p) => s + (p.totalValue  || 0), 0)
    const paid      = kPickups.reduce((s, p) => s + (p.amountPaid  || 0), 0)
    return {
      id:          k.id,
      name:        k.name,
      mobile:      k.mobile,
      area:        k.area,
      totalAmount: total,
      paidAmount:  paid,
      pendingAmount: total - paid,
      status:      paid >= total ? 'Cleared' : paid > 0 ? 'Partial' : 'Pending',
      pickupCount: kPickups.length,
    }
  })

  // Sync raddiMasterData as raddiRecords (append-only, driven by pickups)
  const raddiRecords = raddiMasterData.map(r => ({ ...r, _source: 'seed' }))

  return { donors, pickups, raddiRecords, kabPayments, kabadiwalas: _kabs }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    // ── Donors ────────────────────────────────────────────────────────────────
    case 'ADD_DONOR': {
      const donor = {
        ...action.payload,
        id:        `D${++_seq}`,
        status:    'Active',
        totalRST:  0,
        totalSKS:  0,
        _health:   getDonorHealth(null),
        createdAt: today(),
      }
      return { ...state, donors: [donor, ...state.donors] }
    }

    case 'UPDATE_DONOR': {
      const donors = state.donors.map(d =>
        d.id === action.payload.id ? { ...d, ...action.payload } : d
      )
      return { ...state, donors }
    }

    case 'DELETE_DONOR': {
      return {
        ...state,
        donors:  state.donors.filter(d => d.id !== action.payload),
        pickups: state.pickups.filter(p => p.donorId !== action.payload),
      }
    }

    // ── Pickups ───────────────────────────────────────────────────────────────
    case 'SCHEDULE_PICKUP': {
      const pickup = {
        ...action.payload,
        id:            `P${++_seq}`,
        status:        'Pending',
        paymentStatus: 'Not Paid',
        amountPaid:    0,
        totalValue:    0,
        rstItems:      [],
        sksItems:      [],
        createdAt:     today(),
      }
      // Update donor nextPickup
      const donors = state.donors.map(d =>
        d.id === pickup.donorId ? { ...d, nextPickup: pickup.date } : d
      )
      return { ...state, pickups: [pickup, ...state.pickups], donors }
    }

    case 'RECORD_PICKUP': {
      // payload: { pickupId, items, totalKg, totalAmount, kabadiwalaName, kabadiwalaPhone, notes }
      const { pickupId, items, totalKg, totalAmount, kabadiwalaName, kabadiwalaPhone, notes } = action.payload
      const existing = state.pickups.find(p => p.id === pickupId)
      if (!existing) return state

      const updatedPickup = {
        ...existing,
        status:        'Completed',
        totalValue:    totalAmount,
        kabadiwala:    kabadiwalaName,
        rstItems:      items.filter(Boolean),
        notes:         notes || existing.notes,
        completedDate: today(),
      }

      const pickups = state.pickups.map(p => p.id === pickupId ? updatedPickup : p)

      // Add raddiRecord
      const raddiRecord = {
        orderId:        `ORD${String(++_seq).padStart(4, '0')}`,
        mobile:         existing.mobile || '',
        name:           existing.donorName,
        houseNo:        existing.house  || '—',
        society:        existing.society,
        sector:         existing.sector || '—',
        city:           existing.city   || 'Gurgaon',
        pickupDate:     existing.date,
        orderDate:      today(),
        kabadiwalaName,
        kabadiwalaPhone: kabadiwalaPhone || '—',
        donorStatus:    'Active',
        items:          Array.isArray(items) ? items : [],
        totalKg,
        totalAmount,
        paymentStatus:  'Yet to Receive',
        orderStatus:    'Completed',
        _pickupId:      pickupId,
        _source:        'live',
      }

      // Re-enrich donors so totalRST updates everywhere
      const enriched = enrichDonors(state.donors, pickups)

      // Refresh kabPayments
      const kabPayments = state.kabPayments.map(k => {
        if (k.name !== kabadiwalaName) return k
        return {
          ...k,
          totalAmount:   k.totalAmount + totalAmount,
          pendingAmount: k.pendingAmount + totalAmount,
          pickupCount:   k.pickupCount + 1,
          status:        'Pending',
        }
      })

      return {
        ...state,
        pickups,
        donors:       enriched,
        raddiRecords: [raddiRecord, ...state.raddiRecords],
        kabPayments,
      }
    }

    case 'UPDATE_PICKUP_STATUS': {
      const pickups = state.pickups.map(p =>
        p.id === action.payload.id ? { ...p, status: action.payload.status } : p
      )
      return { ...state, pickups }
    }

    // ── Payments (RST — Kabadiwala → FreePathshala) ───────────────────────────
    case 'UPDATE_PAYMENT': {
      // payload: { pickupId, additionalAmount, date, notes, refMode, refValue }
      const { pickupId, additionalAmount } = action.payload
      const pickups = state.pickups.map(p => {
        if (p.id !== pickupId) return p
        const newPaid = (p.amountPaid || 0) + Number(additionalAmount)
        const status  =
          newPaid >= p.totalValue ? 'Paid'
          : newPaid > 0           ? 'Partially Paid'
          : 'Not Paid'
        const history = [
          ...(p.paymentHistory || []),
          { amount: Number(additionalAmount), date: action.payload.date, notes: action.payload.notes, refMode: action.payload.refMode, ref: action.payload.refValue },
        ]
        return { ...p, amountPaid: newPaid, paymentStatus: status, paymentHistory: history }
      })

      // Mirror to raddiRecords
      const raddiRecords = state.raddiRecords.map(r => {
        if (r._pickupId !== pickupId) return r
        const newPaid = (r.amountPaid || 0) + Number(additionalAmount)
        return { ...r, amountPaid: newPaid, paymentStatus: newPaid >= r.totalAmount ? 'Received' : 'Yet to Receive' }
      })

      // Re-tally kabadiwala payment row
      const updatedPickup = pickups.find(p => p.id === pickupId)
      const kabPayments = state.kabPayments.map(k => {
        if (k.name !== updatedPickup?.kabadiwala) return k
        const kPickups = pickups.filter(p => p.kabadiwala === k.name && p.status === 'Completed')
        const paid     = kPickups.reduce((s, p) => s + (p.amountPaid || 0), 0)
        const total    = kPickups.reduce((s, p) => s + (p.totalValue  || 0), 0)
        return { ...k, paidAmount: paid, pendingAmount: total - paid, status: paid >= total ? 'Cleared' : paid > 0 ? 'Partial' : 'Pending' }
      })

      return { ...state, pickups, raddiRecords, kabPayments }
    }

    case 'UPDATE_KAB_PAYMENT': {
      const kabPayments = state.kabPayments.map(k =>
        k.id === action.payload.id ? { ...k, ...action.payload } : k
      )
      return { ...state, kabPayments }
    }

    case 'UPDATE_DONOR_STATUS': {
      const donors = state.donors.map(d =>
        d.id === action.payload.id
          ? { ...d, status: action.payload.status, lostReason: action.payload.lostReason }
          : d
      )
      return { ...state, donors }
    }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState)

  // ── Action creators ────────────────────────────────────────────────────────
  const addDonor       = useCallback(d  => dispatch({ type: 'ADD_DONOR',          payload: d }),  [])
  const updateDonor    = useCallback(d  => dispatch({ type: 'UPDATE_DONOR',        payload: d }),  [])
  const deleteDonor    = useCallback(id => dispatch({ type: 'DELETE_DONOR',        payload: id }), [])
  const schedulePickup = useCallback(p  => dispatch({ type: 'SCHEDULE_PICKUP',     payload: p }),  [])
  const recordPickup   = useCallback(p  => dispatch({ type: 'RECORD_PICKUP',       payload: p }),  [])
  const updatePickupStatus = useCallback((id, status) => dispatch({ type: 'UPDATE_PICKUP_STATUS', payload: { id, status } }), [])
  const updatePayment  = useCallback(p  => dispatch({ type: 'UPDATE_PAYMENT',      payload: p }),  [])
  const updateKabPayment = useCallback(p => dispatch({ type: 'UPDATE_KAB_PAYMENT', payload: p }),  [])
  const updateDonorStatus = useCallback((id, status, lostReason) =>
    dispatch({ type: 'UPDATE_DONOR_STATUS', payload: { id, status, lostReason } }), [])

  // ── Derived / computed values (memoised) ───────────────────────────────────
  const stats = useMemo(() => {
    const { donors, pickups, raddiRecords } = state
    const completedPickups = pickups.filter(p => p.status === 'Completed')
    const pendingPickups   = pickups.filter(p => p.status === 'Pending')
    const today_           = today()

    return {
      totalDonors:         donors.length,
      activeDonors:        donors.filter(d => d.status === 'Active').length,
      totalPickupsThisMonth: completedPickups.filter(p => p.date?.slice(0, 7) === today_.slice(0, 7)).length,
      totalRSTValue:       completedPickups.reduce((s, p) => s + (p.totalValue || 0), 0),
      totalKgCollected:    raddiRecords.reduce((s, r) => s + (r.totalKg || 0), 0),
      overduePickups:      donors.filter(d => d.nextPickup && d.nextPickup < today_ && d.status === 'Active').length,
      upcomingPickups:     pendingPickups.filter(p => p.date >= today_).length,
      pendingPayments:     completedPickups.filter(p => p.paymentStatus !== 'Paid').length,
      drivePickups:        completedPickups.filter(p => p.pickupMode === 'Drive').length,
      individualPickups:   completedPickups.filter(p => p.pickupMode !== 'Drive').length,
    }
  }, [state])

  const value = useMemo(() => ({
    ...state,
    stats,
    // actions
    addDonor,
    updateDonor,
    deleteDonor,
    schedulePickup,
    recordPickup,
    updatePickupStatus,
    updatePayment,
    updateKabPayment,
    updateDonorStatus,
  }), [state, stats, addDonor, updateDonor, deleteDonor, schedulePickup, recordPickup, updatePickupStatus, updatePayment, updateKabPayment, updateDonorStatus])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/** Hook — use inside any page/component */
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}