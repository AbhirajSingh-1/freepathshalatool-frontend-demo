import { useEffect, useState } from 'react'
import { Building2, MapPin, Phone, User, X } from 'lucide-react'

const DEFAULT_FORM = {
  name: '',
  mobile: '',
  city: 'Gurgaon',
  sector: '',
  society: '',
  address: '',
}

export default function DonorModal({ open, onClose, onSave, locations }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(DEFAULT_FORM)
      setIsSubmitting(false)
    }
  }, [open])

  if (!open) return null

  const cities = Object.keys(locations)
  const sectorOptions = Object.keys(locations[form.city]?.sectors || {})
  const societyOptions = form.sector ? locations[form.city]?.sectors?.[form.sector] || [] : []

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value }

      if (field === 'city') {
        next.sector = ''
        next.society = ''
      }

      if (field === 'sector') {
        next.society = ''
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.mobile.trim() || !form.city || !form.sector || !form.society) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-600">New donor</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Add Gurgaon donor</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a donor profile and auto-select it for pickup scheduling.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Close donor modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="scheduler-label mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-orange-500" />
                Name
              </span>
              <input
                autoFocus
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="Enter donor name"
                className="scheduler-input"
              />
            </label>

            <label className="block">
              <span className="scheduler-label mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4 text-orange-500" />
                Mobile number
              </span>
              <input
                value={form.mobile}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) => setField('mobile', event.target.value.replace(/\D/g, ''))}
                placeholder="10 digit mobile number"
                className="scheduler-input"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="block">
              <span className="scheduler-label mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-500" />
                City
              </span>
              <select
                value={form.city}
                onChange={(event) => setField('city', event.target.value)}
                className="scheduler-select"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="scheduler-label mb-2">Sector</span>
              <select
                value={form.sector}
                onChange={(event) => setField('sector', event.target.value)}
                className="scheduler-select"
              >
                <option value="">Select sector</option>
                {sectorOptions.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="scheduler-label mb-2">Society</span>
              <select
                value={form.society}
                onChange={(event) => setField('society', event.target.value)}
                disabled={!form.sector}
                className="scheduler-select"
              >
                <option value="">{form.sector ? 'Select society' : 'Select sector first'}</option>
                {societyOptions.map((society) => (
                  <option key={society} value={society}>
                    {society}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="scheduler-label mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              Address
              <span className="text-xs font-normal text-slate-400">Optional</span>
            </span>
            <textarea
              value={form.address}
              onChange={(event) => setField('address', event.target.value)}
              placeholder="Flat number, tower, lane or landmark"
              rows={3}
              className="scheduler-textarea"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="scheduler-secondary-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="scheduler-primary-button"
            >
              {isSubmitting ? 'Saving donor...' : 'Save and select donor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
