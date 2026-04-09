/**
 * PickupScheduler — connected to AppContext
 * Scheduling a pickup: dispatches schedulePickup() → instantly visible in
 * Dashboard, KabadiPickups, CustomerPickups, RaddiMaster.
 */
import { useState } from 'react'
import { CalendarDays, Clock, Plus, User, MapPin } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { schedulerPickups, TIME_SLOTS } from '../data/schedulerData'
import { fmtDate } from '../utils/helpers'
import PickupTabs from '../components/PickupTabs'

export default function PickupScheduler() {
  const { donors, schedulePickup } = useApp()

  const [activeTab, setActiveTab] = useState('scheduled')
  const [form, setForm] = useState({
    donorId:   '',
    date:      '',
    timeSlot:  TIME_SLOTS[0],
    type:      'RST',
    pickupMode:'Individual',
    notes:     '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const activeDonors = donors.filter(d => d.status !== 'Lost')
  const selected = activeDonors.find(d => d.id === form.donorId)

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.donorId || !form.date) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    schedulePickup({
      donorId:    selected.id,
      donorName:  selected.name,
      mobile:     selected.mobile,
      society:    selected.society,
      sector:     selected.sector,
      city:       selected.city,
      house:      selected.house,
      date:       form.date,
      timeSlot:   form.timeSlot,
      type:       form.type,
      pickupMode: form.pickupMode,
      notes:      form.notes,
    })
    setSaving(false)
    setSuccess(true)
    setForm(f => ({ ...f, donorId: '', date: '', notes: '' }))
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="page-body">
      {/* Schedule Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <CalendarDays size={18} color="var(--primary)" />
          <div className="card-title">Schedule a Pickup</div>
        </div>
        <div className="card-body">
          {success && (
            <div className="alert-strip alert-success" style={{ marginBottom: 16 }}>
              ✅ Pickup scheduled successfully! It now appears in Dashboard & Kabadi List.
            </div>
          )}
          <div className="form-grid">
            {/* Donor select */}
            <div className="form-group full">
              <label><User size={12} style={{ marginRight: 4 }} />Select Donor <span className="required">*</span></label>
              <select value={form.donorId} onChange={e => setField('donorId', e.target.value)}>
                <option value="">— Choose a donor —</option>
                {activeDonors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.mobile} ({d.society}, {d.sector})
                  </option>
                ))}
              </select>
            </div>

            {/* Donor preview chip */}
            {selected && (
              <div style={{ gridColumn: '1 / -1', background: 'var(--secondary-light)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={13} />
                <strong>{selected.name}</strong> · {selected.house ? `${selected.house}, ` : ''}{selected.society}, {selected.sector}, {selected.city}
              </div>
            )}

            <div className="form-group">
              <label>Pickup Date <span className="required">*</span></label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>

            <div className="form-group">
              <label><Clock size={12} style={{ marginRight: 4 }} />Time Slot</label>
              <select value={form.timeSlot} onChange={e => setField('timeSlot', e.target.value)}>
                {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={e => setField('type', e.target.value)}>
                <option value="RST">RST (Raddi)</option>
                <option value="SKS">SKS (Seva)</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div className="form-group">
              <label>Pickup Mode</label>
              <select value={form.pickupMode} onChange={e => setField('pickupMode', e.target.value)}>
                <option value="Individual">Individual</option>
                <option value="Drive">Drive / Community</option>
              </select>
            </div>

            <div className="form-group full">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Gate code, special instructions…" style={{ minHeight: 64 }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={saving || !form.donorId || !form.date}
            >
              <Plus size={14} />
              {saving ? 'Scheduling…' : 'Schedule Pickup'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <PickupTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={schedulerPickups}
        loading={false}
      />
    </div>
  )
}