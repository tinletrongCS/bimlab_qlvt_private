import type { Subscription } from '../services/types'

export function SeatUsage({ subscription }: { subscription: Subscription }) {
  const total = Number(subscription.totalSeats || 0)
  const used = Number(subscription.usedSeats || 0)
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="seat-usage">
      <span>
        {used}/{total}
      </span>
      <div>
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
