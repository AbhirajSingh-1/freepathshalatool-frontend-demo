// Frontend/src/pages/SKSOverview.jsx
// SKS Warehouse System — track items collected from pickups
import { useState, useMemo, useCallback } from 'react'
import {
  Package, Search, Filter, X, Plus, Minus, Save,
  CheckCircle, AlertCircle, Shirt, Monitor, Laptop,
  Wind, Microwave, Footprints, Dumbbell, UtensilsCrossed,
  BookOpen, Armchair, ShoppingBag, Gift, ChevronDown, ChevronUp,
  Download, Boxes,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmtDate, exportToExcel } from '../utils/helpers'

// SKS items with icons and categories
const SKS_ITEM_CONFIG = {
  'Kids Clothes':    { icon: Shirt,          category: 'Clothing',      unit: 'pieces' },
  'Kids Shoes':      { icon: Footprints,     category: 'Clothing',      unit: 'pairs'  },
  'Adult Clothes':   { icon: Shirt,          category: 'Clothing',      unit: 'pieces' },
  'Adult Shoes':     { icon: Footprints,     category: 'Clothing',      unit: 'pairs'  },
  'Toys':            { icon: Gift,           category: 'Children',      unit: 'pieces' },
  'Sports Items':    { icon: Dumbbell,       category: 'Children',      unit: 'pieces' },
  'New Stationery':  { icon: BookOpen,       category: 'Education',     unit: 'pieces' },
  'Utensils':        { icon: UtensilsCrossed, category: 'Household',    unit: 'pieces' },
  'Furniture':       { icon: Armchair,       category: 'Household',     unit: 'pieces' },
  'TV':              { icon: Monitor,        category: 'Electronics',   unit: 'units'  },
  'Laptop / PC':     { icon: Laptop,         category: 'Electronics',   unit: 'units'  },
  'Purifier':        { icon: Wind,           category: 'Electronics',   unit: 'units'  },
  'Microwave / OTG': { icon: Microwave,      category: 'Electronics',   unit: 'units'  },
  'Others':          { icon: ShoppingBag,    category: 'Miscellaneous', unit: 'pieces' },
}

const CATEGORIES = ['All', 'Clothing', 'Electronics', 'Children', 'Household', 'Education', 'Miscellaneous']

// Warehouse stock state stored per-session (in a real app, persisted to backend)
const initStock = () => {
  const stock = {}
  Object.keys(SKS_ITEM_CONFIG).forEach(item => {
    stock[item] = { counted: 0, dispatched: 0 }
  })
  return stock
}

