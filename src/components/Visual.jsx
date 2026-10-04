const SHAPES = {
  square: <rect x="14" y="14" width="72" height="72" />,
  rectangle: <rect x="6" y="26" width="88" height="48" />,
  triangle: <polygon points="50,10 92,88 8,88" />,
  circle: <circle cx="50" cy="50" r="40" />,
  oval: <ellipse cx="50" cy="50" rx="44" ry="30" />,
  star: <polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38" />,
  diamond: <polygon points="50,6 92,50 50,94 8,50" />,
};
const COLORS = {
  square: "#3b82f6", rectangle: "#3b82f6", triangle: "#3b82f6", circle: "#ec4899",
  oval: "#8b5cf6", star: "#f59e0b", diamond: "#10b981",
};

export const emojiOnly = (s = "") => /^[^\p{L}\p{N}<>=+\-]+$/u.test(String(s).trim());
export const isPic = (s = "") => /^shape:/i.test(s) || emojiOnly(s);

export default function Visual({ v = "", scale = 1, base = 48, size = 64 }) {
  const m = /^shape:\s*(\w+)/i.exec(v);
  if (m) {
    const key = m[1].toLowerCase();
    if (SHAPES[key]) {
      const px = size * scale;
      return (
        <svg
          className="vshape"
          viewBox="0 0 100 100"
          width={px}
          height={px}
          fill={COLORS[key]}
          stroke="#1e3a8a"
          strokeWidth="4"
          strokeLinejoin="round"
        >
          {SHAPES[key]}
        </svg>
      );
    }
    return <span>{key}</span>;
  }
  if (v && emojiOnly(v)) return <span className="vtext" style={{ fontSize: `${base * scale}px` }}>{v}</span>;
  return <span>{v}</span>;
}