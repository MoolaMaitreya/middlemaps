import {
  Location,
  Participant,
  Venue,
  VenueFilter,
  TravelTime,
  VenueCategory,
} from '@/types';
import { VENUE_SEARCH_RADIUS } from '@/lib/constants';
import { calculateTravelTimes } from '@/lib/midpoint';

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

/**
 * Build an address string from OSM tags, falling back to the venue name.
 */
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

/**
 * Collect type/category tags from an OSM element.
 */
function collectTypes(tags: Record<string, string>): string[] {
  const types: string[] = [];

  if (tags.amenity) types.push(tags.amenity);
  if (tags.cuisine) types.push(...tags.cuisine.split(';').map((s) => s.trim()));
  if (tags.shop) types.push(tags.shop);
  if (tags.leisure) types.push(tags.leisure);

  return types;
}

/**
 * Search for nearby venues around a midpoint using the Overpass API
 * (OpenStreetMap), then enrich each venue with travel times from
 * all participants using OSRM.
 */
export async function searchNearbyVenues(
  midpoint: Location,
  participants: Participant[],
  filter: VenueFilter
): Promise<Venue[]> {
  // Build Overpass query
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

  // POST to Overpass API
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const data: OverpassResponse = await response.json();

  // Parse results — skip elements without a name
  let elements = (data.elements || []).filter(
    (el) => el.tags?.name
  );

  // Limit to 10 results
  elements = elements.slice(0, 10);

  // For each venue, calculate travel times from all participants
  const venues: Venue[] = await Promise.all(
    elements.map(async (el) => {
      // Resolve coordinates: nodes have lat/lon directly, ways use center
      const lat = el.lat ?? el.center?.lat ?? 0;
      const lon = el.lon ?? el.center?.lon ?? 0;
      const tags = el.tags ?? {};
      const name = tags.name ?? 'Unknown';
      const address = buildAddress(tags, name);

      const venueLocation: Location = {
        lat,
        lng: lon,
        address,
      };

      // Calculate travel times from each participant to this venue
      const origins = participants.map((p) => p.location);
      const modes = participants.map((p) => p.transportMode);

      const travelTimes: TravelTime[] = await calculateTravelTimes(
        origins,
        venueLocation,
        modes
      );

      // Fill in participant info for each travel time entry
      travelTimes.forEach((tt, index) => {
        tt.participantId = participants[index].id;
        tt.participantName = participants[index].name;
      });

      // Calculate travel time variance as (max - min)
      const validDurations = travelTimes
        .map((tt) => tt.durationSeconds)
        .filter((d) => d !== Infinity);

      const travelTimeVariance =
        validDurations.length >= 2
          ? Math.max(...validDurations) - Math.min(...validDurations)
          : 0;

      return {
        placeId: `${el.type}/${el.id}`,
        name,
        address,
        location: venueLocation,
        rating: undefined,
        priceLevel: undefined,
        types: collectTypes(tags),
        photoUrl: undefined,
        travelTimes,
        travelTimeVariance,
      };
    })
  );

  return venues;
}
