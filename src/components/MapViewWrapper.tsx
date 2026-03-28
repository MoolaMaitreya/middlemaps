'use client';

import dynamic from 'next/dynamic';
import type { Participant, Location, Venue } from '@/types';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[var(--background)]">
      <div className="relative mb-3">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
      </div>
      <span className="text-sm text-slate-500">Loading map...</span>
    </div>
  ),
});

interface MapViewWrapperProps {
  participants: Participant[];
  midpoint: Location | null;
  venues: Venue[];
  onMapClick?: (location: Location) => void;
  selectedVenue?: Venue | null;
}

export default function MapViewWrapper(props: MapViewWrapperProps) {
  return <MapView {...props} />;
}
