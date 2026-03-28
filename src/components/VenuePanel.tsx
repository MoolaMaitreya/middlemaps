'use client';

import type { Venue, VenueFilter, VenueCategory, MidpointResult } from '@/types';
import { VENUE_CATEGORIES } from '@/lib/constants';
import VenueCard from '@/components/VenueCard';

interface VenuePanelProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  filter: VenueFilter;
  onFilterChange: (filter: VenueFilter) => void;
  isSearching: boolean;
  midpointResult: MidpointResult | null;
}

const RATING_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
  { label: '4.5+', value: 4.5 },
] as const;

export default function VenuePanel({
  venues,
  selectedVenue,
  onSelectVenue,
  filter,
  onFilterChange,
  isSearching,
  midpointResult,
}: VenuePanelProps) {
  const filteredVenues = venues.filter((venue) => {
    if (filter.minRating != null && (venue.rating == null || venue.rating < filter.minRating)) {
      return false;
    }
    if (filter.maxPrice != null && (venue.priceLevel == null || venue.priceLevel > filter.maxPrice)) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Nearby Places</h2>
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold rounded-md bg-slate-700/60 text-slate-400 border border-slate-600/30">
            {filteredVenues.length}
          </span>
        </div>
      </div>

      {/* Midpoint stats */}
      {midpointResult && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/8 border border-amber-500/15 px-3 py-2">
            <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] text-amber-400/70 uppercase tracking-wider leading-none">Avg travel</p>
              <p className="text-sm font-semibold text-amber-300 leading-tight">
                {Math.round(midpointResult.avgTravelTime / 60)} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-violet-500/8 border border-violet-500/15 px-3 py-2">
            <svg className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] text-violet-400/70 uppercase tracking-wider leading-none">Max diff</p>
              <p className="text-sm font-semibold text-violet-300 leading-tight">
                {Math.round(midpointResult.maxTravelTimeDiff / 60)} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
        {Object.entries(VENUE_CATEGORIES).map(([value, { label }]) => (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange({ ...filter, category: value as VenueCategory })}
            className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
              filter.category === value
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-slate-400 border border-transparent hover:text-slate-300 hover:bg-slate-700/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rating filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">Rating</span>
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-slate-800/40">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onFilterChange({ ...filter, minRating: option.value })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                filter.minRating === option.value
                  ? 'bg-violet-500/20 text-violet-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Venue list */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-0.5 -mr-0.5">
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
            </div>
            <span className="text-sm text-slate-400">Searching nearby places...</span>
          </div>
        )}

        {!isSearching && filteredVenues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">
              No places found. Try a different category.
            </p>
          </div>
        )}

        {!isSearching &&
          filteredVenues.map((venue, index) => (
            <div key={venue.placeId} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
              <VenueCard
                venue={venue}
                isSelected={selectedVenue?.placeId === venue.placeId}
                onClick={() => onSelectVenue(venue)}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
