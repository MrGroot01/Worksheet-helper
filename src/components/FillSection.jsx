import { Fragment, useState } from "react";
import Speak from "./Speak";
import { clean } from "../utils/text";
import { beep } from "../utils/sound";

const norm = (s = "") => String(s).trim().toLowerCase();

export default function FillSection({ section, answers, setAnswer }) {
  const [mode, setMode] = useState("tap"); // "tap" | "write"
  const [active, setActive] = useState(null); // { id, i }
  const [bad, setBad] = useState(null); // "qid:i"
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

  // the right answer for each blank, or null when the app can't check it
  const expOf = (q) => {
    const n = partsOf(q.text).length - 1;
    const a = q.answer || "";
    if (!a || /^\(guess\)/i.test(a) || /^e\.g\./i.test(a)) return null;
    const parts = a.split(/\s*[|,;]\s*|\s+and\s+/i).map((x) => x.trim()).filter(Boolean);
    return parts.length === n ? parts : null;
  };

  // can this question be answered by tapping a word from the box?
  const tapOk = (q) => {
    if (!words.length) return false;
    const exp = expOf(q);
    if (!exp) return true;
    return exp.every((a) => words.some((w) => norm(w) === norm(a)));
  };
  const isTap = (q) => mode === "tap" && tapOk(q);

  const flashBad = (q, i) => {
    setBad(`${q.id}:${i}`);
    setTimeout(() => setBad(null), 500);
  };

  // tap mode: returns true if the letter/word was accepted
  const put = (q, i, v) => {
    const exp = expOf(q);
    if (exp && norm(exp[i]) !== norm(v)) {
      beep(false);
      flashBad(q, i);
      return false;
    }
    if (exp) beep(true);
    setVal(q, i, v);
    return true;
  };

  // write mode: checked as soon as the last letter is typed
  const typeIn = (q, i, v) => {
    const exp = expOf(q);
    setVal(q, i, v);
    if (exp && v.trim().length >= exp[i].length) {
      if (norm(v) === norm(exp[i])) beep(true);
      else {
        beep(false);
        flashBad(q, i);
        setTimeout(() => setVal(q, i, ""), 500);
      }
    }
  };

  const tapQs = section.questions.filter(isTap);
  const tapPossible = section.questions.some(tapOk);
  const totalTapBlanks = tapQs.reduce((s, q) => s + getVals(q).length, 0);
  const reusable = words.length < totalTapBlanks; // letters like h / r repeat, words like "cake" don't
  const usedWords = reusable ? [] : tapQs.flatMap((q) => getVals(q));

  const pick = (w) => {
    let target = null;
    if (active) {
      const q = tapQs.find((x) => x.id === active.id);
      if (q) target = [q, active.i];
    }
    if (!target) {
      for (const q of tapQs) {
        const i = getVals(q).findIndex((v) => !v);
        if (i !== -1) {
          target = [q, i];
          break;
        }
      }
    }
    if (!target) return;
    if (put(target[0], target[1], w)) setActive(null);
  };

  const tapBlank = (q, i, filled, ok) => {
    if (ok) return;
    if (filled) {
      setVal(q, i, "");
      setActive({ id: q.id, i });
    } else {
      setActive((cur) => (cur && cur.id === q.id && cur.i === i ? null : { id: q.id, i }));
    }
  };

  const typeWidth = (q, i) => {
    const exp = expOf(q);
    const len = exp ? exp[i].length : 0;
    if (!len) return "6em";
    if (len <= 2) return "2.8em";
    return `${Math.min(10, Math.max(4, len * 0.7 + 2))}em`;
  };

  return (
    <>
      {tapPossible && (
        <>
          <div className="tabs">
            <button type="button" className={`tab ${mode === "tap" ? "on" : ""}`} onClick={() => setMode("tap")}>
              👆 Tap
            </button>
            <button type="button" className={`tab ${mode === "write" ? "on" : ""}`} onClick={() => setMode("write")}>
              ✏️ Write
            </button>
          </div>
          <p className="hint">
            {mode === "tap"
              ? "👆 Tap a blank, then tap a letter or word. Green means right!"
              : "✏️ Write the answer in each blank. Green means right!"}
          </p>
          <div className="chips">
            {words.map((w) => (
              <button
                key={w}
                type="button"
                disabled={mode === "write"}
                className={`chip ${mode === "write" ? "show" : ""} ${usedWords.includes(w) ? "used" : ""}`}
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
        const exp = expOf(q);
        const tap = isTap(q);
        return (
          <div className="sentence" key={q.id}>
            <span className="qn">{n + 1}</span>
            <Speak text={clean(q.text).replace(/_{2,}/g, " blank ")} />
            <span className="sentence-text">
              {parts.map((part, i) => {
                const key = `${q.id}:${i}`;
                const ok = !!exp && !!vals[i] && norm(vals[i]) === norm(exp[i]);
                const isBad = bad === key;
                return (
                  <Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && (
                      <span className="bw">
                        {tap ? (
                          <button
                            type="button"
                            className={`blank-btn ${vals[i] ? "filled" : ""} ${ok ? "ok" : ""} ${isBad ? "bad" : ""} ${
                              active && active.id === q.id && active.i === i ? "active" : ""
                            }`}
                            onClick={() => tapBlank(q, i, !!vals[i], ok)}
                          >
                            {vals[i] || "＿＿"}
                          </button>
                        ) : (
                          <input
                            className={`blank-in ${ok ? "ok" : ""} ${isBad ? "bad" : ""}`}
                            style={{ width: typeWidth(q, i) }}
                            value={vals[i]}
                            maxLength={20}
                            placeholder="✏️"
                            disabled={ok}
                            onChange={(e) => typeIn(q, i, e.target.value)}
                          />
                        )}
                        {ok && <span className="plus">+1 ⭐</span>}
                      </span>
                    )}
                  </Fragment>
                );
              })}
            </span>
          </div>
        );
      })}
    </>
  );
}