import MatchSection from "./MatchSection";
import FillSection from "./FillSection";
import ShortSection from "./ShortSection";

const COLORS = ["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];
const ICONS = { match: "🔗", fill: "✏️", short: "💬" };

export default function QuizScreen({ paper, info, answers, setAnswers, error, onSubmit }) {
  const all = paper.sections.flatMap((s) => s.questions);
  const done = all.filter((q) => (answers[q.id] || "").replace(/\|/g, "").trim()).length;
  const pct = all.length ? done / all.length : 0;
  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const [mascot, say] =
    pct === 1
      ? ["🦁", "Wow! Now press Submit!"]
      : pct >= 0.5
      ? ["🐼", "Almost there!"]
      : pct > 0
      ? ["🐰", "Great going!"]
      : ["🐯", "Let's start!"];

  return (
    <div className="app">
      <h1 className="title">{paper.title || "Worksheet"} ✏️</h1>
      <p className="sub">{info.name} • Class {info.cls}</p>

      <div className="mascot-row">
        <div className="mascot">{mascot}</div>
        <div className="bubble">{say} ({done}/{all.length})</div>
      </div>
      <div className="bar">
        <div className="fill" style={{ width: `${pct * 100}%` }} />
      </div>

      {paper.sections.map((s, i) => {
        const Section = s.type === "match" ? MatchSection : s.type === "fill" ? FillSection : ShortSection;
        return (
          <div className="card" key={i}>
            <div className="sec-head" style={{ background: COLORS[i % COLORS.length] }}>
              {ICONS[s.type] || "💬"} {s.title}
            </div>
            <Section section={s} answers={answers} setAnswer={setAnswer} />
          </div>
        );
      })}

      {error && <p className="err">⚠️ {error}</p>}
      <div className="center">
        <button className="btn green" onClick={onSubmit}>Submit ✅</button>
      </div>
    </div>
  );
}