export interface Location {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

export interface Participant {
  id: string;
  name: string;
  location: Location;
  transportMode: TransportMode;
  color: string;
}

export type TransportMode = 'driving' | 'transit' | 'walking' | 'bicycling';

export interface Session {
  id: string;
  participants: Participant[];
  midpoint: Location | null;
  venues: Venue[];
  createdAt: string;
}

export interface Venue {
  placeId: string;
  name: string;
  address: string;
  location: Location;
  rating?: number;
  priceLevel?: number;
  types: string[];
  photoUrl?: string;
  travelTimes: TravelTime[];
  travelTimeVariance: number;
}

export interface TravelTime {
  participantId: string;
  participantName: string;
  durationSeconds: number;
  durationText: string;
  distanceText: string;
}

export interface MidpointResult {
  midpoint: Location;
  maxTravelTimeDiff: number;
  avgTravelTime: number;
}

export interface VenueFilter {
  category: VenueCategory;
  maxPrice?: number;
  minRating?: number;
}

export type VenueCategory = 'restaurant' | 'cafe' | 'bar' | 'park' | 'shopping' | 'entertainment' | 'any';
