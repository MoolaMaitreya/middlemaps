'use client';

import type { Venue } from '@/types';

interface VenueCardProps {
  venue: Venue;
  isSelected: boolean;
  onClick: () => void;
}

export default function VenueCard({ venue, isSelected, onClick }: VenueCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'ring-1 ring-violet-500/70 bg-violet-500/8 border-violet-500/30'
          : 'bg-slate-800/30 border-[var(--border)] hover:bg-slate-800/50 hover:border-[var(--border-light)]'
      }`}
    >
      {/* Header: name + rating/price */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-100 leading-snug">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {venue.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-400">
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {venue.rating.toFixed(1)}
            </span>
          )}
          {venue.priceLevel != null && (
            <span className="text-xs text-emerald-400/80 font-medium">
              {'$'.repeat(venue.priceLevel)}
            </span>
          )}
        </div>
      </div>

      {/* Address */}
      <p className="mt-0.5 text-[11px] text-slate-500 truncate">{venue.address}</p>

      {/* Type badges */}
      {venue.types.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {venue.types.slice(0, 2).map((type) => (
            <span
              key={type}
              className="inline-block rounded-md bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400 font-medium"
            >
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Travel times */}
      {venue.travelTimes.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--border)] pt-2">
          {venue.travelTimes.map((tt) => (
            <div key={tt.participantId} className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-400 font-medium truncate min-w-0 flex-shrink">
                {tt.participantName}
              </span>
              <span className="ml-auto flex-shrink-0 text-slate-300 font-medium">
                {tt.durationText}
              </span>
              <span className="flex-shrink-0 text-slate-600 text-[10px]">
                {tt.distanceText}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
