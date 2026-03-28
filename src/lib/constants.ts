export const PARTICIPANT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

export const DEFAULT_CENTER = { lat: 40.7128, lng: -74.0060 }; // NYC
export const DEFAULT_ZOOM = 12;

export const VENUE_CATEGORIES: Record<string, { label: string; icon: string }> = {
  any:            { label: 'All',            icon: 'M4 6h16M4 12h16M4 18h16' },
  restaurant:     { label: 'Restaurants',    icon: 'M3 3h18v18H3zM12 8v4m0 4h.01' },
  cafe:           { label: 'Cafes',          icon: 'M18.364 5.636a9 9 0 11-12.728 0M12 14v-4' },
  bar:            { label: 'Bars',           icon: 'M9 5H2v7l6.29 6.29c.39.39 1.02.39 1.41 0l5.3-5.3c.39-.39.39-1.02 0-1.41L9 5z' },
  park:           { label: 'Parks',          icon: 'M5 12h14M12 5v14' },
  shopping:       { label: 'Shopping',       icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
  entertainment:  { label: 'Fun',            icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
};

export const TRANSPORT_MODES = [
  { value: 'driving', label: 'Drive', icon: '🚗' },
  { value: 'transit', label: 'Transit', icon: '🚇' },
  { value: 'walking', label: 'Walk', icon: '🚶' },
  { value: 'bicycling', label: 'Bike', icon: '🚲' },
] as const;

export const MAX_PARTICIPANTS = 8;
export const VENUE_SEARCH_RADIUS = 1500; // meters
