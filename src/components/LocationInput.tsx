'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Location } from '@/types';

interface LocationInputProps {
  onLocationSelect: (location: Location) => void;
  placeholder?: string;
}

interface NominatimResult {
  place_id: number;
  osm_id?: number;
  lat: string;
  lon: string;
  display_name: string;
}

export default function LocationInput({
  onLocationSelect,
  placeholder = 'Search for an address...',
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchNominatim = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&email=middlemaps@example.com`;
      const response = await fetch(url);
      if (!response.ok) {
        setResults([]);
        return;
      }
      const data: NominatimResult[] = await response.json();
      setResults(data);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.length < 3) {
        setResults([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setIsOpen(true);
      debounceRef.current = setTimeout(() => searchNominatim(value), 300);
    },
    [searchNominatim],
  );

  const selectResult = useCallback(
    (result: NominatimResult) => {
      const location: Location = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name,
        placeId: result.osm_id?.toString(),
      };
      setInputValue(result.display_name);
      setResults([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onLocationSelect(location);
    },
    [onLocationSelect],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < results.length) {
            selectResult(results[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, results, highlightedIndex, selectResult],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200"
        autoComplete="off"
      />

      {/* Clear button */}
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
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
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg overflow-hidden z-50">
          {isLoading && results.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-slate-400">
              Searching...
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-slate-400">
              No results found
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={result.place_id}
              onClick={() => selectResult(result)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0 ${
                index === highlightedIndex ? 'bg-slate-700' : ''
              }`}
            >
              <span className="line-clamp-2">{result.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
