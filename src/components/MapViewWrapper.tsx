'use client';

import dynamic from 'next/dynamic';
import type { Participant, Location, Venue } from '@/types';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-900">
      <div className="text-slate-400">Loading map...</div>
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
