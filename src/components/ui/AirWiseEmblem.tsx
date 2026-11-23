interface AirWiseEmblemProps {
  className?: string;
}

export function AirWiseEmblem({ className = 'h-6 w-6' }: AirWiseEmblemProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="13.5"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.25"
      />
      <path
        d="M7 13.5C10.5 10 15.5 10 19 13.5C21.2 15.7 23.6 15.5 25.5 14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6.5 19C9.8 16.5 14 16.8 17 19.2C19.6 21.3 22.8 21.2 25.5 18.8"
        stroke="#C4DC91"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="22.5" cy="9.5" r="1.75" fill="#C4DC91" />
    </svg>
  );
}
