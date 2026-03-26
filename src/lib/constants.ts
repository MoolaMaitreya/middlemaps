export const PARTICIPANT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

export const DEFAULT_CENTER = { lat: 40.7128, lng: -74.0060 }; // NYC
export const DEFAULT_ZOOM = 12;

export const VENUE_CATEGORIES: Record<string, string> = {
  restaurant: 'Restaurants',
  cafe: 'Cafes',
  bar: 'Bars',
  park: 'Parks',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  any: 'All Places',
};

export const TRANSPORT_MODES = [
  { value: 'driving', label: 'Drive', icon: '🚗' },
  { value: 'transit', label: 'Transit', icon: '🚇' },
  { value: 'walking', label: 'Walk', icon: '🚶' },
  { value: 'bicycling', label: 'Bike', icon: '🚲' },
] as const;

export const MAX_PARTICIPANTS = 8;
export const VENUE_SEARCH_RADIUS = 1500; // meters
