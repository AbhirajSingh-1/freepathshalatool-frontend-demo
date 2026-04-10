// Frontend/src/pages/Dashboard.jsx
// ─── Dashboard — all data from global AppContext ─────────────────────────────
import { useState, useMemo } from 'react'
import {
  Users, Truck, IndianRupee, AlertTriangle, Clock,
  TrendingUp, PackageCheck, Car, Weight, Download,
  Search, CalendarDays, Filter, X,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { monthlyData, itemBreakdown } from '../data/mockData'
import { fmtDate, fmtCurrency, pickupStatusColor, exportToExcel } from '../utils/helpers'

const PIE_COLORS = ['#E8521A', '#1B5E35', '#F5B942', '#3B82F6', '#8B5CF6', '#EC4899']

export default function Dashboard({ onNav }) {
  const { donors, pickups, raddiRecords, dashboardStats: stats } = useApp()

  // ── Donor Pickup History filters ──────────────────────────────────────────
  const [histSearch,     setHistSearch]   = useState('')
  const [histSector,     setHistSector]   = useState('')
  const [histDateFrom,   setHistDateFrom] = useState('')
  const [histDateTo,     setHistDateTo]   = useState('')
  const [histStatus,     setHistStatus]   = useState('All')
  const [showHistFilters, setShowHF]      = useState(false)

  const overdue  = useMemo(
    () => donors.filter(d => d.nextPickup && new Date(d.nextPickup) < new Date() && d.status === 'Active'),
    [donors]
  )
  const upcoming = useMemo(
    () => pickups.filter(p => p.status === 'Pending').slice(0, 5),
    [pickups]
  )
  const pendingPayments = useMemo(
    () => pickups.filter(p => p.paymentStatus !== 'Paid' && p.status === 'Completed').slice(0, 5),
    [pickups]
  )

  // ── All sectors from live pickup data ─────────────────────────────────────
  const allSectors = useMemo(() => {
    const s = new Set(pickups.map(p => p.sector).filter(Boolean))
    return [...s].sort()
  }, [pickups])

  // ── Real donor pickup history (filtered) ─────────────────────────────────
  const historyRows = useMemo(() => {
    const q = histSearch.toLowerCase()
    return pickups
      .filter(p => {
        const matchQ  = !q || p.donorName?.toLowerCase().includes(q) || p.society?.toLowerCase().includes(q)
        const matchSe = !histSector  || p.sector === histSector
        const matchF  = !histDateFrom || (p.date || '') >= histDateFrom
        const matchT  = !histDateTo   || (p.date || '') <= histDateTo
        const matchSt = histStatus === 'All' || p.status === histStatus
        return matchQ && matchSe && matchF && matchT && matchSt
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [pickups, histSearch, histSector, histDateFrom, histDateTo, histStatus])

  const handleHistExport = () => {
    exportToExcel(
      historyRows.map(p => ({
        Donor:          p.donorName,
        Date:           p.date,
        Sector:         p.sector,
        Society:        p.society,
        City:           p.city,
        Mode:           p.pickupMode,
        Type:           p.type,
        'RST Items':    (p.rstItems  || []).join(', '),
        'SKS Items':    (p.sksItems  || []).join(', '),
        'Total Kg':     p.rstTotalWeight || '',
        'Amount (₹)':   p.totalValue,
        Status:         p.status,
        'Payment':      p.paymentStatus,
        Kabadiwala:     p.kabadiwala,
      })),
      'Donor_Pickup_History'
    )
  }

  const clearHistFilters = () => {
    setHistSearch(''); setHistSector(''); setHistDateFrom('');
    setHistDateTo(''); setHistStatus('All')
  }
  const hasHistFilters = histSearch || histSector || histDateFrom || histDateTo || histStatus !== 'All'

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-body">

      {/* ── KPI Grid ── */}
      <div className="stat-grid">
        <div className="stat-card orange">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{stats.activeDonors}</div>
          <div className="stat-label">Active Donors</div>
          <div className="stat-change up">of {stats.totalDonors} total</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Truck size={20} /></div>
          <div className="stat-value">{stats.totalPickupsCompleted}</div>
          <div className="stat-label">Total Pickups</div>
          <div className="stat-change up">Completed so far</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Clock size={20} /></div>
          <div className="stat-value">{stats.upcomingPickups}</div>
          <div className="stat-label">Scheduled Pickups</div>
          <div className="stat-change up">Pending</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div className="stat-value">{overdue.length}</div>
          <div className="stat-label">Overdue Pickups</div>
          <div className="stat-change down">Needs attention</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Weight size={18} /></div>
          <div className="stat-value">{(stats.totalRaddiKg || 0).toFixed(1)} kg</div>
          <div className="stat-label">Total Waste Collected</div>
          <div className="stat-change up">Raddi kg</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon"><IndianRupee size={20} /></div>
          <div className="stat-value">{fmtCurrency(stats.totalRSTValue)}</div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-change up">RST scrap value</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{stats.drivePickups ?? 0}</div>
          <div className="stat-label">Drive Pickups</div>
          <div className="stat-change up">Community events</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><Car size={20} /></div>
          <div className="stat-value">{stats.individualPickups ?? 0}</div>
          <div className="stat-label">Individual Pickups</div>
          <div className="stat-change up">Household visits</div>
        </div>
      </div>

      {/* ── Overdue Alert ── */}
      {overdue.length > 0 && (
        <div className="alert-strip alert-warning" style={{ marginBottom: 20 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{overdue.length} donor{overdue.length > 1 ? 's' : ''} overdue:</strong>{' '}
            {overdue.slice(0, 4).map(d => d.name).join(', ')}{overdue.length > 4 ? '…' : ''}.{' '}
            <button
              onClick={() => onNav('pickupscheduler')}
              style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}
            >
              Schedule now →
            </button>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card page-section">
          <div className="card-header">
            <TrendingUp size={18} color="var(--primary)" />
            <div className="card-title">Monthly RST Value (₹)</div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barSize={28}>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip formatter={v => [`₹${v}`, 'RST Value']} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card page-section">
          <div className="card-header">
            <PackageCheck size={18} color="var(--secondary)" />
            <div className="card-title">RST Item Breakdown</div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={itemBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} innerRadius={28}>
                    {itemBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, minWidth: 120 }}>
                {itemBreakdown.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{item.value}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming + Pending Payments ── */}
      <div className="two-col" style={{ marginBottom: 24 }}>

        {/* Upcoming pickups */}
        <div className="card">
          <div className="card-header">
            <Clock size={18} color="var(--info)" />
            <div className="card-title">Upcoming Pickups</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('pickups')}>View All</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>No upcoming pickups</p></div>
            ) : upcoming.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={16} color="var(--info)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {p.society} · {p.pickupMode || 'Individual'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(p.date)}</div>
                  <span className="badge badge-primary" style={{ fontSize: 10 }}>{p.type || 'RST'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending payments */}
        <div className="card">
          <div className="card-header">
            <IndianRupee size={18} color="var(--warning)" />
            <div className="card-title">Pending Payments</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('payments')}>View All</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {pendingPayments.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>All payments cleared! 🎉</p></div>
            ) : pendingPayments.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {fmtDate(p.date)} · {p.kabadiwala || 'No kabadiwala'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13.5 }}>
                    {fmtCurrency((p.totalValue || 0) - (p.amountPaid || 0))}
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: 10 }}>Due</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Donor Pickup History (REAL DATA from global pickups) ── */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <CalendarDays size={18} color="var(--primary)" />
          <div className="card-title">Donor Pickup History</div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${showHistFilters ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setShowHF(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Filter size={12} />
              Filters
              {hasHistFilters && (
                <span style={{
                  background: 'var(--primary)', color: '#fff', borderRadius: '50%',
                  width: 16, height: 16, fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {[histSearch, histSector, histDateFrom, histDateTo, histStatus !== 'All' ? histStatus : ''].filter(Boolean).length}
                </span>
              )}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleHistExport}>
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showHistFilters && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                <Search size={13} style={{
                  position: 'absolute', left: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none',
                }} />
                <input
                  placeholder="Search donor or society…"
                  value={histSearch}
                  onChange={e => setHistSearch(e.target.value)}
                  style={{ paddingLeft: 32, fontSize: 13 }}
                />
              </div>
              <select value={histSector} onChange={e => setHistSector(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">All Sectors</option>
                {allSectors.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={histStatus} onChange={e => setHistStatus(e.target.value)} style={{ fontSize: 13 }}>
                <option value="All">All Status</option>
                {['Completed', 'Pending', 'Postponed', 'Did Not Open Door'].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 10.5, fontWeight: 600 }}>From</label>
                <input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)} style={{ fontSize: 12 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 10.5, fontWeight: 600 }}>To</label>
                <input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)} style={{ fontSize: 12 }} />
              </div>
              {hasHistFilters && (
                <button className="btn btn-ghost btn-sm" onClick={clearHistFilters} style={{ alignSelf: 'flex-end' }}>
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '8px 20px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>{historyRows.length}</strong> record{historyRows.length !== 1 ? 's' : ''}
          {hasHistFilters && ' (filtered)'}
        </div>

        {/* Desktop table */}
        <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Date</th>
                <th>Sector</th>
                <th>Mode</th>
                <th>Type</th>
                <th>Kg</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No records found
                  </td>
                </tr>
              ) : historyRows.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.donorName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.society}</div>
                  </td>
                  <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                  <td style={{ fontSize: 12.5 }}>{p.sector || '—'}</td>
                  <td>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>
                      {p.pickupMode || 'Individual'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.type === 'RST' ? 'badge-success' : p.type === 'SKS' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                      {p.type || 'RST'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>
                    {p.rstTotalWeight ? `${p.rstTotalWeight} ${p.rstWeightUnit || 'kg'}` : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--secondary)', fontSize: 12.5 }}>
                    {p.totalValue > 0 ? fmtCurrency(p.totalValue) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${pickupStatusColor(p.status)}`} style={{ fontSize: 10 }}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      p.paymentStatus === 'Paid'           ? 'badge-success'
                      : p.paymentStatus === 'Partially Paid' ? 'badge-warning'
                      : 'badge-danger'
                    }`} style={{ fontSize: 10 }}>
                      {p.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards" style={{ padding: '8px 12px' }}>
          {historyRows.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><p>No records found</p></div>
          ) : historyRows.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.donorName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {p.society}, {p.sector}
                  </div>
                </div>
                <span className={`badge ${pickupStatusColor(p.status)}`} style={{ fontSize: 10, flexShrink: 0 }}>
                  {p.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Date: </span><strong>{fmtDate(p.date)}</strong></div>
                {p.rstTotalWeight && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Kg: </span><strong>{p.rstTotalWeight} {p.rstWeightUnit || 'kg'}</strong></div>
                )}
                {p.totalValue > 0 && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Amount: </span><strong style={{ color: 'var(--secondary)' }}>{fmtCurrency(p.totalValue)}</strong></div>
                )}
                <span className={`badge ${p.type === 'RST' ? 'badge-success' : p.type === 'SKS' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                  {p.type || 'RST'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}