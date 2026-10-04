import { useEffect, useState } from "react";
import Confetti from "./Confetti";
import { clean, pretty } from "../utils/text";

function useCountUp(target, ms = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    let start;
    const tick = (t) => {
      start = start ?? t;
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const tiers = (p) =>
  p >= 90
    ? { emoji: "🏆", praise: "Superstar", color: "#f59e0b" }
    : p >= 70
    ? { emoji: "🌟", praise: "Great Job", color: "#10b981" }
    : p >= 50
    ? { emoji: "😊", praise: "Good Try", color: "#3b82f6" }
    : { emoji: "💪", praise: "Don't Give Up", color: "#ec4899" };

export default function ResultScreen({ paper, info, answers, result, onReset }) {
  const { percent, score, total, grade, map } = result;
  const points = useCountUp(score);
  const pct = useCountUp(percent);
  const t = tiers(percent);
  const stars = Math.round(percent / 20);

  if (total === 0)
    return (
      <div className="app">
        <div className="card center">
          <div className="big">🤔</div>
          <h2>Oops, {info.name}!</h2>
          <p className="sub">
            The answer key could not be made for this worksheet, so there was nothing to mark.
            Please try again with a clear, straight photo.
          </p>
          <button className="btn" onClick={onReset}>Try again 🔄</button>
        </div>
      </div>
    );

  const R = 70;
  const C = 2 * Math.PI * R;
  let n = 0;

  return (
    <div className="app">
      {percent >= 50 && <Confetti />}

      <div className="card hero">
        <div className="hero-emoji">{t.emoji}</div>
        <div className="hero-hi">{t.praise}!</div>
        <h1 className="hero-name">{info.name}</h1>
        <div className="hero-class">Class {info.cls}</div>

        <div className="ring-wrap">
          <svg viewBox="0 0 180 180" className="ring">
            <circle cx="90" cy="90" r={R} className="ring-bg" />
            <circle
              cx="90"
              cy="90"
              r={R}
              className="ring-fg"
              stroke={t.color}
              strokeDasharray={C}
              style={{ "--full": C, "--off": C * (1 - percent / 100) }}
            />
          </svg>
          <div className="ring-text">
            <b>{pct}%</b>
            <span>score</span>
          </div>
        </div>

        <div className="stars">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i < stars ? "star pop" : "star dim"} style={{ animationDelay: `${0.4 + i * 0.25}s` }}>
              ⭐
            </span>
          ))}
        </div>

        <div className="stats">
          <div className="stat"><b>{points}</b><span>Points</span></div>
          <div className="stat"><b>{total - score}</b><span>Missed</span></div>
          <div className="stat"><b>{total}</b><span>Questions</span></div>
        </div>

        <div className="medal" style={{ background: t.color }}>
          <small>Grade</small>
          <b>{grade}</b>
        </div>
      </div>

      <h2 className="rev-title">📖 Let's check your answers</h2>

      {paper.sections.map((s, si) => (
        <div className="card" key={si}>
          <div className="sec-head" style={{ background: "#7c3aed" }}>{s.title}</div>
          {s.questions.map((q) => {
            const shown = q.answer.replace(/^(\(guess\)|e\.g\.)\s*/i, "").trim();
            const skipped = !shown;
            const right = !skipped && map[q.id];
            const mine = answers[q.id];
            const label = /^e\.g\./i.test(q.answer)
              ? "Example answer: "
              : /^\(guess\)/i.test(q.answer)
              ? "Possible answer: "
              : "Correct answer: ";
            n += 1;
            return (
              <div
                key={q.id}
                className={`rcard ${skipped ? "skip" : right ? "right" : "wrong"}`}
                style={{ animationDelay: `${Math.min(n * 0.06, 1.5)}s` }}
              >
                <div className="rhead">
                  <span className="rico">{skipped ? "➖" : right ? "✅" : "❌"}</span>
                  <span className="rq">{pretty(clean(q.text) || q.visual || "")}</span>
                  <span className="pts">{skipped ? "—" : right ? "+1 ⭐" : "0"}</span>
                </div>
                <div className="rline">You wrote: <b>{pretty(mine) || "(blank)"}</b></div>
                {!skipped && !right && (
                  <div className="rfix">
                    {label}
                    <b>{pretty(shown)}</b>
                  </div>
                )}
                {skipped && <div className="rline">The answer could not be found for this one, so it is not marked.</div>}
              </div>
            );
          })}
        </div>
      ))}

      <div className="center">
        <button className="btn" onClick={onReset}>Try another worksheet 🔄</button>
      </div>
    </div>
  );
}