function StockCard({ item, config, received, stock, onCount, onDispatch }) {
  const Icon    = config.icon || Package
  const current = (stock.counted || 0) - (stock.dispatched || 0)
  const pct     = received > 0 ? Math.min(100, Math.round(((stock.counted || 0) / received) * 100)) : 0

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: 'var(--secondary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color="var(--secondary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>{item}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: 'var(--info)',
              background: 'var(--info-bg)', padding: '1px 7px', borderRadius: 20,
            }}>
              {config.category}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{config.unit}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'From Pickups', value: received, color: 'var(--text-primary)' },
          { label: 'Counted',      value: stock.counted || 0, color: 'var(--secondary)' },
          { label: 'In Stock',     value: current, color: current > 0 ? 'var(--primary)' : 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)', color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {received > 0 && (
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct >= 100 ? 'var(--secondary)' : 'var(--primary)', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{pct}% counted</div>
        </div>
      )}

      {/* Count controls */}
      <div style={{
        borderTop: '1px solid var(--border-light)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Warehouse Count
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => onCount(item, Math.max(0, (stock.counted || 0) - 1))}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <Minus size={12} />
            </button>
            <input
              type="number"
              min={0}
              value={stock.counted || 0}
              onChange={e => onCount(item, Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: 60, textAlign: 'center', fontWeight: 700, fontSize: 15, padding: '4px 6px', border: '1.5px solid var(--primary)', borderRadius: 6 }}
            />
            <button
              onClick={() => onCount(item, (stock.counted || 0) + 1)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid var(--primary)', background: 'var(--primary-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Dispatched
          </div>
          <input
            type="number"
            min={0}
            max={stock.counted || 0}
            value={stock.dispatched || 0}
            onChange={e => onDispatch(item, Math.min(stock.counted || 0, Math.max(0, parseInt(e.target.value) || 0)))}
            style={{ width: 70, textAlign: 'center', fontWeight: 700, fontSize: 13, padding: '4px 6px', border: '1.5px solid var(--info)', borderRadius: 6, color: 'var(--info)' }}
          />
        </div>
      </div>
    </div>
  )
}

function DrivePickupRow({ pickup }) {
  const [expanded, setExpanded] = useState(false)
  const sksItems = pickup.sksItems || []

  return (
    <div style={{ borderBottom: '1px solid var(--border-light)' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer' }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Boxes size={16} color="var(--info)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{pickup.donorName || pickup.society}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {pickup.society}{pickup.sector ? `, ${pickup.sector}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtDate(pickup.date)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sksItems.length} item types</div>
        </div>
        {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>
      {expanded && sksItems.length > 0 && (
        <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sksItems.map(item => (
            <span key={item} style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: 'var(--info-bg)', color: 'var(--info)',
            }}>{item}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SKSOverview() {
  const { pickups } = useApp()

  const [search,      setSearch]      = useState('')
  const [filterCat,   setFilterCat]   = useState('All')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [stock,       setStock]       = useState(initStock)
  const [saveFlash,   setSaveFlash]   = useState(false)
  const [activeView,  setActiveView]  = useState('warehouse') // 'warehouse' | 'pickups'

  // Pickups with SKS items
  const sksPickups = useMemo(() =>
    pickups.filter(p =>
      p.sksItems && p.sksItems.length > 0 &&
      (!dateFrom || p.date >= dateFrom) &&
      (!dateTo   || p.date <= dateTo)
    ).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [pickups, dateFrom, dateTo]
  )

  // Count how many of each SKS item came in from pickups (in range)
  const receivedCounts = useMemo(() => {
    const counts = {}
    Object.keys(SKS_ITEM_CONFIG).forEach(item => { counts[item] = 0 })
    sksPickups.forEach(p => {
      (p.sksItems || []).forEach(item => {
        const key = Object.keys(SKS_ITEM_CONFIG).find(k => item.startsWith(k)) || 'Others'
        counts[key] = (counts[key] || 0) + 1
      })
    })
    return counts
  }, [sksPickups])

  // Total stock summary
  const totalInStock  = Object.values(stock).reduce((s, v) => s + Math.max(0, (v.counted || 0) - (v.dispatched || 0)), 0)
  const totalCounted  = Object.values(stock).reduce((s, v) => s + (v.counted || 0), 0)
  const totalDispatched = Object.values(stock).reduce((s, v) => s + (v.dispatched || 0), 0)
  const totalPickupItems = Object.values(receivedCounts).reduce((s, v) => s + v, 0)

  const updateCount    = useCallback((item, val) => setStock(s => ({ ...s, [item]: { ...s[item], counted: val } })), [])
  const updateDispatch = useCallback((item, val) => setStock(s => ({ ...s, [item]: { ...s[item], dispatched: val } })), [])

  const handleSave = () => {
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 2000)
  }

  const handleExport = () => exportToExcel(
    Object.entries(SKS_ITEM_CONFIG).map(([item, cfg]) => ({
      Item: item, Category: cfg.category, Unit: cfg.unit,
      'From Pickups': receivedCounts[item] || 0,
      'Counted': stock[item]?.counted || 0,
      'Dispatched': stock[item]?.dispatched || 0,
      'In Stock': Math.max(0, (stock[item]?.counted || 0) - (stock[item]?.dispatched || 0)),
    })),
    'SKS_Warehouse_Stock'
  )

  const q = search.toLowerCase()
  const filteredItems = Object.entries(SKS_ITEM_CONFIG).filter(([item, cfg]) => {
    const matchSearch = !q || item.toLowerCase().includes(q)
    const matchCat    = filterCat === 'All' || cfg.category === filterCat
    return matchSearch && matchCat
  })

  return (
    <div className="page-body">
      {/* Summary KPIs */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card blue">
          <div className="stat-icon"><Boxes size={18} /></div>
          <div className="stat-value">{totalPickupItems}</div>
          <div className="stat-label">From Pickups</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle size={18} /></div>
          <div className="stat-value">{totalCounted}</div>
          <div className="stat-label">Total Counted</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><Package size={18} /></div>
          <div className="stat-value">{totalInStock}</div>
          <div className="stat-label">In Stock</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon"><Gift size={18} /></div>
          <div className="stat-value">{totalDispatched}</div>
          <div className="stat-label">Dispatched</div>
        </div>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${activeView === 'warehouse' ? 'active' : ''}`} onClick={() => setActiveView('warehouse')}>
            <Package size={13} style={{ marginRight: 5 }} />Warehouse Stock
          </button>
          <button className={`tab ${activeView === 'pickups' ? 'active' : ''}`} onClick={() => setActiveView('pickups')}>
            <Boxes size={13} style={{ marginRight: 5 }} />SKS Pickups ({sksPickups.length})
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={13} /> Export</button>
          {activeView === 'warehouse' && (
            <button
              className="btn btn-sm"
              onClick={handleSave}
              style={{
                background: saveFlash ? 'var(--secondary)' : 'var(--primary)',
                color: 'white', transition: 'background 0.3s',
              }}
            >
              {saveFlash ? <><CheckCircle size={13} /> Saved!</> : <><Save size={13} /> Save Stock</>}
            </button>
          )}
        </div>
      </div>

      {/* ── WAREHOUSE VIEW ── */}
      {activeView === 'warehouse' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
            <div className="search-wrap" style={{ flex: '1 1 200px' }}>
              <Search className="icon" />
              <input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`btn btn-sm ${filterCat === cat ? 'btn-outline' : 'btn-ghost'}`}
                  onClick={() => setFilterCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, flex: '0 0 auto' }}>
                <label style={{ fontSize: 10.5, fontWeight: 600 }}>From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 140 }} />
              </div>
              <div className="form-group" style={{ margin: 0, flex: '0 0 auto' }}>
                <label style={{ fontSize: 10.5, fontWeight: 600 }}>To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 140 }} />
              </div>
              {(dateFrom || dateTo) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Showing <strong>{filteredItems.length}</strong> item types
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filteredItems.map(([item, cfg]) => (
              <StockCard
                key={item}
                item={item}
                config={cfg}
                received={receivedCounts[item] || 0}
                stock={stock[item] || { counted: 0, dispatched: 0 }}
                onCount={updateCount}
                onDispatch={updateDispatch}
              />
            ))}
          </div>
        </>
      )}

      {/* ── PICKUPS VIEW ── */}
      {activeView === 'pickups' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10.5, fontWeight: 600 }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 140 }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10.5, fontWeight: 600 }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 140 }} />
            </div>
            {(dateFrom || dateTo) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>

          <div className="card">
            {sksPickups.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Package size={24} /></div>
                <h3>No SKS pickups found</h3>
                <p>Adjust date range or record pickups with SKS items.</p>
              </div>
            ) : (
              sksPickups.map(p => (
                <DrivePickupRow key={p.id} pickup={p} />
              ))
            )}
          </div>

          {/* Summary by item type */}
          {sksPickups.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div className="card-title">Item Summary (from pickups in range)</div>
              </div>
              <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                <table>
                  <thead>
                    <tr><th>Item</th><th>Category</th><th>Times Donated</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(receivedCounts)
                      .filter(([, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([item, count]) => (
                        <tr key={item}>
                          <td style={{ fontWeight: 600 }}>{item}</td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: 10.5 }}>
                              {SKS_ITEM_CONFIG[item]?.category || 'Other'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}