// Frontend/src/context/AppContext.jsx
import {
  createContext, useContext, useState,
  useCallback, useMemo, useEffect,
} from 'react'
import { generateOrderId, initOrderSeq } from '../utils/helpers'

import {
  donors      as _initDonors,
  pickups     as _initPickups,
  kabadiwalas as _initKabs,
} from '../data/mockData'

const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

const today  = () => new Date().toISOString().slice(0, 10)
const delay  = (ms = 120) => new Promise(r => setTimeout(r, ms))

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

function nextDonorId(existing) {
  return `D-${String(existing.length + 1).padStart(3, '0')}`
}

function nextKabId(existing) {
  return `K-${String(existing.length + 1).padStart(3, '0')}`
}

function buildRaddiRow({ pickup, donor = {}, kabObj = {}, data = {} }) {
  const totalValue = Number(data.totalValue ?? pickup.totalValue) || 0
  const amountPaid = Number(data.amountPaid ?? pickup.amountPaid) || 0
  const ps         = derivePaymentStatus(totalValue, amountPaid)
  const raddiPS    = ps === 'Paid' ? 'Received' : ps === 'Write Off' ? 'Write-off' : 'Yet to Receive'

  return {
    orderId:         pickup.orderId || pickup.id,
    pickupId:        pickup.id,
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
    rstItems:        data.rstItems || pickup.rstItems || [],
    sksItems:        data.sksItems || pickup.sksItems || [],
    totalKg:         Number(data.totalKg || pickup.totalKgs || pickup.totalKg)   || 0,
    totalAmount:     totalValue,
    amountPaid:      amountPaid,
    paymentStatus:   raddiPS,
    orderStatus:     data.orderStatus || pickup.status || 'Completed',
    type:
      (data.rstItems?.length && data.sksItems?.length) ? 'RST+SKS'
      : data.rstItems?.length                          ? 'RST'
      : data.sksItems?.length                          ? 'SKS'
      : pickup.type || 'RST',
  }
}

function initRaddiFromPickups(pickups, donors, kabs) {
  return pickups
    .filter(p => p.status === 'Completed')
    .map(p => {
      const donor  = donors.find(d => d.id === p.donorId) || {}
      const kabObj = kabs.find(k => k.name === p.kabadiwala) || {}
      return buildRaddiRow({ pickup: p, donor, kabObj, data: p })
    })
}

