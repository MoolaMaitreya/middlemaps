'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { Participant, Location, Venue } from '@/types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';

interface MapViewProps {
  participants: Participant[];
  midpoint: Location | null;
  venues: Venue[];
  onMapClick?: (location: Location) => void;
  selectedVenue?: Venue | null;
}

// --- Custom marker icon creators ---

function createParticipantIcon(color: string, name: string) {
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <div style="background:${color};color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${name}</div>
        <div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;margin-top:2px;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>
      </div>
    `,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createMidpointIcon() {
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <div style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3)">Midpoint</div>
        <div style="width:32px;height:32px;background:#f59e0b;border:2px solid #fff;border-radius:50%;margin-top:2px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createVenueIcon(isSelected: boolean, name: string) {
  const size = isSelected ? 28 : 20;
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        ${isSelected ? `<div style="background:#8b5cf6;color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);margin-bottom:2px">${name}</div>` : ''}
        <div style="width:${size}px;height:${size}px;background:${isSelected ? '#8b5cf6' : '#475569'};border:2px solid ${isSelected ? '#fff' : '#94a3b8'};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);transition:all 0.2s">
          <svg width="${size - 8}" height="${size - 8}" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// --- Internal sub-components ---

function MapBoundsController({
  participants,
  midpoint,
  venues,
}: {
  participants: Participant[];
  midpoint: Location | null;
  venues: Venue[];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    participants.forEach((p) => points.push([p.location.lat, p.location.lng]));
    if (midpoint) points.push([midpoint.lat, midpoint.lng]);
    venues.forEach((v) => points.push([v.location.lat, v.location.lng]));

    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [map, participants, midpoint, venues]);

  return null;
}

function MapClickHandler({ onClick }: { onClick?: (location: Location) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng, address: '' });
      }
    },
  });
  return null;
}

// --- Main component ---

export default function MapView({
  participants,
  midpoint,
  venues,
  onMapClick,
  selectedVenue,
}: MapViewProps) {
  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-slate-700/50">
      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapBoundsController
          participants={participants}
          midpoint={midpoint}
          venues={venues}
        />
        <MapClickHandler onClick={onMapClick} />

        {/* Participant markers */}
        {participants.map((p) => (
          <Marker
            key={p.id}
            position={[p.location.lat, p.location.lng]}
            icon={createParticipantIcon(p.color, p.name)}
          />
        ))}

        {/* Midpoint marker */}
        {midpoint && (
          <Marker
            position={[midpoint.lat, midpoint.lng]}
            icon={createMidpointIcon()}
          />
        )}

        {/* Venue markers */}
        {venues.map((v) => (
          <Marker
            key={v.placeId}
            position={[v.location.lat, v.location.lng]}
            icon={createVenueIcon(
              selectedVenue?.placeId === v.placeId,
              v.name,
            )}
          />
        ))}
      </MapContainer>

      {/* Map legend overlay */}
      {participants.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.name}</span>
              </div>
            ))}
            {midpoint && (
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Midpoint</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
