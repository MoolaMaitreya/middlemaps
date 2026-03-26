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
  // Filter venues client-side based on current filter
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
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Nearby Places</h2>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-medium rounded-full bg-slate-700 text-slate-300">
          {filteredVenues.length}
        </span>
      </div>

      {/* Midpoint stats */}
      {midpointResult && (
        <div className="flex gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-400">Avg travel:</span>
            <span className="font-medium text-slate-100">
              {Math.round(midpointResult.avgTravelTime / 60)} min
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-slate-400">Max difference:</span>
            <span className="font-medium text-slate-100">
              {Math.round(midpointResult.maxTravelTimeDiff / 60)} min
            </span>
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {Object.entries(VENUE_CATEGORIES).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange({ ...filter, category: value as VenueCategory })}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              filter.category === value
                ? 'bg-violet-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rating filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Min rating:</span>
        <div className="flex gap-1">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onFilterChange({ ...filter, minRating: option.value })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                filter.minRating === option.value
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Venue list */}
      <div className="flex flex-col gap-2 max-h-[calc(100vh-28rem)] overflow-y-auto pr-1">
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <svg
              className="h-6 w-6 animate-spin text-violet-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="ml-2 text-sm text-slate-400">Searching nearby places...</span>
          </div>
        )}

        {!isSearching && filteredVenues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="w-10 h-10 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-slate-400">
              No places found nearby. Try a different category.
            </p>
          </div>
        )}

        {!isSearching &&
          filteredVenues.map((venue) => (
            <VenueCard
              key={venue.placeId}
              venue={venue}
              isSelected={selectedVenue?.placeId === venue.placeId}
              onClick={() => onSelectVenue(venue)}
            />
          ))}
      </div>
    </div>
  );
}
