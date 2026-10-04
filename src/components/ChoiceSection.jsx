import { useState } from "react";
import Visual, { isPic } from "./Visual";
import Speak from "./Speak";
import { clean } from "../utils/text";
import { beep } from "../utils/sound";

const norm = (s = "") => String(s).trim().toLowerCase();
const label = (c) => (c === "T" ? "T (True)" : c === "F" ? "F (False)" : c);

export default function ChoiceSection({ section, answers, setAnswer }) {
  const [bad, setBad] = useState(null);

  const known = (q) => (q.choices || []).some((c) => norm(c) === norm(q.answer));

  const pick = (q, c) => {
    if (known(q)) {
      if (answers[q.id]) return;
      if (norm(c) === norm(q.answer)) {
        setAnswer(q.id, c);
        beep(true);
      } else {
        beep(false);
        setBad(`${q.id}|${c}`);
        setTimeout(() => setBad(null), 500);
      }
    } else {
      setAnswer(q.id, c); // no answer key for this one: just choose
    }
  };

  return (
    <>
      {section.questions.map((q, n) => {
        const sel = answers[q.id];
        const text = clean(q.text);
        const hasBlank = /_{2,}/.test(text);
        const shown = hasBlank ? text.replace(/_{2,}/, sel || "❓") : text;
        const done = known(q) && !!sel;
        return (
          <div className={`choice-q ${done ? "ok" : ""}`} key={q.id}>
            <div className="choice-head">
              <span className="qn">{n + 1}</span>
              {shown && <b>{shown}</b>}
              {shown && <Speak text={text.replace(/_{2,}/g, " blank ")} />}
              {done && <span className="plus-inline">✅ +1 ⭐</span>}
            </div>
            {q.visual && (
              <div className="choice-visual">
                <Visual v={q.visual} scale={q.scale || 1} />
              </div>
            )}
            <div className="choices">
              {(q.choices || []).map((c) => {
                const pic = isPic(c);
                const isSel = norm(sel) === norm(c);
                const key = `${q.id}|${c}`;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={done && !isSel}
                    className={`cbtn ${pic ? "pic" : ""} ${isSel ? (known(q) ? "ok" : "sel") : ""} ${bad === key ? "bad" : ""}`}
                    onClick={() => pick(q, c)}
                  >
                    {pic ? <Visual v={c} base={44} size={64} /> : label(c)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}