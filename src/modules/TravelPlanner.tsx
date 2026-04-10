import type { User } from '@supabase/supabase-js'
import { defaultTravelLegs } from '../data/defaults'
import { useSupabaseTable } from '../lib/hooks'
import { STORAGE_KEYS } from '../lib/storage'
import type { TravelLeg } from '../lib/types'

type TravelPlannerProps = {
  user: User | null
}

export const TravelPlanner = ({ user }: TravelPlannerProps) => {
  const { rows: legs, setRows: setLegs } = useSupabaseTable<TravelLeg>(
    'travel_notes',
    STORAGE_KEYS.travelLegs,
    defaultTravelLegs,
    user,
  )

  const updateLeg = (id: string, updates: Partial<TravelLeg>) => {
    setLegs(legs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg)))
  }

  const totalBudget = legs.reduce((sum, leg) => sum + (leg.budget_cad || 0), 0)
  const totalSpent = legs.reduce((sum, leg) => sum + (leg.spent_cad || 0), 0)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-night-400">
          Travel Planner
        </p>
        <h2 className="text-2xl font-semibold text-white">SEA Trip</h2>
        <p className="mt-1 text-sm text-night-300">Apr 23 – May 20 · 27 days</p>
      </header>

      <div className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-night-400">
          Overall budget (CAD)
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-night-200">
          <span>Total: ${totalBudget.toFixed(0)}</span>
          <span>Spent: ${totalSpent.toFixed(0)}</span>
          <span>Remaining: ${(totalBudget - totalSpent).toFixed(0)}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {legs.map((leg) => (
          <div
            key={leg.id}
            className="rounded-2xl border border-night-700 bg-night-900/70 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-night-400">
                  {leg.dates}
                </p>
                <h3 className="text-sm font-semibold text-white">{leg.leg}</h3>
              </div>
              <span className="text-xs text-night-300">
                ${leg.spent_cad}/{leg.budget_cad}
              </span>
            </div>
            <div className="mt-4 space-y-3 text-xs text-night-300">
              <label className="block">
                Accommodation
                <input
                  className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
                  value={leg.accommodation}
                  onChange={(event) =>
                    updateLeg(leg.id, { accommodation: event.target.value })
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  Budget (CAD)
                  <input
                    className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
                    type="number"
                    value={leg.budget_cad}
                    onChange={(event) =>
                      updateLeg(leg.id, { budget_cad: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="block">
                  Spent (CAD)
                  <input
                    className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
                    type="number"
                    value={leg.spent_cad}
                    onChange={(event) =>
                      updateLeg(leg.id, { spent_cad: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <label className="block">
                Things to do
                <textarea
                  className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
                  rows={2}
                  value={leg.todo}
                  onChange={(event) =>
                    updateLeg(leg.id, { todo: event.target.value })
                  }
                />
              </label>
              <label className="block">
                Packing notes
                <textarea
                  className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
                  rows={2}
                  value={leg.packing}
                  onChange={(event) =>
                    updateLeg(leg.id, { packing: event.target.value })
                  }
                />
              </label>
              <label className="block">
                Visa / entry notes
                <textarea
                  className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
                  rows={2}
                  value={leg.visa_notes}
                  onChange={(event) =>
                    updateLeg(leg.id, { visa_notes: event.target.value })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
