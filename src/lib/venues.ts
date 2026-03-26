import {
  Location,
  Participant,
  Venue,
  VenueFilter,
  TravelTime,
  VenueCategory,
  TransportMode,
} from '@/types';
import { VENUE_SEARCH_RADIUS } from '@/lib/constants';

const OSRM_BASE_URL = 'https://router.project-osrm.org';

const MODE_TO_OSRM_PROFILE: Record<TransportMode, string> = {
  driving: 'car',
  transit: 'car',
  walking: 'foot',
  bicycling: 'bicycle',
};

/**
 * Build an Overpass QL query fragment for a given VenueCategory.
 */
function buildOverpassFilter(category: VenueCategory, lat: number, lng: number, radius: number): string {
  const around = `around:${radius},${lat},${lng}`;

  switch (category) {
    case 'restaurant':
      return `
  node["amenity"="restaurant"](${around});
  way["amenity"="restaurant"](${around});`;
    case 'cafe':
      return `
  node["amenity"="cafe"](${around});
  way["amenity"="cafe"](${around});`;
    case 'bar':
      return `
  node["amenity"="bar"](${around});
  way["amenity"="bar"](${around});`;
    case 'park':
      return `
  node["leisure"="park"](${around});
  way["leisure"="park"](${around});`;
    case 'shopping':
      return `
  node["shop"](${around});
  way["shop"](${around});`;
    case 'entertainment':
      return `
  node["amenity"="cinema"](${around});
  way["amenity"="cinema"](${around});
  node["amenity"="theatre"](${around});
  way["amenity"="theatre"](${around});`;
    case 'any':
    default:
      return `
  node["amenity"~"restaurant|cafe|bar|pub"](${around});
  way["amenity"~"restaurant|cafe|bar|pub"](${around});`;
  }
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function buildAddress(tags: Record<string, string>, fallbackName: string): string {
  const parts: string[] = [];
  const houseNumber = tags['addr:housenumber'];
  const street = tags['addr:street'];
  const city = tags['addr:city'];

  if (street) {
    parts.push(houseNumber ? `${houseNumber} ${street}` : street);
  }
  if (city) {
    parts.push(city);
  }

  return parts.length > 0 ? parts.join(', ') : fallbackName;
}

function collectTypes(tags: Record<string, string>): string[] {
  const types: string[] = [];
  if (tags.amenity) types.push(tags.amenity);
  if (tags.cuisine) types.push(...tags.cuisine.split(';').map((s) => s.trim()));
  if (tags.shop) types.push(tags.shop);
  if (tags.leisure) types.push(tags.leisure);
  return types;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} mins`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours} hr ${mins} min`;
}

/**
 * Batch-calculate travel times from all participants to all venues in a
 * single OSRM Table call per transport mode. Returns a 2D array:
 * result[venueIndex][participantIndex] = { durationSeconds, distanceText, durationText }
 */
async function batchVenueTravelTimes(
  participants: Participant[],
  venueLocations: Location[]
): Promise<TravelTime[][]> {
  if (venueLocations.length === 0) return [];

  const modeGroups = new Map<TransportMode, number[]>();
  participants.forEach((p, i) => {
    const group = modeGroups.get(p.transportMode) || [];
    group.push(i);
    modeGroups.set(p.transportMode, group);
  });

  // result[venueIdx][participantIdx]
  const result: TravelTime[][] = venueLocations.map(() =>
    participants.map((p) => ({
      participantId: p.id,
      participantName: p.name,
      durationSeconds: Infinity,
      durationText: 'No route',
      distanceText: 'N/A',
    }))
  );

  const requests = Array.from(modeGroups.entries()).map(
    async ([mode, participantIndices]) => {
      const profile = MODE_TO_OSRM_PROFILE[mode];

      // Coordinates: participants first, then all venues
      const coords = [
        ...participantIndices.map(
          (i) => `${participants[i].location.lng},${participants[i].location.lat}`
        ),
        ...venueLocations.map((v) => `${v.lng},${v.lat}`),
      ].join(';');

      const numSources = participantIndices.length;
      const sourceIndices = participantIndices.map((_, i) => i).join(';');
      const destIndices = venueLocations
        .map((_, i) => i + numSources)
        .join(';');

      const url =
        `${OSRM_BASE_URL}/table/v1/${profile}/${coords}` +
        `?sources=${sourceIndices}&destinations=${destIndices}` +
        `&annotations=duration,distance`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`OSRM error for venues: ${response.statusText}`);
        return;
      }

      const data = await response.json();
      if (data.code !== 'Ok') {
        console.error(`OSRM returned: ${data.code}`);
        return;
      }

      // data.durations[sourceRow][destCol], data.distances[sourceRow][destCol]
      participantIndices.forEach((origParticipantIdx, sourceRow) => {
        venueLocations.forEach((_, venueIdx) => {
          const dur = data.durations?.[sourceRow]?.[venueIdx];
          const dist = data.distances?.[sourceRow]?.[venueIdx];
          if (dur !== null && dur !== undefined) {
            result[venueIdx][origParticipantIdx] = {
              participantId: participants[origParticipantIdx].id,
              participantName: participants[origParticipantIdx].name,
              durationSeconds: dur,
              durationText: formatDuration(dur),
              distanceText: formatDistance(dist ?? 0),
            };
          }
        });
      });
    }
  );

  await Promise.all(requests);
  return result;
}

/**
 * Search for nearby venues around a midpoint using the Overpass API
 * (OpenStreetMap), then enrich each venue with travel times from
 * all participants using a batched OSRM call.
 */
export async function searchNearbyVenues(
  midpoint: Location,
  participants: Participant[],
  filter: VenueFilter
): Promise<Venue[]> {
  const filterFragment = buildOverpassFilter(
    filter.category,
    midpoint.lat,
    midpoint.lng,
    VENUE_SEARCH_RADIUS
  );

  const query = `[out:json][timeout:10];
(${filterFragment}
);
out center body qt 20;`;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const data: OverpassResponse = await response.json();

  let elements = (data.elements || []).filter((el) => el.tags?.name);
  elements = elements.slice(0, 10);

  if (elements.length === 0) return [];

  // Parse venue locations
  const parsedVenues = elements.map((el) => {
    const lat = el.lat ?? el.center?.lat ?? 0;
    const lon = el.lon ?? el.center?.lon ?? 0;
    const tags = el.tags ?? {};
    const name = tags.name ?? 'Unknown';
    return { el, lat, lon, tags, name, address: buildAddress(tags, name) };
  });

  const venueLocations: Location[] = parsedVenues.map((v) => ({
    lat: v.lat,
    lng: v.lon,
    address: v.address,
  }));

  // Single batched OSRM call for ALL venues at once
  const allTravelTimes = await batchVenueTravelTimes(participants, venueLocations);

  const venues: Venue[] = parsedVenues.map((v, i) => {
    const travelTimes = allTravelTimes[i];
    const validDurations = travelTimes
      .map((tt) => tt.durationSeconds)
      .filter((d) => d !== Infinity);

    const travelTimeVariance =
      validDurations.length >= 2
        ? Math.max(...validDurations) - Math.min(...validDurations)
        : 0;

    return {
      placeId: `${v.el.type}/${v.el.id}`,
      name: v.name,
      address: v.address,
      location: venueLocations[i],
      rating: undefined,
      priceLevel: undefined,
      types: collectTypes(v.tags),
      photoUrl: undefined,
      travelTimes,
      travelTimeVariance,
    };
  });

  return venues;
}
