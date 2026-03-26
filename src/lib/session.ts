import { nanoid } from 'nanoid';
import { Session, Participant } from '@/types';
import { PARTICIPANT_COLORS } from './constants';

const sessions = new Map<string, Session>();

export function createSession(): Session {
  const session: Session = {
    id: nanoid(10),
    participants: [],
    midpoint: null,
    venues: [],
    createdAt: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function addParticipant(sessionId: string, participant: Omit<Participant, 'id' | 'color'>): Participant | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const newParticipant: Participant = {
    ...participant,
    id: nanoid(8),
    color: PARTICIPANT_COLORS[session.participants.length % PARTICIPANT_COLORS.length],
  };
  session.participants.push(newParticipant);
  return newParticipant;
}

export function updateSession(id: string, updates: Partial<Session>): Session | null {
  const session = sessions.get(id);
  if (!session) return null;
  Object.assign(session, updates);
  return session;
}

export function removeParticipant(sessionId: string, participantId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.participants = session.participants.filter(p => p.id !== participantId);
  return true;
}
