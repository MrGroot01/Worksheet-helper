import { useEffect, useRef, useState } from "react";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
const LETTERS = "ABCDEFGH".split("");
const rand = (n) => Math.floor(Math.random() * n);
const pickTarget = () => LETTERS[rand(LETTERS.length)];

export default function BalloonGame() {
  const [target, setTarget] = useState(pickTarget);
  const [balloons, setBalloons] = useState([]);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const idRef = useRef(0);
  const over = time <= 0;

  useEffect(() => {
    if (over) return;
    const t = setTimeout(() => setTime((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [time, over]);

  useEffect(() => {
    if (over) {
      setBalloons([]);
      return;
    }
    const spawn = () => {
      const b = {
        id: ++idRef.current,
        letter: Math.random() < 0.4 ? target : LETTERS[rand(LETTERS.length)],
        x: 4 + Math.random() * 80,
        color: COLORS[rand(COLORS.length)],
        dur: 5 + Math.random() * 3,
      };
      setBalloons((bs) => [...bs.slice(-14), b]);
    };
    spawn();
    const s = setInterval(spawn, 850);
    return () => clearInterval(s);
  }, [over, target]);

  const upd = (id, patch) =>
    setBalloons((bs) => bs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const tap = (b) => {
    if (b.popped || over) return;
    if (b.letter === target) {
      setScore((s) => s + 1);
      upd(b.id, { popped: true });
      setTimeout(() => setBalloons((bs) => bs.filter((x) => x.id !== b.id)), 300);
    } else {
      upd(b.id, { wrong: true });
      setTimeout(() => upd(b.id, { wrong: false }), 400);
    }
  };

  const reset = () => {
    setScore(0);
    setTime(30);
    setTarget(pickTarget());
    setBalloons([]);
  };

  return (
    <div>
      <div className="tg-top">
        <span>⏱️ {time}s</span>
        <span>Pop the <b className="tgt">{target}</b>!</span>
        <span>⭐ {score}</span>
      </div>
      <div className="bgame">
        {balloons.map((b) => (
          <div
            key={b.id}
            className="bwrap"
            style={{ left: `${b.x}%`, animationDuration: `${b.dur}s` }}
            onAnimationEnd={(e) => {
              if (e.animationName === "balloonUp")
                setBalloons((bs) => bs.filter((x) => x.id !== b.id));
            }}
          >
            <div
              className={`balloon ${b.popped ? "popped" : ""} ${b.wrong ? "wrong" : ""}`}
              style={{ background: b.color }}
              onPointerDown={() => tap(b)}
            >
              {b.popped ? "💥" : b.letter}
            </div>
          </div>
        ))}
        {over && (
          <div className="bover">
            <div className="big">🎉</div>
            <h2>You popped {score} balloons!</h2>
            <button className="btn" onClick={reset}>Play again 🔄</button>
          </div>
        )}
      </div>
    </div>
  );
}