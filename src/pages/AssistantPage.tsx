import {
  Activity,
  ArrowUpRight,
  Compass,
  Home,
  Info,
  MapPin,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { AirWiseEmblem } from '../components/ui/AirWiseEmblem.tsx';
import { apiClient, type OverviewResponse } from '../services/apiClient.ts';
import type {
  AirQualityOverviewData,
  ChatMessage,
  UserProfile,
} from '../types/airwise.ts';
import {
  formatProfileContextLine,
  SUGGESTED_ASSISTANT_QUESTIONS,
} from '../utils/airwiseLogic.ts';

interface AssistantPageProps {
  profile: UserProfile;
  overview: AirQualityOverviewData | null;
  messages: ChatMessage[];
  onMessagesChange: Dispatch<SetStateAction<ChatMessage[]>>;
  onAirQualitySync: (airRes: OverviewResponse) => void;
}

function AssistantMessageBody({ message }: { message: ChatMessage }) {
  const sections = message.sections;
  const notice = message.meta?.notice ?? null;

  if (!sections || sections.length === 0) {
    return <p className="whitespace-pre-line">{message.content}</p>;
  }

  return (
    <div className="space-y-3.5">
      {sections.map((section, idx) => (
        <div key={`${message.id}-sec-${idx}`} className="space-y-2">
          {section.heading && (
            <h3 className="text-sm font-semibold tracking-tight text-[#102B22]">
              {section.heading}
            </h3>
          )}
          {section.paragraphs?.map((paragraph, pIdx) => (
            <p key={`${message.id}-p-${idx}-${pIdx}`} className="leading-relaxed text-[#252D29]">
              {paragraph}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="space-y-1.5 pl-1">
              {section.bullets.map((bullet, bIdx) => (
                <li
                  key={`${message.id}-b-${idx}-${bIdx}`}
                  className="flex items-start gap-2.5 leading-relaxed text-[#252D29]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1B4938]"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-[#D4CFC2] bg-[#F7F5EF] px-3.5 py-2.5 text-xs leading-relaxed text-[#252D29]/80">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1B4938]" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}

export function AssistantPage({
  profile,
  overview,
  messages,
  onMessagesChange,
  onAirQualitySync,
}: AssistantPageProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingStepLabel, setLoadingStepLabel] = useState(
    'Generating air-quality guidance...'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const hasVerifiedLiveOverview =
    Boolean(overview) &&
    (overview?.status === 'available' || overview?.status === 'stale');

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    setErrorMessage(null);
    setFallbackWarning(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const historySnapshot = messages
      .filter((m) => m.id !== 'welcome-message')
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    onMessagesChange((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    const activeLocation = profile.location.trim();
    setLoadingStepLabel(
      activeLocation
        ? `Checking live OpenAQ readings for ${activeLocation} & asking Gemini...`
        : 'Generating personalized guidance with Gemini...'
    );

    try {
      const { reply, airQuality } = await apiClient.sendAssistantMessage(trimmed, {
        location: activeLocation || undefined,
        history: historySnapshot,
      });

      if (airQuality) {
        onAirQualitySync(airQuality);
      }

      if (reply.meta && !reply.meta.geminiUsed && reply.meta.geminiError) {
        setFallbackWarning(reply.meta.geminiError);
      }

      onMessagesChange((prev) => [...prev, reply]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reach the assistant right now. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendQuestion(input);
  };

  return (
    <div className="space-y-6">
      {/* Signature dark evergreen identity banner */}
      <header className="relative overflow-hidden rounded-3xl bg-[#102B22] p-7 text-[#F7F5EF] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(196,220,145,0.18)_0%,transparent_70%)]"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1B4938] text-[#C4DC91]">
              <AirWiseEmblem className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#C4DC91]">
                AIRWISE AI · ENVIRONMENTAL INTELLIGENCE
              </p>
              <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-[#F7F5EF] sm:text-3xl">
                AI Assistant
              </h1>
              <p className="mt-1 text-sm text-[#A8BBA6]">
                {formatProfileContextLine(profile)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#1B4938]/70 px-4 py-3 text-xs text-[#F7F5EF]/90 lg:max-w-md">
            <Activity
              className="mt-0.5 h-4 w-4 shrink-0 text-[#C4DC91]"
              aria-hidden="true"
            />
            <p className="leading-relaxed">
              <span className="font-semibold text-[#C4DC91]">
                {hasVerifiedLiveOverview
                  ? 'Gemini AI + Live OpenAQ:'
                  : 'Gemini AI + General Guidance:'}
              </span>{' '}
              {hasVerifiedLiveOverview && overview
                ? `Grounded in verified OpenAQ observations from ${overview.stationName ?? overview.location} and tailored to your household profile.`
                : 'Combines Gemini reasoning with air-safety best practices, and automatically pulls OpenAQ readings whenever a city is selected.'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main conversational workspace */}
        <section
          aria-label="Conversation workspace"
          className="flex flex-col overflow-hidden rounded-3xl border border-[#DFDBD0] bg-white lg:col-span-8"
        >
          {/* Interactive suggested question chips */}
          <div className="border-b border-[#EEECE3] bg-[#EEECE3]/55 px-5 py-4 sm:px-6">
            <p className="text-xs font-medium text-[#1B4938]">
              Suggested questions
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {SUGGESTED_ASSISTANT_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isSending}
                  onClick={() => sendQuestion(question)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4CFC2] bg-[#F7F5EF] px-3.5 py-2 text-left text-xs font-medium text-[#102B22] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#1B4938] hover:bg-white disabled:opacity-60"
                >
                  <span>{question}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#1B4938] shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {/* Message stream */}
          <div
            ref={chatListRef}
            className="h-[460px] space-y-4 overflow-y-auto p-5 sm:p-6"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const badgeSuffix =
                msg.meta?.guidanceMode === 'gemini-live'
                  ? ' · Gemini AI + OpenAQ'
                  : msg.meta?.guidanceMode === 'gemini-general'
                    ? ' · Gemini AI (General Guidance)'
                    : msg.meta?.guidanceMode === 'live-and-general' ||
                        msg.meta?.guidanceMode === 'general-only'
                      ? ' · General Safety Fallback'
                      : '';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed sm:max-w-[85%] ${
                      isUser
                        ? 'bg-[#102B22] text-[#F7F5EF]'
                        : 'bg-[#EEECE3] text-[#252D29]'
                    }`}
                  >
                    {!isUser && (
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#1B4938]">
                        <AirWiseEmblem className="h-4 w-4 text-[#1B4938]" />
                        <span>AIRWISE AI{badgeSuffix}</span>
                      </div>
                    )}
                    {isUser ? (
                      <p>{msg.content}</p>
                    ) : (
                      <AssistantMessageBody message={msg} />
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start" aria-live="polite">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-[#EEECE3] px-4 py-3 text-xs font-medium text-[#1B4938]">
                  <span className="h-2 w-2 rounded-full bg-[#1B4938] animate-ping" />
                  <span>{loadingStepLabel}</span>
                </div>
              </div>
            )}
          </div>

          {fallbackWarning && (
            <div
              role="status"
              className="mx-6 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
            >
              {fallbackWarning}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mx-6 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800"
            >
              {errorMessage}
            </div>
          )}

          {/* Prominent composer input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[#EEECE3] bg-[#F7F5EF] p-4 sm:p-5"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-[#D4CFC2] bg-white p-1.5 pl-4 transition-colors focus-within:border-[#1B4938]">
              <label htmlFor="assistant-chat-input" className="sr-only">
                Ask AirWise AI a question
              </label>
              <input
                id="assistant-chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about outdoor play, winter smog commutes, or indoor filtration..."
                disabled={isSending}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#252D29] placeholder:text-[#252D29]/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                aria-label="Send question"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#102B22] px-4 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#1B4938] disabled:opacity-45 whitespace-nowrap"
              >
                <span>Ask</span>
                <Send className="h-3.5 w-3.5 text-[#C4DC91]" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>

        {/* Right rail: Context-aware recommendation cards */}
        <aside
          aria-label="Active profile context cards"
          className="space-y-4 lg:col-span-4"
        >
          <div className="rounded-3xl bg-[#1B4938] p-6 text-[#F7F5EF]">
            <div className="flex items-center gap-2.5 text-xs font-medium text-[#C4DC91]">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>Location Context</span>
            </div>
            <p className="mt-2 font-display text-lg font-medium">
              {profile.location || 'Location not set'}
            </p>
            {hasVerifiedLiveOverview && overview ? (
              <div className="mt-2.5 space-y-1 text-xs leading-relaxed text-[#E3ECE2]">
                <p className="font-semibold text-[#C4DC91]">
                  {overview.aqiLabel} · PM2.5 {overview.pm25Label}
                </p>
                <p className="text-[#A8BBA6]">
                  {overview.stationName} · {overview.lastUpdatedLabel}
                  {overview.isStale ? ' (Stale >24h)' : ''}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-[#A8BBA6]">
                {profile.location
                  ? 'No active OpenAQ observation is available for this location right now; answers fall back to general guidance.'
                  : 'Enter a city in the top search bar to check live OpenAQ station observations before answering.'}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[#DFDBD0] bg-[#EEECE3] p-6">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#1B4938]">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Commute Exposure Slot</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#102B22]">
              {profile.preferredCommute || 'Commute mode optional'}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#252D29]/75">
              Assistant answers factor your {profile.preferredCommute ? profile.preferredCommute.toLowerCase() : 'commute'} exposure tips alongside verified station readings when available.
            </p>
          </div>

          <div className="rounded-3xl border border-[#DFDBD0] bg-[#F7F5EF] p-6">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#1B4938]">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>Indoor Filtration &amp; Household</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#102B22]">
              {profile.indoorAirPurifier
                ? `Air purifier: ${profile.indoorAirPurifier}`
                : 'Purifier setting optional'}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#252D29]/75">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#1B4938]" aria-hidden="true" />
              <span>
                {profile.childrenInHousehold || profile.seniorCitizensInHousehold
                  ? `Children: ${profile.childrenInHousehold || '0'} · Seniors: ${profile.seniorCitizensInHousehold || '0'}`
                  : 'Add children or seniors in My Profile for household context'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
