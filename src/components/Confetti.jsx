const ITEMS = ["🎉", "⭐", "🎈", "🌟", "🎊", "🍭"];

export default function Confetti() {
  return Array.from({ length: 30 }, (_, i) => (
    <span
      key={i}
      className="confetti"
      style={{
        left: `${Math.random() * 100}%`,
        animationDuration: `${2 + Math.random() * 3}s`,
        animationDelay: `${Math.random() * 2}s`,
      }}
    >
      {ITEMS[i % ITEMS.length]}
    </span>
  ));
}
