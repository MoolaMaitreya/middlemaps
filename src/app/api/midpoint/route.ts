import { NextResponse } from 'next/server';
import { Participant } from '@/types';
import { findOptimalMidpoint } from '@/lib/midpoint';

// Allow up to 30s for Vercel serverless functions
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { participants } = body as { participants: Participant[] };

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 participants are required' },
        { status: 400 }
      );
    }

    const result = await findOptimalMidpoint(participants);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Midpoint API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
