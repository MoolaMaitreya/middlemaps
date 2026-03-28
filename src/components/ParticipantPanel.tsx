'use client';

import { useState, useCallback } from 'react';
import type { Location, Participant, TransportMode } from '@/types';
import { MAX_PARTICIPANTS, TRANSPORT_MODES } from '@/lib/constants';
import LocationInput from '@/components/LocationInput';

interface ParticipantPanelProps {
  participants: Participant[];
  onAddParticipant: (name: string, location: Location, transportMode: TransportMode) => void;
  onRemoveParticipant: (id: string) => void;
  onFindMidpoint: () => void;
  isCalculating: boolean;
  disabled?: boolean;
}

export default function ParticipantPanel({
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onFindMidpoint,
  isCalculating,
  disabled = false,
}: ParticipantPanelProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [formKey, setFormKey] = useState(0);

  const canAdd = name.trim() !== '' && location !== null && participants.length < MAX_PARTICIPANTS && !disabled;
  const canFindMidpoint = participants.length >= 2 && !isCalculating && !disabled;

  const handleLocationSelect = useCallback((loc: Location) => {
    setLocation(loc);
  }, []);

  const handleAdd = useCallback(() => {
    if (!canAdd || !location) return;

    onAddParticipant(name.trim(), location, transportMode);

    setName('');
    setLocation(null);
    setTransportMode('driving');
    setFormKey((prev) => prev + 1);
  }, [canAdd, name, location, transportMode, onAddParticipant]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && canAdd) {
        handleAdd();
      }
    },
    [canAdd, handleAdd],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Participants</h2>
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/20">
            {participants.length}
          </span>
        </div>
        {participants.length > 0 && (
          <span className="text-[11px] text-slate-500">
            {MAX_PARTICIPANTS - participants.length} spots left
          </span>
        )}
      </div>

      {/* Add participant form */}
      {participants.length < MAX_PARTICIPANTS && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-slate-800/30 p-3.5">
          {/* Name input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Name"
              disabled={disabled}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-[var(--border-light)] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {/* Location input */}
          <LocationInput
            key={formKey}
            onLocationSelect={handleLocationSelect}
            placeholder="Search for an address..."
          />

          {/* Transport mode selector */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-slate-800/40">
            {TRANSPORT_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setTransportMode(mode.value)}
                disabled={disabled}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  transportMode === mode.value
                    ? 'bg-violet-600/90 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-sm leading-none">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-violet-600 flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Participant
          </button>
        </div>
      )}

      {/* Participant list */}
      {participants.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {participants.map((participant, index) => {
            const modeInfo = TRANSPORT_MODES.find((m) => m.value === participant.transportMode);
            return (
              <li
                key={participant.id}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-slate-800/30 px-3 py-2 group hover:border-[var(--border-light)] transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Color dot */}
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: participant.color, boxShadow: `0 0 8px ${participant.color}50` }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-100">
                      {participant.name}
                    </span>
                    {modeInfo && (
                      <span className="text-xs opacity-70" title={modeInfo.label}>
                        {modeInfo.icon}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate leading-snug">
                    {participant.location.address}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveParticipant(participant.id)}
                  disabled={disabled || isCalculating}
                  className="flex-shrink-0 p-1 rounded-md text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Remove ${participant.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Find Middle Ground button */}
      <button
        type="button"
        onClick={onFindMidpoint}
        disabled={!canFindMidpoint}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
          canFindMidpoint
            ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 hover:from-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/20'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        {isCalculating && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {isCalculating ? 'Calculating...' : 'Find Middle Ground'}
      </button>
    </div>
  );
}
