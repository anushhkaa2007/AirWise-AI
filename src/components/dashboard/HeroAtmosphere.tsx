import { ArrowRight, MapPin } from 'lucide-react';
import type { AppPage } from '../../types/airwise.ts';
import { AirWiseEmblem } from '../ui/AirWiseEmblem.tsx';

interface HeroAtmosphereProps {
  location: string;
  profileLine: string;
  onNavigate: (page: AppPage) => void;
  onFocusLocationSearch: () => void;
}

export function HeroAtmosphere({
  location,
  profileLine,
  onNavigate,
  onFocusLocationSearch,
}: HeroAtmosphereProps) {
  const hasLocation = Boolean(location.trim());

  return (
    <section
      aria-labelledby="hero-headline"
      className="relative overflow-hidden rounded-3xl bg-[#102B22] text-[#F7F5EF]"
    >
      <div
        aria-hidden="true"
        className="animate-ambient-glow pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(196,220,145,0.22)_0%,rgba(27,73,56,0.18)_48%,transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(168,187,166,0.16)_0%,transparent_70%)]"
      />

      <div className="relative z-10 grid grid-cols-1 items-stretch gap-8 p-7 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-12">
        <div className="flex flex-col justify-between lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#A8BBA6]">
              <span className="inline-flex items-center gap-2 font-semibold tracking-[0.16em] text-[#C4DC91]">
                <AirWiseEmblem className="h-4 w-4 text-[#C4DC91]" />
                <span>AIRWISE AI</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>Know your air. Own your day.</span>
            </div>

            <h1
              id="hero-headline"
              className="mt-5 font-display text-3xl font-medium leading-[1.1] tracking-tight text-[#F7F5EF] sm:text-4xl lg:text-[2.85rem] text-balance"
            >
              The air around you changes everything.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#A8BBA6] sm:text-base">
              Personalized urban air-quality intelligence for families, students, commuters, and older adults—built to turn raw pollution telemetry into calm, practical daily decisions.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-6">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onFocusLocationSearch}
                className="group inline-flex items-center gap-2 text-left text-sm text-[#F7F5EF] transition-colors hover:text-[#C4DC91]"
              >
                <MapPin
                  className="h-4 w-4 shrink-0 text-[#C4DC91]"
                  aria-hidden="true"
                />
                <span className="font-medium truncate">
                  {hasLocation ? location : 'Select a city or neighborhood'}
                </span>
              </button>
              <p className="mt-1 truncate text-xs text-[#A8BBA6]/85">
                {profileLine === location
                  ? 'Household & commute preferences optional in My Profile'
                  : profileLine}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('assistant')}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2.5 self-start rounded-xl bg-[#C4DC91] px-5 text-sm font-semibold text-[#102B22] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#d1e6a4] sm:self-auto whitespace-nowrap"
            >
              <span>Ask AirWise AI</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-[220px] items-end overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#15392C] via-[#123126] to-[#0D231C] lg:col-span-5 lg:min-h-[290px]">
          <svg
            viewBox="0 0 460 300"
            className="h-full w-full"
            preserveAspectRatio="xMidYMax slice"
            role="img"
            aria-label="Atmospheric environmental illustration of an urban skyline with flowing air currents"
          >
            <defs>
              <linearGradient id="skyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C4DC91" stopOpacity="0.22" />
                <stop offset="55%" stopColor="#A8BBA6" stopOpacity="0.09" />
                <stop offset="100%" stopColor="#102B22" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="windLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A8BBA6" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#C4DC91" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#A8BBA6" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="460" height="300" fill="url(#skyGlow)" />

            <circle cx="345" cy="78" r="56" stroke="#A8BBA6" strokeOpacity="0.16" strokeWidth="1" fill="none" />
            <circle cx="345" cy="78" r="88" stroke="#A8BBA6" strokeOpacity="0.09" strokeWidth="1" fill="none" />

            {/* Flowing air currents */}
            <path
              d="M -20 96 C 70 58, 155 128, 250 86 C 325 54, 390 88, 480 62"
              stroke="url(#windLine)"
              strokeWidth="2"
              fill="none"
              className="animate-air-flow"
            />
            <path
              d="M -10 132 C 88 158, 182 96, 282 128 C 350 148, 412 110, 480 124"
              stroke="#A8BBA6"
              strokeOpacity="0.45"
              strokeWidth="1.5"
              fill="none"
              className="animate-air-flow-slow"
            />
            <path
              d="M 10 66 C 110 88, 196 36, 302 68 C 368 88, 420 50, 475 44"
              stroke="#C4DC91"
              strokeOpacity="0.35"
              strokeWidth="1.25"
              fill="none"
              className="animate-air-flow-slow"
            />

            {/* Atmospheric particles */}
            <g className="animate-particle-drift">
              <circle cx="92" cy="82" r="2.5" fill="#C4DC91" />
              <circle cx="212" cy="64" r="2" fill="#EEECE3" fillOpacity="0.7" />
              <circle cx="316" cy="108" r="3" fill="#C4DC91" fillOpacity="0.85" />
              <circle cx="395" cy="54" r="2" fill="#A8BBA6" />
            </g>
            <g className="animate-particle-drift-alt">
              <circle cx="144" cy="118" r="2.2" fill="#A8BBA6" fillOpacity="0.85" />
              <circle cx="268" cy="142" r="1.8" fill="#C4DC91" fillOpacity="0.75" />
              <circle cx="64" cy="146" r="1.8" fill="#EEECE3" fillOpacity="0.55" />
              <circle cx="364" cy="134" r="2.5" fill="#A8BBA6" fillOpacity="0.7" />
            </g>

            {/* Distant skyline layer */}
            <g fill="#194133" opacity="0.85">
              <rect x="18" y="198" width="38" height="102" rx="2" />
              <rect x="64" y="176" width="44" height="124" rx="2" />
              <rect x="116" y="210" width="34" height="90" rx="2" />
              <rect x="158" y="156" width="52" height="144" rx="2" />
              <rect x="218" y="188" width="42" height="112" rx="2" />
              <rect x="268" y="164" width="48" height="136" rx="2" />
              <rect x="324" y="194" width="38" height="106" rx="2" />
              <rect x="370" y="170" width="50" height="130" rx="2" />
              <rect x="426" y="206" width="34" height="94" rx="2" />
            </g>

            {/* Foreground skyline layer */}
            <g fill="#0D221B">
              <rect x="0" y="232" width="48" height="68" />
              <rect x="52" y="204" width="46" height="96" rx="2" />
              <rect x="106" y="220" width="44" height="80" rx="2" />
              <rect x="158" y="190" width="48" height="110" rx="2" />
              <rect x="212" y="216" width="54" height="84" rx="2" />
              <rect x="274" y="198" width="44" height="102" rx="2" />
              <rect x="326" y="222" width="52" height="78" rx="2" />
              <rect x="386" y="202" width="46" height="98" rx="2" />
              <rect x="438" y="230" width="24" height="70" />
            </g>

            {/* Subtle architectural lit windows */}
            <g fill="#C4DC91" fillOpacity="0.35">
              <rect x="64" y="218" width="6" height="4" rx="0.5" />
              <rect x="76" y="218" width="6" height="4" rx="0.5" />
              <rect x="64" y="230" width="6" height="4" rx="0.5" />
              <rect x="170" y="204" width="7" height="4" rx="0.5" />
              <rect x="184" y="204" width="7" height="4" rx="0.5" />
              <rect x="170" y="218" width="7" height="4" rx="0.5" />
              <rect x="284" y="212" width="6" height="4" rx="0.5" />
              <rect x="296" y="212" width="6" height="4" rx="0.5" />
              <rect x="398" y="216" width="6" height="4" rx="0.5" />
              <rect x="410" y="216" width="6" height="4" rx="0.5" />
            </g>

            {/* Tree canopy foreground silhouettes */}
            <g fill="#1B4938">
              <circle cx="36" cy="286" r="20" />
              <circle cx="58" cy="292" r="16" />
              <circle cx="240" cy="292" r="18" />
              <circle cx="262" cy="288" r="22" />
              <circle cx="418" cy="290" r="20" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