export function AppProvider({ children }) {

  const [donors,       setDonors]  = useState(() => _initDonors)
  const [pickups,      setPickups] = useState(() => _initPickups)
  const [kabadiwalas,  setKabs]    = useState(() => _initKabs)
  const [raddiRecords, setRaddi]   = useState(() =>
    initRaddiFromPickups(_initPickups, _initDonors, _initKabs)
  )

  useEffect(() => {
    initOrderSeq(_initPickups.length + 10)
  }, [])

  // ── DONORS ────────────────────────────────────────────────────────────────
  const addDonor = useCallback(async (data) => {
    await delay()
    let newDonor
    setDonors(prev => {
      const id = nextDonorId(prev)
      newDonor = {
        ...data, id,
        status:             data.status || 'Active',
        totalRST:           0,
        totalSKS:           0,
        supportContribution: data.supportContribution || '',
        donorType:          data.donorType || 'donor',
        createdAt:          today(),
        lastPickup:         null,
        nextPickup:         null,
      }
      return [newDonor, ...prev]
    })
    await delay(50)
    return newDonor
  }, [])

  const updateDonor = useCallback(async (id, data) => {
    await delay()
    setDonors(prev => prev.map(d => d.id === id ? { ...d, ...data } : d))
  }, [])

  const deleteDonor = useCallback(async (id) => {
    await delay()
    setDonors(prev => prev.filter(d => d.id !== id))
  }, [])

  // ── PICKUPS ───────────────────────────────────────────────────────────────
  const createPickup = useCallback(async (data) => {
    await delay()
    const paymentStatus = data.paymentStatus === 'Write Off'
      ? 'Write Off'
      : derivePaymentStatus(data.totalValue, data.amountPaid)
    const pickup = {
      ...data,
      id:             data.orderId || generateOrderId(),
      orderId:        data.orderId || generateOrderId(),
      paymentStatus,
      rstItems:       data.rstItems  || [],
      sksItems:       data.sksItems  || [],
      sksItemDetails: data.sksItemDetails || {},
      createdAt:      today(),
    }
    pickup.id = pickup.orderId

    setPickups(prev => [pickup, ...prev])

    if (pickup.status === 'Completed') {
      setDonors(prevD => {
        setKabs(prevK => {
          const donor  = prevD.find(d => d.id === pickup.donorId) || {}
          const kabObj = prevK.find(k => k.name === pickup.kabadiwala) || {}
          setRaddi(prev => {
            const exists = prev.some(r => r.orderId === pickup.orderId || r.pickupId === pickup.id)
            if (exists) return prev.map(r =>
              (r.orderId === pickup.orderId || r.pickupId === pickup.id)
                ? buildRaddiRow({ pickup, donor, kabObj, data: pickup })
                : r
            )
            return [buildRaddiRow({ pickup, donor, kabObj, data: pickup }), ...prev]
          })
          return prevK
        })
        return prevD
      })
    }
    return pickup
  }, [])

  const schedulePickup = useCallback(async (data) => {
    await delay()
    const orderId = generateOrderId()
    const pickup = {
      ...data,
      id:            orderId,
      orderId,
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

  const recordPickup = useCallback(async (id, data) => {
    await delay()
    const paymentStatus = data.paymentStatus === 'Write Off'
      ? 'Write Off'
      : derivePaymentStatus(data.totalValue, data.amountPaid)
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
            transactions: [...(k.transactions || []), {
              date: data.date || today(), pickupId: id,
              donor: data.donorName || '', society: data.society || '',
              value: val, paid, status: paymentStatus,
            }],
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

  const updatePickup = useCallback(async (id, data) => {
    await delay()
    const paymentStatus =
      (data.totalValue !== undefined || data.amountPaid !== undefined)
        ? (data.paymentStatus === 'Write Off' ? 'Write Off' : derivePaymentStatus(data.totalValue, data.amountPaid))
        : undefined

    setPickups(prevPickups => {
      const oldPickup = prevPickups.find(p => p.id === id)

      if (data.amountPaid !== undefined && oldPickup?.kabadiwala) {
        const oldPaid = Number(oldPickup.amountPaid) || 0
        const newPaid = Number(data.amountPaid) || 0
        const delta   = newPaid - oldPaid
        if (delta !== 0) {
          setKabs(prevK => prevK.map(k => {
            if (k.name !== oldPickup.kabadiwala) return k
            return {
              ...k,
              amountReceived: (k.amountReceived || 0) + delta,
              pendingAmount:  Math.max(0, (k.pendingAmount || 0) - delta),
            }
          }))
        }
      }

      return prevPickups.map(p =>
        p.id === id ? { ...p, ...data, ...(paymentStatus ? { paymentStatus } : {}) } : p
      )
    })

    if (paymentStatus) {
      const raddiPS = paymentStatus === 'Paid' ? 'Received'
        : paymentStatus === 'Write Off' ? 'Write-off'
        : 'Yet to Receive'
      setRaddi(prev => prev.map(r =>
        r.pickupId === id || r.orderId === id
          ? {
              ...r,
              paymentStatus: raddiPS,
              totalAmount: Number(data.totalValue) ?? r.totalAmount,
              amountPaid:  Number(data.amountPaid)  ?? r.amountPaid,
            }
          : r
      ))
    }
  }, [])

  const deletePickup = useCallback(async (id) => {
    await delay()
    setPickups(prev => prev.filter(p => p.id !== id))
    setRaddi(prev => prev.filter(r => r.pickupId !== id && r.orderId !== id))
  }, [])

  // ── KABADIWALA CRUD ───────────────────────────────────────────────────────
  const addKabadiwala = useCallback(async (data) => {
    await delay()
    let newK
    setKabs(prev => {
      const id = nextKabId(prev)
      newK = { ...data, id, rating: 4.0, totalPickups: 0, totalValue: 0, amountReceived: 0, pendingAmount: 0, transactions: [] }
      return [...prev, newK]
    })
    await delay(50)
    return newK
  }, [])

  const updateKabadiwala = useCallback(async (id, data) => {
    await delay()
    setKabs(prev => prev.map(k => k.id === id ? { ...k, ...data } : k))
  }, [])

  const deleteKabadiwala = useCallback(async (id) => {
    await delay()
    setKabs(prev => prev.filter(k => k.id !== id))
  }, [])

  /**
   * recordKabadiwalaPayment
   * Records a payment for a specific pickup and syncs kabadiwala totals + raddi.
   * Includes optional screenshot support for UPI payments.
   */
  const recordKabadiwalaPayment = useCallback(async (kabId, {
    pickupId, amount, refMode, refValue, notes, date, screenshot,
  }) => {
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
        return {
          ...p,
          amountPaid: np,
          paymentStatus: status,
          payHistory: [...(p.payHistory || []), {
            date: date || today(),
            amount: additional,
            cumulative: np,
            refMode,
            refValue,
            notes: notes || '',
            screenshot: screenshot || null,
          }],
        }
      }))
      setRaddi(prev => prev.map(r => {
        if (r.pickupId !== pickupId && r.orderId !== pickupId) return r
        const np      = (r.amountPaid || 0) + additional
        const newTotal = r.totalAmount || 0
        const raddiPS  = np >= newTotal ? 'Received' : 'Yet to Receive'
        return { ...r, amountPaid: np, paymentStatus: raddiPS }
      }))
    }
  }, [])

  /**
   * clearPartnerBalance
   * Bulk-clears ALL outstanding dues for a pickup partner in a single action.
   * Syncs pickups, kabadiwala totals, and raddi records globally.
   */
  const clearPartnerBalance = useCallback(async ({ kabId, kabName }, paymentInfo) => {
    await delay()
    const {
      refMode   = 'cash',
      refValue  = '',
      notes     = '',
      date:  payDate,
      screenshot = null,
    } = paymentInfo || {}
    const payD = payDate || today()

    setPickups(prevPickups => {
      // Compute total we are clearing
      const totalClearing = prevPickups
        .filter(p =>
          p.kabadiwala === kabName &&
          (p.paymentStatus === 'Not Paid' || p.paymentStatus === 'Partially Paid') &&
          (p.totalValue || 0) > 0
        )
        .reduce((s, p) => s + Math.max(0, (p.totalValue || 0) - (p.amountPaid || 0)), 0)

      // Sync kabadiwala totals
      setKabs(prevKabs => prevKabs.map(k => {
        if (k.id !== kabId) return k
        return {
          ...k,
          amountReceived: (k.amountReceived || 0) + totalClearing,
          pendingAmount:  0,
          transactions:   (k.transactions || []).map(tx => ({
            ...tx,
            paid:   tx.value || 0,
            status: 'Paid',
          })),
        }
      }))

      // Sync raddi records
      setRaddi(prevRaddi => prevRaddi.map(r => {
        if (r.kabadiwalaName !== kabName) return r
        if (r.paymentStatus === 'Received' || r.paymentStatus === 'Write-off') return r
        return { ...r, amountPaid: r.totalAmount || 0, paymentStatus: 'Received' }
      }))

      // Update all pending/partial pickups for this partner
      return prevPickups.map(p => {
        if (p.kabadiwala !== kabName) return p
        if (p.paymentStatus === 'Paid' || p.paymentStatus === 'Write Off') return p
        const rem = Math.max(0, (p.totalValue || 0) - (p.amountPaid || 0))
        if (rem <= 0) return p
        const newPaid = (p.amountPaid || 0) + rem
        return {
          ...p,
          amountPaid:    newPaid,
          paymentStatus: 'Paid',
          payHistory: [...(p.payHistory || []), {
            date:        payD,
            amount:      rem,
            cumulative:  newPaid,
            refMode,
            refValue,
            notes,
            screenshot,
          }],
        }
      })
    })
  }, [])

  // ── Derived: PickupScheduler tab data ────────────────────────────────────
  const schedulerTabData = useMemo(() => {
    const now      = new Date()
    const todayStr = today()
    const overdue = [], scheduled = [], atRisk = [], churned = []

    pickups.forEach(p => {
      if (p.status !== 'Pending') return
      const entry = {
        id:           p.id,
        orderId:      p.orderId || p.id,
        donorId:      p.donorId,
        donorName:    p.donorName || '',
        mobile:       p.mobile || '',
        society:      p.society || '',
        sector:       p.sector || '',
        city:         p.city || '',
        scheduledDate: p.date || '',
        timeSlot:     p.timeSlot || '',
        notes:        p.notes || '',
        pickupMode:   p.pickupMode || 'Individual',
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
      if (days > 60)  churned.push({ ...base, daysSincePickup: days, reason: d.lostReason || 'Inactive > 60 days' })
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

  const value = useMemo(() => ({
    donors, pickups, kabadiwalas, raddiRecords,
    partners: kabadiwalas,
    dashboardStats, schedulerTabData,
    addDonor, updateDonor, deleteDonor,
    createPickup, schedulePickup, recordPickup, updatePickup, deletePickup,
    addKabadiwala, updateKabadiwala, deleteKabadiwala,
    recordKabadiwalaPayment, clearPartnerBalance,
    addPartner:    addKabadiwala,
    updatePartner: updateKabadiwala,
    deletePartner: deleteKabadiwala,
  }), [
    donors, pickups, kabadiwalas, raddiRecords, dashboardStats, schedulerTabData,
    addDonor, updateDonor, deleteDonor,
    createPickup, schedulePickup, recordPickup, updatePickup, deletePickup,
    addKabadiwala, updateKabadiwala, deleteKabadiwala,
    recordKabadiwalaPayment, clearPartnerBalance,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}