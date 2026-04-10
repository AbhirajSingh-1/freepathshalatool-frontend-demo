// Frontend/src/context/AppContext.jsx
// ─── Single Source of Truth — ALL pages must read/write ONLY through here ────

import {
  createContext, useContext, useState,
  useCallback, useMemo,
} from 'react'
import { generateOrderId } from '../utils/helpers'

import {
  donors      as _initDonors,
  pickups     as _initPickups,
  kabadiwalas as _initKabs,
} from '../data/mockData'

import { raddiMasterData as _initRaddi } from '../data/raddiMockData'

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const uid   = (pfx) => `${pfx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const today = ()    => new Date().toISOString().slice(0, 10)
const delay = (ms = 120) => new Promise(r => setTimeout(r, ms))

function derivePaymentStatus(total, paid) {
  const t = Number(total) || 0
  const p = Number(paid)  || 0
  if (t === 0) return 'Not Paid'
  if (p >= t)  return 'Paid'
  if (p > 0)   return 'Partially Paid'
  return 'Not Paid'
}

function deriveDonorStatus(lastPickup) {
  if (!lastPickup) return 'Active'
  const days = Math.floor((Date.now() - new Date(lastPickup)) / 86_400_000)
  if (days <= 30) return 'Active'
  if (days <= 45) return 'Pickup Due'
  if (days <= 60) return 'At Risk'
  return 'Churned'
}

function buildRaddiRow({ pickup, donor = {}, kabObj = {}, data = {} }) {
  const totalValue    = Number(data.totalValue ?? pickup.totalValue) || 0
  const amountPaid    = Number(data.amountPaid ?? pickup.amountPaid) || 0
  const ps            = derivePaymentStatus(totalValue, amountPaid)
  const raddiPS       = ps === 'Paid' ? 'Received' : 'Yet to Receive'

  return {
    orderId:         pickup.orderId || pickup.id,   // ← prefer human-readable orderId
    pickupId:        pickup.id,                      // ← keep internal id for linking
    mobile:          donor.mobile  || pickup.mobile  || '',
    name:            donor.name    || pickup.donorName || '',
    houseNo:         donor.house   || pickup.houseNo  || '',
    society:         donor.society || pickup.society  || '',
    sector:          donor.sector  || pickup.sector   || '',
    city:            donor.city    || pickup.city     || '',
    pickupDate:      data.date     || pickup.date     || today(),
    orderDate:       pickup.createdAt                  || today(),
    kabadiwalaName:  data.kabadiwala   || pickup.kabadiwala   || '',
    kabadiwalaPhone: kabObj.mobile     || data.kabadiMobile   || pickup.kabadiMobile || '',
    donorStatus:     deriveDonorStatus(data.date || pickup.date),
    items:           data.items    || Array(9).fill(0),
    totalKg:         Number(data.totalKg)   || 0,
    totalAmount:     totalValue,
    paymentStatus:   raddiPS,
    orderStatus:     data.orderStatus || 'Completed',
    type:
      (data.rstItems?.length && data.sksItems?.length) ? 'RST+SKS'
      : data.rstItems?.length                           ? 'RST'
      : data.sksItems?.length                           ? 'SKS'
      : 'RST',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {

  // ════════════════════════════════════════════════════════════════════════
  // RAW STATE  ←  THE ONLY PLACE these arrays live in the entire app
  // ════════════════════════════════════════════════════════════════════════
  const [donors,       setDonors]  = useState(() => _initDonors)
  const [pickups,      setPickups] = useState(() => _initPickups)
  const [kabadiwalas,  setKabs]    = useState(() => _initKabs)
  const [raddiRecords, setRaddi]   = useState(() => _initRaddi)

  // ── DONORS ────────────────────────────────────────────────────────────────

  /** Create a donor from any page. Returns the full donor object with id. */
  const addDonor = useCallback(async (data) => {
    await delay()
    const donor = {
      ...data,
      id:         uid('D'),
      status:     data.status || 'Active',
      totalRST:   0,
      totalSKS:   0,
      createdAt:  today(),
      lastPickup: null,
      nextPickup: null,
    }
    setDonors(prev => [donor, ...prev])
    return donor
  }, [])

  /** Patch fields on an existing donor. */
  const updateDonor = useCallback(async (id, data) => {
    await delay()
    setDonors(prev => prev.map(d => d.id === id ? { ...d, ...data } : d))
  }, [])

  /** Remove a donor. */
  const deleteDonor = useCallback(async (id) => {
    await delay()
    setDonors(prev => prev.filter(d => d.id !== id))
  }, [])

  // ── PICKUPS ───────────────────────────────────────────────────────────────

  /**
   * createPickup  ←  used by Pickups.jsx "Record Pickup" modal
   * Accepts any status (Pending / Completed / Postponed …).
   */
  const createPickup = useCallback(async (data) => {
    await delay()

    const paymentStatus = derivePaymentStatus(data.totalValue, data.amountPaid)
    const pickup = {
      ...data,
      id:            uid('FP'),
      orderId:       data.orderId || generateOrderId(), // ← ensure orderId exists
      paymentStatus,
      rstItems:      data.rstItems  || [],
      sksItems:      data.sksItems  || [],
      sksItemDetails: data.sksItemDetails || {},
      createdAt:     today(),
    }

    setPickups(prev => [pickup, ...prev])

    // If directly completed, write Raddi Master row
    if (pickup.status === 'Completed') {
      setDonors(prevD => {
        setKabs(prevK => {
          const donor  = prevD.find(d => d.id === pickup.donorId) || {}
          const kabObj = prevK.find(k => k.name === pickup.kabadiwala) || {}
          setRaddi(prev => [buildRaddiRow({ pickup, donor, kabObj, data: pickup }), ...prev])
          return prevK
        })
        return prevD
      })
    }

    return pickup
  }, [])

  /**
   * schedulePickup  ←  used by PickupScheduler (always status=Pending)
   * Also mirrors nextPickup onto the donor immediately.
   */
  const schedulePickup = useCallback(async (data) => {
    await delay()
    const pickup = {
      ...data,
      id:            uid('SC'),
      orderId:       generateOrderId(), // ← generate human-readable order ID
      status:        'Pending',
      totalValue:    0,
      amountPaid:    0,
      paymentStatus: 'Not Paid',
      rstItems:      data.rstItems || [],
      sksItems:      data.sksItems || [],
      createdAt:     today(),
    }
    setPickups(prev => [pickup, ...prev])

    if (data.donorId && data.date) {
      setDonors(prev => prev.map(d =>
        d.id === data.donorId
          ? { ...d, nextPickup: data.date, status: deriveDonorStatus(d.lastPickup) }
          : d
      ))
    }
    return pickup
  }, [])

  /**
   * recordPickup  ←  marks an existing Pending pickup as Completed.
   */
  const recordPickup = useCallback(async (id, data) => {
    await delay()
    const paymentStatus = derivePaymentStatus(data.totalValue, data.amountPaid)
    setPickups(prev => prev.map(p =>
      p.id === id ? { ...p, ...data, status: 'Completed', paymentStatus } : p
    ))
    setDonors(prevD => {
      setKabs(prevK => {
        setPickups(prevP => {
          const pickup = prevP.find(p => p.id === id) || {}
          const donor  = prevD.find(d => d.id === (pickup.donorId || data.donorId)) || {}
          const kabObj = prevK.find(k => k.name === data.kabadiwala) || {}
          const row    = buildRaddiRow({ pickup, donor, kabObj, data: { ...data, paymentStatus } })
          setRaddi(prev => {
            const idx = prev.findIndex(r => r.pickupId === id || r.orderId === (pickup.orderId || id))
            return idx >= 0 ? prev.map((r, i) => i === idx ? row : r) : [row, ...prev]
          })
          return prevP
        })
        const val  = Number(data.totalValue) || 0
        const paid = Number(data.amountPaid)  || 0
        return prevK.map(k => {
          if (k.name !== data.kabadiwala) return k
          return {
            ...k,
            totalPickups:   (k.totalPickups   || 0) + 1,
            totalValue:     (k.totalValue     || 0) + val,
            amountReceived: (k.amountReceived || 0) + paid,
            pendingAmount:  (k.pendingAmount  || 0) + (val - paid),
            transactions: [...(k.transactions || []), { date: data.date || today(), pickupId: id, donor: data.donorName || '', value: val, paid, status: paymentStatus }],
          }
        })
      })
      return prevD.map(d => {
        if (d.id !== data.donorId) return d
        return {
          ...d,
          lastPickup: data.date || today(),
          nextPickup: data.nextDate || d.nextPickup,
          totalRST:   (d.totalRST || 0) + (Number(data.totalValue) || 0),
          totalSKS:   (d.totalSKS || 0) + (data.sksItems?.length ? 1 : 0),
          status:     deriveDonorStatus(data.date || today()),
        }
      })
    })
  }, [])

  /**
   * updatePickup  ←  patch any existing pickup (edit modal, payment update).
   */
  const updatePickup = useCallback(async (id, data) => {
    await delay()
    const paymentStatus =
      (data.totalValue !== undefined || data.amountPaid !== undefined)
        ? derivePaymentStatus(data.totalValue, data.amountPaid)
        : undefined
    setPickups(prev =>
      prev.map(p => p.id === id ? { ...p, ...data, ...(paymentStatus ? { paymentStatus } : {}) } : p)
    )
    if (paymentStatus) {
      const raddiPS = paymentStatus === 'Paid' ? 'Received' : 'Yet to Receive'
      setRaddi(prev => prev.map(r =>
        r.pickupId === id || r.orderId === id
          ? { ...r, paymentStatus: raddiPS, totalAmount: Number(data.totalValue) ?? r.totalAmount }
          : r
      ))
    }
  }, [])

  /** Delete pickup and its Raddi Master row. */
  const deletePickup = useCallback(async (id) => {
    await delay()
    setPickups(prev => prev.filter(p => p.id !== id))
    setRaddi(prev => prev.filter(r => r.pickupId !== id && r.orderId !== id))
  }, [])

  // ── KABADIWALA CRUD ───────────────────────────────────────────────────────

  const addKabadiwala = useCallback(async (data) => {
    await delay()
    const k = { ...data, id: uid('K'), rating: 4.0, totalPickups: 0, totalValue: 0, amountReceived: 0, pendingAmount: 0, transactions: [] }
    setKabs(prev => [...prev, k])
    return k
  }, [])

  const updateKabadiwala = useCallback(async (id, data) => {
    await delay()
    setKabs(prev => prev.map(k => k.id === id ? { ...k, ...data } : k))
  }, [])

  const deleteKabadiwala = useCallback(async (id) => {
    await delay()
    setKabs(prev => prev.filter(k => k.id !== id))
  }, [])

  const recordKabadiwalaPayment = useCallback(async (kabId, { pickupId, amount, refMode, refValue, notes, date }) => {
    await delay()
    const additional = Number(amount) || 0
    setKabs(prev => prev.map(k => {
      if (k.id !== kabId) return k
      return {
        ...k,
        amountReceived: (k.amountReceived || 0) + additional,
        pendingAmount:  Math.max(0, (k.pendingAmount || 0) - additional),
        transactions: (k.transactions || []).map(tx => {
          if (tx.pickupId !== pickupId) return tx
          const np = (tx.paid || 0) + additional
          return { ...tx, paid: np, status: np >= (tx.value || 0) ? 'Paid' : 'Partially Paid' }
        }),
      }
    }))
    if (pickupId) {
      setPickups(prev => prev.map(p => {
        if (p.id !== pickupId) return p
        const np     = (p.amountPaid || 0) + additional
        const status = derivePaymentStatus(p.totalValue, np)
        return { ...p, amountPaid: np, paymentStatus: status, payHistory: [...(p.payHistory || []), { date: date || today(), amount: additional, refMode, refValue, notes: notes || '' }] }
      }))
    }
  }, [])

  // ── Derived: PickupScheduler tab data (live, no mock) ────────────────────
  const schedulerTabData = useMemo(() => {
    const now      = new Date()
    const todayStr = today()
    const overdue = [], scheduled = [], atRisk = [], churned = []

    pickups.forEach(p => {
      if (p.status !== 'Pending') return
      const entry = {
        id:          p.id,
        orderId:     p.orderId || p.id,   // ← include orderId in tab entries
        donorId:     p.donorId,
        donorName:   p.donorName || '',
        mobile:      p.mobile || '',
        society:     p.society || '',
        sector:      p.sector || '',
        city:        p.city || '',
        scheduledDate: p.date || '',
        timeSlot:    p.timeSlot || '',
        notes:       p.notes || '',
        pickupMode:  p.pickupMode || 'Individual',
      }
      if (p.date && p.date < todayStr) {
        overdue.push({ ...entry, daysOverdue: Math.floor((now - new Date(p.date + 'T00:00:00')) / 86_400_000) })
      } else {
        scheduled.push(entry)
      }
    })

    donors.forEach(d => {
      if (d.status === 'Lost' || !d.lastPickup) return
      if (pickups.some(p => p.donorId === d.id && p.status === 'Pending')) return
      const days = Math.floor((now - new Date(d.lastPickup)) / 86_400_000)
      const base = { id: `TAB-${d.id}`, donorId: d.id, donorName: d.name, mobile: d.mobile || '', society: d.society || '', sector: d.sector || '', city: d.city || '', lastPickup: d.lastPickup }
      if (days > 60) churned.push({ ...base, daysSincePickup: days, reason: d.lostReason || 'Inactive > 60 days' })
      else if (days > 30) atRisk.push({ ...base, daysSincePickup: days, missedCount: Math.floor(days / 30) })
    })

    return { overdue, scheduled, atRisk, churned }
  }, [pickups, donors])

  // ── Derived: Dashboard stats ──────────────────────────────────────────────
  const dashboardStats = useMemo(() => {
    const now = new Date()
    return {
      totalDonors:           donors.length,
      activeDonors:          donors.filter(d => d.status === 'Active').length,
      postponedDonors:       donors.filter(d => d.status === 'Postponed').length,
      lostDonors:            donors.filter(d => d.status === 'Lost').length,
      totalPickupsCompleted: pickups.filter(p => p.status === 'Completed').length,
      totalPickupsThisMonth: pickups.filter(p => p.status === 'Completed').length,
      totalRSTValue:         pickups.reduce((s, p) => s + (p.totalValue || 0), 0),
      pendingPayments:       pickups.filter(p => p.paymentStatus === 'Not Paid' || p.paymentStatus === 'Partially Paid').length,
      upcomingPickups:       pickups.filter(p => p.status === 'Pending').length,
      overduePickups:        donors.filter(d => d.nextPickup && new Date(d.nextPickup) < now && d.status === 'Active').length,
      drivePickups:          pickups.filter(p => p.pickupMode === 'Drive').length,
      individualPickups:     pickups.filter(p => p.pickupMode === 'Individual').length,
      totalRaddiKg:          raddiRecords.reduce((s, r) => s + (r.totalKg     || 0), 0),
      totalRevenue:          raddiRecords.reduce((s, r) => s + (r.totalAmount || 0), 0),
      amountReceived:        kabadiwalas.reduce((s, k) => s + (k.amountReceived || 0), 0),
      pendingFromKabs:       kabadiwalas.reduce((s, k) => s + (k.pendingAmount  || 0), 0),
    }
  }, [donors, pickups, raddiRecords, kabadiwalas])

  // ── Context value ─────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    // ── Read-only state
    donors,
    pickups,
    kabadiwalas,
    raddiRecords,
    dashboardStats,
    schedulerTabData,

    // ── Donor actions
    addDonor,
    updateDonor,
    deleteDonor,

    // ── Pickup actions
    createPickup,
    schedulePickup,
    recordPickup,
    updatePickup,
    deletePickup,

    // ── Kabadiwala actions
    addKabadiwala,
    updateKabadiwala,
    deleteKabadiwala,
    recordKabadiwalaPayment,
  }), [
    donors, pickups, kabadiwalas, raddiRecords, dashboardStats, schedulerTabData,
    addDonor, updateDonor, deleteDonor,
    createPickup, schedulePickup, recordPickup, updatePickup, deletePickup,
    addKabadiwala, updateKabadiwala, deleteKabadiwala, recordKabadiwalaPayment,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}