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

    // Clear form
    setName('');
    setLocation(null);
    setTransportMode('driving');
    // Force LocationInput to remount and clear its internal state
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
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Participants</h2>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-medium rounded-full bg-violet-600 text-white">
          {participants.length}
        </span>
      </div>

      {/* Add participant form */}
      {participants.length < MAX_PARTICIPANTS && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
          {/* Name input */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name"
            disabled={disabled}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 disabled:opacity-50"
          />

          {/* Location input */}
          <LocationInput
            key={formKey}
            onLocationSelect={handleLocationSelect}
            placeholder="Search for an address..."
          />

          {/* Transport mode selector */}
          <div className="flex gap-1">
            {TRANSPORT_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setTransportMode(mode.value)}
                disabled={disabled}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  transportMode === mode.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span>{mode.icon}</span>
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violet-600"
          >
            Add Participant
          </button>
        </div>
      )}

      {/* Participant list */}
      {participants.length > 0 && (
        <ul className="flex flex-col gap-2">
          {participants.map((participant) => {
            const modeInfo = TRANSPORT_MODES.find((m) => m.value === participant.transportMode);
            return (
              <li
                key={participant.id}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5"
              >
                {/* Color dot */}
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: participant.color }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-100">
                      {participant.name}
                    </span>
                    {modeInfo && (
                      <span className="text-xs" title={modeInfo.label}>
                        {modeInfo.icon}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {participant.location.address}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveParticipant(participant.id)}
                  disabled={disabled || isCalculating}
                  className="flex-shrink-0 p-1 text-slate-500 hover:text-red-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Remove ${participant.name}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
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
        className="w-full py-3 rounded-lg text-sm font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500 flex items-center justify-center gap-2"
      >
        {isCalculating && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {isCalculating ? 'Finding...' : 'Find Middle Ground'}
      </button>
    </div>
  );
}
