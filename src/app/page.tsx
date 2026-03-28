'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import MapProvider from '@/components/MapProvider';
import MapViewWrapper from '@/components/MapViewWrapper';
import ParticipantPanel from '@/components/ParticipantPanel';
import VenuePanel from '@/components/VenuePanel';
import type { Participant, MidpointResult, Venue, VenueFilter, Location, TransportMode } from '@/types';
import { PARTICIPANT_COLORS } from '@/lib/constants';

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [midpointResult, setMidpointResult] = useState<MidpointResult | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [venueFilter, setVenueFilter] = useState<VenueFilter>({ category: 'any' });
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handleAddParticipant(name: string, location: Location, transportMode: TransportMode) {
    const participant: Participant = {
      id: nanoid(8),
      name,
      location,
      transportMode,
      color: PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length],
    };
    setParticipants((prev) => [...prev, participant]);
    setError(null);

    if (midpointResult) {
      setMidpointResult(null);
      setVenues([]);
      setSelectedVenue(null);
    }
  }

  function handleRemoveParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setMidpointResult(null);
    setVenues([]);
    setSelectedVenue(null);
    setError(null);
  }

  async function handleSearchVenues(filter?: VenueFilter) {
    if (!midpointResult) return;

    setIsSearchingVenues(true);
    setError(null);
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          midpoint: midpointResult.midpoint,
          participants,
          filter: filter || venueFilter,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVenues(Array.isArray(data) ? data : data.venues ?? []);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || `Venue search failed (${res.status})`);
      }
    } catch (err) {
      setError('Network error searching venues. Please try again.');
      console.error('Error searching venues:', err);
    } finally {
      setIsSearchingVenues(false);
    }
  }

  async function handleFindMidpoint() {
    if (participants.length < 2) return;

    setIsCalculating(true);
    setError(null);
    setVenues([]);
    setSelectedVenue(null);

    try {
      const res = await fetch('/api/midpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });

      if (res.ok) {
        const data: MidpointResult = await res.json();
        setMidpointResult(data);
        setIsCalculating(false);

        // Auto-search venues
        setIsSearchingVenues(true);
        try {
          const venueRes = await fetch('/api/venues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              midpoint: data.midpoint,
              participants,
              filter: venueFilter,
            }),
          });
          if (venueRes.ok) {
            const venueData = await venueRes.json();
            setVenues(Array.isArray(venueData) ? venueData : venueData.venues ?? []);
          } else {
            const errData = await venueRes.json().catch(() => null);
            console.error('Venue search error:', errData?.error);
          }
        } catch (err) {
          console.error('Error searching venues:', err);
        } finally {
          setIsSearchingVenues(false);
        }
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || `Midpoint calculation failed (${res.status})`);
        setIsCalculating(false);
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Error finding midpoint:', err);
      setIsCalculating(false);
    }
  }

  function handleFilterChange(newFilter: VenueFilter) {
    setVenueFilter(newFilter);
    if (midpointResult) {
      handleSearchVenues(newFilter);
    }
  }

  function handleSelectVenue(venue: Venue) {
    setSelectedVenue((prev) => (prev?.placeId === venue.placeId ? null : venue));
  }

  return (
    <MapProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)]">
        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-[1100] md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed md:relative z-[1050] md:translate-x-0 w-[380px] md:w-[400px] flex-shrink-0 h-full bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto flex flex-col transition-transform duration-300 ease-in-out`}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-amber-400">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">MiddleMaps</h1>
                <p className="text-xs text-slate-400 leading-tight">Find the perfect meeting spot</p>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400 animate-fade-in flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Participant Panel */}
          <div className="px-5 py-4 flex-shrink-0">
            <ParticipantPanel
              participants={participants}
              onAddParticipant={handleAddParticipant}
              onRemoveParticipant={handleRemoveParticipant}
              onFindMidpoint={handleFindMidpoint}
              isCalculating={isCalculating}
            />
          </div>

          {/* Venue Panel */}
          {midpointResult && (
            <div className="px-5 py-4 border-t border-[var(--border)] flex-1 min-h-0 animate-fade-in">
              <VenuePanel
                venues={venues}
                selectedVenue={selectedVenue}
                onSelectVenue={handleSelectVenue}
                filter={venueFilter}
                onFilterChange={handleFilterChange}
                isSearching={isSearchingVenues}
                midpointResult={midpointResult}
              />
            </div>
          )}

          {/* Empty state when no midpoint yet */}
          {!midpointResult && participants.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Add two or more participants to find the optimal meeting point between everyone.
              </p>
            </div>
          )}
        </aside>

        {/* Sidebar backdrop on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[1040] bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Map Area */}
        <main className="flex-1 relative">
          <MapViewWrapper
            participants={participants}
            midpoint={midpointResult?.midpoint || null}
            venues={venues}
            selectedVenue={selectedVenue}
          />
        </main>
      </div>
    </MapProvider>
  );
}
