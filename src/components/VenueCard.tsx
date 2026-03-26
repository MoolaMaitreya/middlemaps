'use client';

import type { Venue } from '@/types';

interface VenueCardProps {
  venue: Venue;
  isSelected: boolean;
  onClick: () => void;
}

function renderStars(rating?: number) {
  if (rating == null) {
    return <span className="text-xs text-slate-500">No rating</span>;
  }
  return (
    <span className="text-sm text-amber-400 font-medium">
      &#9733; {rating.toFixed(1)}
    </span>
  );
}

function renderPrice(priceLevel?: number) {
  if (priceLevel == null) return null;
  return (
    <span className="text-sm text-green-400 font-medium">
      {'$'.repeat(priceLevel)}
    </span>
  );
}

export default function VenueCard({ venue, isSelected, onClick }: VenueCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-violet-500 bg-slate-800 border-violet-500/50'
          : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Header: name, rating, price */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100 leading-tight">
          {venue.name}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {renderStars(venue.rating)}
          {renderPrice(venue.priceLevel)}
        </div>
      </div>

      {/* Address */}
      <p className="mt-1 text-xs text-slate-400 truncate">{venue.address}</p>

      {/* Type badges */}
      {venue.types.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {venue.types.slice(0, 2).map((type) => (
            <span
              key={type}
              className="inline-block rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
            >
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Travel times */}
      {venue.travelTimes.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-700 pt-2">
          {venue.travelTimes.map((tt) => (
            <div
              key={tt.participantId}
              className="flex items-center gap-2 text-xs"
            >
              <span className="text-slate-300 font-medium truncate min-w-0 flex-shrink">
                {tt.participantName}
              </span>
              <span className="ml-auto flex-shrink-0 text-slate-400">
                {tt.durationText}
              </span>
              <span className="flex-shrink-0 text-slate-500">
                {tt.distanceText}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
