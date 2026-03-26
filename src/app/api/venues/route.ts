import { NextResponse } from 'next/server';
import { Location, Participant, VenueFilter } from '@/types';
import { searchNearbyVenues } from '@/lib/venues';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { midpoint, participants, filter } = body as {
      midpoint: Location;
      participants: Participant[];
      filter?: VenueFilter;
    };

    if (!midpoint || typeof midpoint.lat !== 'number' || typeof midpoint.lng !== 'number') {
      return NextResponse.json(
        { error: 'A valid midpoint with lat and lng is required' },
        { status: 400 }
      );
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      );
    }

    const venueFilter: VenueFilter = filter ?? { category: 'any' };
    const venues = await searchNearbyVenues(midpoint, participants, venueFilter);
    return NextResponse.json(venues);
  } catch (error) {
    console.error('Venues API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
