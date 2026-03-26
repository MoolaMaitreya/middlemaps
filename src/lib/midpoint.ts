import {
  Location,
  Participant,
  TransportMode,
  TravelTime,
  MidpointResult,
} from '@/types';

// Map TransportMode to OSRM profile
const MODE_TO_OSRM_PROFILE: Record<TransportMode, string> = {
  driving: 'car',
  transit: 'car', // OSRM doesn't support transit; fall back to car
  walking: 'foot',
  bicycling: 'bicycle',
};

const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Calculate the geographic center (centroid) of a set of locations
 * by averaging their latitude and longitude values.
 */
export function calculateGeographicCenter(locations: Location[]): Location {
  if (locations.length === 0) {
    throw new Error('At least one location is required');
  }

  const sumLat = locations.reduce((sum, loc) => sum + loc.lat, 0);
  const sumLng = locations.reduce((sum, loc) => sum + loc.lng, 0);

  return {
    lat: sumLat / locations.length,
    lng: sumLng / locations.length,
    address: 'Calculated midpoint',
  };
}

/**
 * Generate a grid of candidate points around a center location.
 * Returns an array of locations in a gridSize x gridSize grid
 * with the given spacing in kilometers.
 */
function generateCandidateGrid(
  center: Location,
  spacingKm: number,
  gridSize: number
): Location[] {
  const candidates: Location[] = [];
  const offset = Math.floor(gridSize / 2);

  // Approximate degrees per km at the given latitude
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = 111.32 * Math.cos((center.lat * Math.PI) / 180);

  const latStep = spacingKm / kmPerDegreeLat;
  const lngStep = spacingKm / kmPerDegreeLng;

  for (let row = -offset; row <= offset; row++) {
    for (let col = -offset; col <= offset; col++) {
      candidates.push({
        lat: center.lat + row * latStep,
        lng: center.lng + col * lngStep,
        address: 'Candidate point',
      });
    }
  }

  return candidates;
}

/**
 * Format a distance in meters to a human-readable string.
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format a duration in seconds to a human-readable string.
 */
function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} mins`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours} hr ${mins} min`;
}

/**
 * Call the OSRM Table API to get travel times from multiple origins to a
 * single destination, each with its own transport mode.
 *
 * OSRM coordinates are longitude,latitude (note the order).
 */
export async function calculateTravelTimes(
  origins: Location[],
  destination: Location,
  modes: TransportMode[]
): Promise<TravelTime[]> {
  if (origins.length !== modes.length) {
    throw new Error('Origins and modes arrays must have the same length');
  }

  // Group origins by transport mode so we make one OSRM request per profile.
  const modeGroups = new Map<TransportMode, number[]>();
  modes.forEach((mode, index) => {
    const group = modeGroups.get(mode) || [];
    group.push(index);
    modeGroups.set(mode, group);
  });

  const results: TravelTime[] = new Array(origins.length);

  const requests = Array.from(modeGroups.entries()).map(
    async ([mode, indices]) => {
      const profile = MODE_TO_OSRM_PROFILE[mode];

      // Build coordinates string: origins first, then destination last.
      // OSRM expects lng,lat order.
      const coords = indices
        .map((i) => `${origins[i].lng},${origins[i].lat}`)
        .concat(`${destination.lng},${destination.lat}`)
        .join(';');

      // sources = indices of origins (0..n-1), destinations = index of destination (n)
      const sourceIndices = indices.map((_, i) => i).join(';');
      const destIndex = indices.length; // last coordinate

      const url =
        `${OSRM_BASE_URL}/table/v1/${profile}/${coords}` +
        `?sources=${sourceIndices}&destinations=${destIndex}` +
        `&annotations=duration,distance`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM Table API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok') {
        throw new Error(`OSRM Table API returned code: ${data.code}`);
      }

      // durations[i][0] = seconds from origins[i] to destination
      // distances[i][0] = meters from origins[i] to destination
      indices.forEach((originalIndex, rowIndex) => {
        const duration = data.durations?.[rowIndex]?.[0];
        const distance = data.distances?.[rowIndex]?.[0];

        if (duration === null || duration === undefined) {
          // No route found — assign penalty values
          results[originalIndex] = {
            participantId: '',
            participantName: '',
            durationSeconds: Infinity,
            durationText: 'No route',
            distanceText: 'N/A',
          };
        } else {
          results[originalIndex] = {
            participantId: '',
            participantName: '',
            durationSeconds: duration,
            durationText: formatDuration(duration),
            distanceText: formatDistance(distance ?? 0),
          };
        }
      });
    }
  );

  await Promise.all(requests);

  return results;
}

