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
 */
function generateCandidateGrid(
  center: Location,
  spacingKm: number,
  gridSize: number
): Location[] {
  const candidates: Location[] = [];
  const offset = Math.floor(gridSize / 2);

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

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

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
 */
export async function calculateTravelTimes(
  origins: Location[],
  destination: Location,
  modes: TransportMode[]
): Promise<TravelTime[]> {
  if (origins.length !== modes.length) {
    throw new Error('Origins and modes arrays must have the same length');
  }

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

      const coords = indices
        .map((i) => `${origins[i].lng},${origins[i].lat}`)
        .concat(`${destination.lng},${destination.lat}`)
        .join(';');

      const sourceIndices = indices.map((_, i) => i).join(';');
      const destIndex = indices.length;

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

      indices.forEach((originalIndex, rowIndex) => {
        const duration = data.durations?.[rowIndex]?.[0];
        const distance = data.distances?.[rowIndex]?.[0];

        if (duration === null || duration === undefined) {
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
 * Batch-evaluate multiple candidate destinations in a single OSRM Table call
 * per transport mode. Returns durations[candidateIndex][originIndex] in seconds.
 *
 * This is much faster than evaluating candidates one at a time because it makes
 * only 1 API call per unique transport mode instead of 1 per candidate.
 */
async function batchEvaluateCandidates(
  participants: Participant[],
  candidates: Location[]
): Promise<number[][]> {
  // Group participants by mode
  const modeGroups = new Map<TransportMode, number[]>();
  participants.forEach((p, i) => {
    const group = modeGroups.get(p.transportMode) || [];
    group.push(i);
    modeGroups.set(p.transportMode, group);
  });

  // result[candidateIdx][participantIdx] = duration seconds
  const result: number[][] = candidates.map(() =>
    new Array(participants.length).fill(Infinity)
  );

  const requests = Array.from(modeGroups.entries()).map(
    async ([mode, participantIndices]) => {
      const profile = MODE_TO_OSRM_PROFILE[mode];

      // Coordinates: participants in this group first, then all candidates
      const coords = [
        ...participantIndices.map(
          (i) => `${participants[i].location.lng},${participants[i].location.lat}`
        ),
        ...candidates.map((c) => `${c.lng},${c.lat}`),
      ].join(';');

      const numSources = participantIndices.length;
      const sourceIndices = participantIndices.map((_, i) => i).join(';');
      const destIndices = candidates
        .map((_, i) => i + numSources)
        .join(';');

      const url =
        `${OSRM_BASE_URL}/table/v1/${profile}/${coords}` +
        `?sources=${sourceIndices}&destinations=${destIndices}` +
        `&annotations=duration`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM Table API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.code !== 'Ok') {
        throw new Error(`OSRM Table API returned code: ${data.code}`);
      }

      // data.durations[sourceRow][destCol]
      // sourceRow = index in participantIndices
      // destCol = candidate index
      participantIndices.forEach((origParticipantIdx, sourceRow) => {
        candidates.forEach((_, candIdx) => {
          const dur = data.durations?.[sourceRow]?.[candIdx];
          if (dur !== null && dur !== undefined) {
            result[candIdx][origParticipantIdx] = dur;
          }
        });
      });
    }
  );

  await Promise.all(requests);
  return result;
}

function scoreCandidateByFairness(travelTimes: number[]): number {
  const validTimes = travelTimes.filter((t) => t !== Infinity);
  if (validTimes.length < 2) return Infinity;

  const maxTime = Math.max(...validTimes);
  const minTime = Math.min(...validTimes);
  return maxTime - minTime;
}

/**
 * Find the optimal midpoint for a set of participants by iteratively
 * searching candidate grids and refining around the best candidate.
 *
 * Uses batched OSRM Table calls so each iteration only makes 1 API call
 * per unique transport mode (typically 1-2 calls total per iteration).
 */
export async function findOptimalMidpoint(
  participants: Participant[]
): Promise<MidpointResult> {
  if (participants.length < 2) {
    throw new Error('At least two participants are required');
  }

  const locations = participants.map((p) => p.location);
  let center = calculateGeographicCenter(locations);

  const iterations = [
    { spacingKm: 2.0, gridSize: 3 },
    { spacingKm: 0.5, gridSize: 3 },
  ];

  for (const { spacingKm, gridSize } of iterations) {
    const candidates = generateCandidateGrid(center, spacingKm, gridSize);

    // Batch-evaluate ALL candidates in 1 OSRM call per transport mode
    const allTimes = await batchEvaluateCandidates(participants, candidates);

    let bestScore = Infinity;
    let bestCandidate = center;

    for (let i = 0; i < candidates.length; i++) {
      const score = scoreCandidateByFairness(allTimes[i]);
      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidates[i];
      }
    }

    center = bestCandidate;
  }

  // Final travel times for the winning midpoint
  const origins = participants.map((p) => p.location);
  const modes = participants.map((p) => p.transportMode);
  const finalTravelTimes = await calculateTravelTimes(origins, center, modes);

  const validTimes = finalTravelTimes
    .map((t) => t.durationSeconds)
    .filter((t) => t !== Infinity);

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
