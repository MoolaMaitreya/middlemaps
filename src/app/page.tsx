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

  function handleAddParticipant(name: string, location: Location, transportMode: TransportMode) {
    const participant: Participant = {
      id: nanoid(8),
      name,
      location,
      transportMode,
      color: PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length],
    };
    setParticipants((prev) => [...prev, participant]);

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
  }

  async function handleSearchVenues(filter?: VenueFilter) {
    if (!midpointResult) return;

    setIsSearchingVenues(true);
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
        setVenues(data.venues ?? data);
      } else {
        console.error('Failed to search venues:', res.statusText);
      }
    } catch (err) {
      console.error('Error searching venues:', err);
    } finally {
      setIsSearchingVenues(false);
    }
  }

  async function handleFindMidpoint() {
    if (participants.length < 2) return;

    setIsCalculating(true);
    try {
      const res = await fetch('/api/midpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });
      if (res.ok) {
        const data: MidpointResult = await res.json();
        setMidpointResult(data);
        setSelectedVenue(null);

        // Auto-search venues after finding midpoint
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
            setVenues(venueData.venues ?? venueData);
          } else {
            console.error('Failed to search venues:', venueRes.statusText);
          }
        } catch (err) {
          console.error('Error searching venues:', err);
        } finally {
          setIsSearchingVenues(false);
        }
      } else {
        console.error('Failed to find midpoint:', res.statusText);
      }
    } catch (err) {
      console.error('Error finding midpoint:', err);
    } finally {
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
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[420px] flex-shrink-0 bg-slate-900 border-r border-slate-700/50 overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-700/50">
            <h1 className="text-2xl font-bold text-white">MiddleMaps</h1>
            <p className="text-sm text-slate-400">Find the perfect meeting spot</p>
          </div>

          {/* Participant Panel */}
          <div className="px-6 py-4">
            <ParticipantPanel
              participants={participants}
              onAddParticipant={handleAddParticipant}
              onRemoveParticipant={handleRemoveParticipant}
              onFindMidpoint={handleFindMidpoint}
              isCalculating={isCalculating}
            />
          </div>

          {/* Venue Panel — shown only after midpoint is found */}
          {midpointResult && (
            <div className="px-6 py-4 border-t border-slate-700/50">
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
        </div>

        {/* Right Map Area */}
        <div className="flex-1">
          <MapViewWrapper
            participants={participants}
            midpoint={midpointResult?.midpoint || null}
            venues={venues}
            selectedVenue={selectedVenue}
          />
        </div>
      </div>
    </MapProvider>
  );
}
