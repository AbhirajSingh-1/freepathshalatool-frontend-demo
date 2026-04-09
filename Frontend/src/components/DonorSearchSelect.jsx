import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, MapPin, Phone, Search, UserRound } from 'lucide-react'

function getDisplayValue(donor) {
  if (!donor) return ''
  return `${donor.name} - ${donor.mobile}`
}

export default function DonorSearchSelect({
  donors = [],
  selectedDonor = null,
  onSelect,
  onAddNew,
}) {
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState(getDisplayValue(selectedDonor))
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(-1)

  useEffect(() => {
    setSearchTerm(getDisplayValue(selectedDonor))
  }, [selectedDonor])

  useEffect(() => {
    if (!isOpen) {
      setHoveredIndex(-1)
      return undefined
    }

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false)
        setHoveredIndex(-1)
        setSearchTerm(getDisplayValue(selectedDonor))
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen, selectedDonor])

  const filteredDonors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const selectedLabel = getDisplayValue(selectedDonor).trim().toLowerCase()

    if (!query || (selectedLabel && query === selectedLabel)) return donors

    return donors.filter((donor) => {
      return (
        String(donor.name ?? '').toLowerCase().includes(query) ||
        String(donor.mobile ?? '').toLowerCase().includes(query)
      )
    })
  }, [donors, searchTerm, selectedDonor])

  useEffect(() => {
    if (!isOpen || hoveredIndex < 0 || !listRef.current) return

    const activeNode = listRef.current.querySelector(`[data-index="${hoveredIndex}"]`)
    activeNode?.scrollIntoView({ block: 'nearest' })
  }, [hoveredIndex, isOpen])

  const selectDonor = (donor) => {
    onSelect?.(donor)
    setSearchTerm(getDisplayValue(donor))
    setIsOpen(false)
    setHoveredIndex(-1)
  }

  const handleInputChange = (event) => {
    setSearchTerm(event.target.value)
    setIsOpen(true)
    setHoveredIndex(donors.length ? 0 : -1)
    if (selectedDonor) {
      onSelect?.(null)
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
    setHoveredIndex(donors.length ? 0 : -1)
  }

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setIsOpen(true)
      setHoveredIndex(donors.length ? 0 : -1)
      return
    }

    if (!isOpen) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHoveredIndex((current) => {
        if (!filteredDonors.length) return -1
        return current >= filteredDonors.length - 1 ? 0 : current + 1
      })
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHoveredIndex((current) => {
        if (!filteredDonors.length) return -1
        return current <= 0 ? filteredDonors.length - 1 : current - 1
      })
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (hoveredIndex >= 0 && filteredDonors[hoveredIndex]) {
        selectDonor(filteredDonors[hoveredIndex])
      }
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      setHoveredIndex(-1)
      setSearchTerm(getDisplayValue(selectedDonor))
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="!rounded-3xl !border !border-slate-200 !bg-white !p-0 shadow-sm transition focus-within:!border-orange-400 focus-within:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search donor by name or mobile..."
            className="!m-0 !w-full !border-0 !bg-transparent !p-0 !text-sm !font-medium !text-slate-900 placeholder:!text-slate-400 focus:!shadow-none focus:!ring-0"
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen((current) => !current)
              setHoveredIndex(donors.length ? 0 : -1)
            }}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Toggle donor list"
          >
            <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {selectedDonor && !isOpen && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
              <div className="rounded-2xl bg-orange-100 p-2 text-orange-600">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{selectedDonor.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[selectedDonor.society, selectedDonor.sector].filter(Boolean).join(', ')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {selectedDonor.mobile}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          {filteredDonors.length ? (
            filteredDonors.map((donor, index) => {
              const isActive = index === hoveredIndex
              return (
                <button
                  key={donor.id}
                  data-index={index}
                  type="button"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onClick={() => selectDonor(donor)}
                  className={`flex w-full flex-col rounded-2xl px-4 py-3 text-left transition ${
                    isActive ? 'bg-orange-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">{donor.name}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {[donor.society, donor.sector].filter(Boolean).join(', ')}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    {donor.mobile}
                  </span>
                </button>
              )
            })
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
              <p className="font-medium text-slate-700">
                {donors.length ? 'No donor found' : 'No donors available'}
              </p>
              {onAddNew && (
                <button
                  type="button"
                  onClick={onAddNew}
                  className="mt-3 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Add New Donor
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