/**
 * Score a candidate point based on travel times from all participants.
 * Lower score = more fair (smaller difference between longest and shortest travel).
 * Returns the maximum travel time difference between any two participants.
 */
function scoreCandidateByFairness(travelTimes: number[]): number {
  const validTimes = travelTimes.filter((t) => t !== Infinity);
  if (validTimes.length < 2) return Infinity;

  const maxTime = Math.max(...validTimes);
  const minTime = Math.min(...validTimes);
  return maxTime - minTime;
}

/**
 * Get travel times from all participants to a single candidate point.
 * Returns an array of duration values in seconds.
 */
async function getTravelTimesToCandidate(
  participants: Participant[],
  candidate: Location
): Promise<number[]> {
  const origins = participants.map((p) => p.location);
  const modes = participants.map((p) => p.transportMode);

  const travelTimes = await calculateTravelTimes(origins, candidate, modes);

  return travelTimes.map((t) => t.durationSeconds);
}

/**
 * Find the optimal midpoint for a set of participants by iteratively
 * searching candidate grids and refining around the best candidate.
 *
 * Algorithm:
 *  1. Start with the geographic center of all participant locations.
 *  2. Generate a 3x3 grid of candidate points around the center (~2km spacing).
 *  3. For each candidate, query the OSRM Table API for travel times.
 *  4. Score each candidate by the max difference in travel times.
 *  5. Pick the best candidate, then refine with a tighter grid.
 *  6. Repeat refinement for a total of 2 iterations.
 *  7. Return the optimal midpoint with fairness stats.
 */
export async function findOptimalMidpoint(
  participants: Participant[]
): Promise<MidpointResult> {
  if (participants.length < 2) {
    throw new Error('At least two participants are required');
  }

  // Step 1: Geographic center as the starting point
  const locations = participants.map((p) => p.location);
  let center = calculateGeographicCenter(locations);

  // Iteration parameters: start with ~2km spacing, then refine
  const iterations = [
    { spacingKm: 2.0, gridSize: 3 },
    { spacingKm: 0.5, gridSize: 3 },
  ];

  for (const { spacingKm, gridSize } of iterations) {
    // Step 2: Generate candidate grid
    const candidates = generateCandidateGrid(center, spacingKm, gridSize);

    // Step 3 & 4: Evaluate each candidate
    let bestScore = Infinity;
    let bestCandidate = center;

    for (const candidate of candidates) {
      const times = await getTravelTimesToCandidate(participants, candidate);
      const score = scoreCandidateByFairness(times);

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    // Step 5: Refine around the best candidate
    center = bestCandidate;
  }

  // Step 6: Get final travel times for the optimal midpoint
  const finalTimes = await getTravelTimesToCandidate(participants, center);

  const validTimes = finalTimes.filter((t) => t !== Infinity);
  const maxDiff =
    validTimes.length >= 2
      ? Math.max(...validTimes) - Math.min(...validTimes)
      : 0;
  const avgTime =
    validTimes.length > 0
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
      : 0;

  return {
    midpoint: {
      ...center,
      address: 'Optimal midpoint',
    },
    maxTravelTimeDiff: maxDiff,
    avgTravelTime: avgTime,
  };
}
