import {
  CalendarClock,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  UserCircle2,
  X,
} from 'lucide-react';
import type { AppPage } from '../../types/airwise.ts';
import { AirWiseEmblem } from '../ui/AirWiseEmblem.tsx';

interface SidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  activeLocation: string;
}

const NAV_ITEMS: readonly {
  id: AppPage;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Atmosphere & air index',
    icon: LayoutDashboard,
  },
  {
    id: 'assistant',
    label: 'AI Assistant',
    description: 'Guided air intelligence',
    icon: MessageSquareText,
  },
  {
    id: 'profile',
    label: 'My Profile',
    description: 'Household & commute',
    icon: UserCircle2,
  },
  {
    id: 'planner',
    label: 'Daily Planner',
    description: 'Morning to evening',
    icon: CalendarClock,
  },
];

export function Sidebar({
  activePage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  activeLocation,
}: SidebarProps) {
  const handleSelect = (page: AppPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#102B22] text-[#F7F5EF]">
      <div>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B4938] text-[#F7F5EF]">
              <AirWiseEmblem className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.14em] text-[#F7F5EF] whitespace-nowrap">
                AIRWISE AI
              </p>
              <p className="mt-0.5 text-xs text-[#A8BBA6] whitespace-nowrap">
                Know your air. Own your day.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#A8BBA6] transition-colors hover:bg-white/10 hover:text-[#F7F5EF] lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="px-3.5 py-7" aria-label="Primary navigation">
          <ul className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4DC91] ${
                      isActive
                        ? 'bg-[#1B4938] text-[#F7F5EF]'
                        : 'text-[#A8BBA6] hover:bg-white/6 hover:text-[#F7F5EF]'
                    }`}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#C4DC91]"
                      />
                    )}
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#C4DC91]'
                          : 'text-[#A8BBA6]/80 group-hover:text-[#F7F5EF]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight whitespace-nowrap">
                        {item.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs truncate ${
                          isActive ? 'text-[#A8BBA6]' : 'text-[#A8BBA6]/70'
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <div className="flex items-center gap-2 text-xs text-[#A8BBA6]">
          <MapPin className="h-3.5 w-3.5 text-[#C4DC91] shrink-0" aria-hidden="true" />
          <span>Active monitoring zone</span>
        </div>
        <p className="mt-1.5 truncate text-sm font-medium text-[#F7F5EF]">
          {activeLocation || 'Not configured yet'}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[#A8BBA6]/75">
          OpenAQ · Gemini AI active
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            type="button"
            aria-label="Dismiss navigation backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-[#102B22]/65 backdrop-blur-[2px]"
          />
          <div className="relative z-10 w-72 max-w-[85vw] shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
