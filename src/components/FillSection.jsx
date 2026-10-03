import { Fragment, useState } from "react";
import Speak from "./Speak";
import { clean } from "../utils/text";

export default function FillSection({ section, answers, setAnswer }) {
  const [active, setActive] = useState(null); // { id, i }
  const words = section.wordBox || [];

  const partsOf = (text) => {
    const p = clean(text).split(/_{2,}/);
    return p.length === 1 ? [p[0] + " ", ""] : p;
  };

  const getVals = (q) => {
    const n = partsOf(q.text).length - 1;
    const arr = (answers[q.id] || "").split("|");
    return Array.from({ length: n }, (_, i) => arr[i] || "");
  };

  const setVal = (q, i, v) => {
    const vals = getVals(q);
    vals[i] = v;
    setAnswer(q.id, vals.every((x) => !x) ? "" : vals.join("|"));
  };

  // tap mode only when the answer is one of the box choices
  const isTap = (q) => {
    if (!words.length) return false;
    if (!q.answer) return true;
    const parts = q.answer.split(/[|,]/).map((a) => a.trim().toLowerCase());
    return parts.every((a) => words.some((w) => w.toLowerCase() === a));
  };

  const tapQs = section.questions.filter(isTap);
  const totalTapBlanks = tapQs.reduce((s, q) => s + getVals(q).length, 0);
  const reusable = words.length < totalTapBlanks; // letters like h / r repeat, words like "cake" don't
  const usedWords = reusable ? [] : tapQs.flatMap((q) => getVals(q));

  const pick = (w) => {
    if (active) {
      const q = tapQs.find((x) => x.id === active.id);
      if (q) {
        setVal(q, active.i, w);
        setActive(null);
        return;
      }
    }
    for (const q of tapQs) {
      const vals = getVals(q);
      const i = vals.findIndex((v) => !v);
      if (i !== -1) {
        setVal(q, i, w);
        return;
      }
    }
  };

  const tapBlank = (q, i, filled) => {
    if (filled) {
      setVal(q, i, "");
      setActive({ id: q.id, i });
    } else {
      setActive((cur) => (cur && cur.id === q.id && cur.i === i ? null : { id: q.id, i }));
    }
  };

  const typeWidth = (q) => {
    const len = (q.answer || "").length;
    if (len && len <= 2) return "2.8em";
    return `${Math.min(12, Math.max(6, len * 0.75 + 2))}em`;
  };

  return (
    <>
      {tapQs.length > 0 && (
        <>
          <p className="hint">👆 Tap a blank, then tap a letter or word. Tap a filled blank to change it.</p>
          <div className="chips">
            {words.map((w) => (
              <button
                key={w}
                type="button"
                className={`chip ${usedWords.includes(w) ? "used" : ""}`}
                onClick={() => pick(w)}
              >
                {w}
              </button>
            ))}
          </div>
        </>
      )}

      {section.questions.map((q, n) => {
        const parts = partsOf(q.text);
        const vals = getVals(q);
        const tap = isTap(q);
        return (
          <div className="sentence" key={q.id}>
            <span className="qn">{n + 1}</span>
            <Speak text={clean(q.text).replace(/_{2,}/g, " blank ")} />
            <span className="sentence-text">
              {parts.map((part, i) => (
                <Fragment key={i}>
                  {part}
                  {i < parts.length - 1 &&
                    (tap ? (
                      <button
                        type="button"
                        className={`blank-btn ${vals[i] ? "filled" : ""} ${
                          active && active.id === q.id && active.i === i ? "active" : ""
                        }`}
                        onClick={() => tapBlank(q, i, !!vals[i])}
                      >
                        {vals[i] || "＿＿"}
                      </button>
                    ) : (
                      <input
                        className="blank-in"
                        style={{ width: typeWidth(q) }}
                        value={vals[i]}
                        maxLength={20}
                        placeholder="✏️"
                        onChange={(e) => setVal(q, i, e.target.value)}
                      />
                    ))}
                </Fragment>
              ))}
            </span>
          </div>
        );
      })}
    </>
  );
}