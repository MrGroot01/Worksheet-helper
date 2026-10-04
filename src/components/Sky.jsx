const CLOUDS = [
  { top: "6%", dur: 60, delay: 0, size: 90 },
  { top: "18%", dur: 80, delay: -30, size: 70 },
  { top: "32%", dur: 70, delay: -50, size: 100 },
  { top: "12%", dur: 90, delay: -70, size: 60 },
];
const FLOATS = ["🎈", "⭐", "🦋", "🎈", "🌈", "⭐", "🎈", "🦋"];

export default function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <div className="sun">☀️</div>
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{ top: c.top, fontSize: c.size, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        >
          ☁️
        </div>
      ))}
      {FLOATS.map((f, i) => (
        <div
          key={i}
          className="float"
          style={{ left: `${6 + i * 12}%`, animationDuration: `${14 + (i % 4) * 4}s`, animationDelay: `${-i * 2.3}s` }}
        >
          {f}
        </div>
      ))}
      <div className="grass" />
    </div>
  );
}