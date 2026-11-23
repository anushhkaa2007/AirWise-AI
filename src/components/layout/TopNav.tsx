import { MapPin, Menu, Search, User, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { AppPage } from '../../types/airwise.ts';
import { AirWiseEmblem } from '../ui/AirWiseEmblem.tsx';

interface TopNavProps {
  activeLocation: string;
  onLocationSubmit: (location: string) => Promise<void>;
  onNavigate: (page: AppPage) => void;
  onOpenMobileMenu: () => void;
  isUpdatingLocation: boolean;
}

export function TopNav({
  activeLocation,
  onLocationSubmit,
  onNavigate,
  onOpenMobileMenu,
  isUpdatingLocation,
}: TopNavProps) {
  const [query, setQuery] = useState(activeLocation);

  useEffect(() => {
    setQuery(activeLocation);
  }, [activeLocation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onLocationSubmit(query);
  };

  const handleClear = async () => {
    setQuery('');
    await onLocationSubmit('');
  };

  const renderSearchForm = (inputId: string) => (
    <form
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-1 items-center gap-2"
      role="search"
      aria-label="Location search"
    >
      <div className="relative min-w-0 flex-1">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1B4938]"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or neighborhood..."
          aria-label="Search city or neighborhood"
          className="h-10 w-full rounded-xl border border-[#DDD8CC] bg-[#EEECE3]/80 pl-10 pr-8 text-sm text-[#252D29] placeholder:text-[#252D29]/55 transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear location"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#252D29]/60 hover:bg-[#A8BBA6]/30 hover:text-[#102B22]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={isUpdatingLocation}
        aria-label="Update location"
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#102B22] px-4 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#1B4938] disabled:opacity-60 whitespace-nowrap"
      >
        <Search className="h-4 w-4 text-[#C4DC91]" aria-hidden="true" />
        <span>{isUpdatingLocation ? 'Saving...' : 'Set'}</span>
      </button>
    </form>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#DFDBD0] bg-[#F7F5EF]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD8CC] bg-[#EEECE3] text-[#102B22] transition-colors hover:bg-[#A8BBA6]/30 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#102B22]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#102B22] text-[#F7F5EF]">
                <AirWiseEmblem className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold tracking-[0.14em] text-[#102B22] whitespace-nowrap">
                AIRWISE AI
              </span>
            </button>
          </div>

          <div className="hidden min-w-0 flex-1 max-w-md sm:flex">
            {renderSearchForm('top-location-search')}
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label="Open My Profile"
              title="My Profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD8CC] bg-[#EEECE3] text-[#102B22] transition-colors hover:border-[#1B4938] hover:bg-[#A8BBA6]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#102B22]"
            >
              <User className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[#DFDBD0] bg-[#F7F5EF] px-4 py-2.5 sm:hidden">
        {renderSearchForm('mobile-location-search')}
      </div>
    </>
  );
}
