// Small stroke icons. Decorative unless a label is passed.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

function Svg({ size = 20, label, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Heart = (p) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
  </Svg>
);
export const HeartFilled = (p) => (
  <Svg {...p}>
    <path fill="currentColor" d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
  </Svg>
);
export const Shield = (p) => (
  <Svg {...p}>
    <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </Svg>
);
export const Lock = (p) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </Svg>
);
export const Check = (p) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const Sun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const Moon = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
  </Svg>
);
export const Menu = (p) => (
  <Svg {...p}>
    <path d="M4 8h16M4 16h16" />
  </Svg>
);
export const X = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const Bell = (p) => (
  <Svg {...p}>
    <path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" />
    <path d="M10 20a2 2 0 004 0" />
  </Svg>
);
export const Flag = (p) => (
  <Svg {...p}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Svg>
);
export const Phone = (p) => (
  <Svg {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
  </Svg>
);
export const Mail = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Svg>
);
export const Eye = (p) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const ThumbDown = (p) => (
  <Svg {...p}>
    <path d="M10 15v4a3 3 0 003 3l4-9V2H6.7a2 2 0 00-2 1.7l-1.4 9A2 2 0 005.3 15z" />
    <path d="M17 2h3v11h-3" />
  </Svg>
);
export const Upload = (p) => (
  <Svg {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </Svg>
);
export const Link = (p) => (
  <Svg {...p}>
    <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
  </Svg>
);

export const Printer = (p) => (
  <Svg {...p}>
    <path d="M7 9V3h10v6" />
    <rect x="3" y="9" width="18" height="8" rx="2" />
    <path d="M7 14h10v7H7z" />
  </Svg>
);
export const Home = (p) => (
  <Svg {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </Svg>
);
export const Search = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Svg>
);
export const User = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </Svg>
);
export const Chat = (p) => (
  <Svg {...p}>
    <path d="M4 5h16v11H8l-4 4z" />
  </Svg>
);
export const Download = (p) => (
  <Svg {...p}>
    <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
  </Svg>
);
export const Google = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
    />
  </svg>
);

export function Rings({ size = 38, stroke = 2.4 }) {
  return (
    <svg width={size} height={size * 0.79} viewBox="0 0 38 30" fill="none" aria-hidden="true">
      <circle cx="13" cy="15" r="10" style={{ stroke: 'var(--gold)', strokeWidth: stroke }} />
      <circle cx="25" cy="15" r="10" style={{ stroke: 'var(--rose)', strokeWidth: stroke }} />
    </svg>
  );
}

export function Silhouette({ width = 140, height = 150 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 140 150" fill="none" aria-hidden="true">
      <circle cx="70" cy="62" r="30" style={{ fill: 'var(--bg)', stroke: 'var(--gold)', strokeWidth: 1.5 }} />
      <path
        d="M12 150c3-44 30-62 58-62s55 18 58 62z"
        style={{ fill: 'var(--bg)', stroke: 'var(--gold)', strokeWidth: 1.5 }}
      />
    </svg>
  );
}
