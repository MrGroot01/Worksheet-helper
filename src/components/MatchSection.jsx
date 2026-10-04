import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Visual from "./Visual";
import { clean } from "../utils/text";
import { beep } from "../utils/sound";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];
const norm = (s = "") => String(s).trim().toLowerCase();
const curve = (x1, y1, x2, y2) => `M${x1},${y1} C${x1 + 50},${y1} ${x2 - 50},${y2} ${x2},${y2}`;

export default function MatchSection({ section, answers, setAnswer }) {
  const boxRef = useRef(null);
  const leftRefs = useRef({});
  const rightRefs = useRef({});
  const [lines, setLines] = useState([]);
  const [active, setActive] = useState(null);
  const [drag, setDrag] = useState(null);
  const [bad, setBad] = useState(null); // { id, idx }

  const qs = section.questions;
  const options = section.options || [];
  const colorOf = (id) => COLORS[qs.findIndex((q) => q.id === id) % COLORS.length];

  const knows = (q) => options.some((o) => norm(o) === norm(q.answer));
  const locked = (q) => !!answers[q.id] && knows(q);

  const owner = {};
  qs.forEach((q) => {
    if (answers[q.id]) owner[answers[q.id]] = q.id;
  });
  const matched = qs.filter(locked).length;

  const measure = () => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const next = [];
    qs.forEach((q) => {
      const l = leftRefs.current[q.id];
      const r = rightRefs.current[answers[q.id]];
      if (!l || !r) return;
      const a = l.getBoundingClientRect();
      const b = r.getBoundingClientRect();
      next.push({
        id: q.id,
        x1: a.right - box.left,
        y1: a.top + a.height / 2 - box.top,
        x2: b.left - box.left,
        y2: b.top + b.height / 2 - box.top,
      });
    });
    setLines(next);
  };

  const measureRef = useRef(measure);
  measureRef.current = measure;

  useLayoutEffect(() => {
    measure();
  }, [answers, section]);

  useEffect(() => {
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, []);

  const connect = (q, idx) => {
    const opt = options[idx];
    if (opt === undefined || locked(q)) return;
    if (knows(q)) {
      if (norm(opt) === norm(q.answer)) {
        setAnswer(q.id, opt);
        beep(true);
      } else {
        setBad({ id: q.id, idx });
        beep(false);
        setTimeout(() => setBad(null), 600);
      }
    } else {
      // no answer key for this one: just connect it
      qs.forEach((x) => {
        if (x.id !== q.id && answers[x.id] === opt) setAnswer(x.id, "");
      });
      setAnswer(q.id, opt);
    }
  };

  const onDown = (e, q) => {
    if (locked(q)) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    const local = (ev) => {
      const b = boxRef.current.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top };
    };
    const move = (ev) => {
      if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 8) moved = true;
      if (moved) setDrag({ id: q.id, ...local(ev) });
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDrag(null);
      if (moved) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-idx]");
        if (el) connect(q, Number(el.getAttribute("data-idx")));
      } else {
        setActive((cur) => (cur === q.id ? null : q.id));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const tapRight = (idx) => {
    if (!active) return;
    const q = qs.find((x) => x.id === active);
    setActive(null);
    if (q) connect(q, idx);
  };

  let dragPath = null;
  if (drag && boxRef.current && leftRefs.current[drag.id]) {
    const box = boxRef.current.getBoundingClientRect();
    const a = leftRefs.current[drag.id].getBoundingClientRect();
    dragPath = (
      <path
        d={curve(a.right - box.left, a.top + a.height / 2 - box.top, drag.x, drag.y)}
        stroke={colorOf(drag.id)}
        strokeWidth="6"
        strokeDasharray="2 12"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  return (
    <>
      <p className="hint">👆 Tap one, then tap its match. Green means right! Or drag a line.</p>
      <div className="mt-progress">🌟 Matched {matched} of {qs.length}</div>
      <div className="match" ref={boxRef}>
        <svg className="match-svg">
          {lines.map((l) => (
            <path
              key={l.id + answers[l.id]}
              className="pencil"
              d={curve(l.x1, l.y1, l.x2, l.y2)}
              stroke="#22c55e"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
          ))}
          {dragPath}
        </svg>

        <div className="col">
          {qs.map((q, n) => (
            <div
              key={q.id}
              ref={(el) => (leftRefs.current[q.id] = el)}
              className={`tile l ${locked(q) ? "ok" : ""} ${active === q.id ? "sel" : ""} ${bad?.id === q.id ? "bad" : ""}`}
              style={{ "--c": colorOf(q.id) }}
              onPointerDown={(e) => onDown(e, q)}
            >
              <span className="badge">{n + 1}</span>
              <Visual v={clean(q.text)} base={36} size={44} />
              {locked(q) && <span className="tick">✅</span>}
            </div>
          ))}
        </div>

        <div className="col">
          {options.map((opt, idx) => {
            const ownerQ = qs.find((q) => q.id === owner[opt]);
            const own = ownerQ && locked(ownerQ);
            return (
              <div
                key={opt}
                data-idx={idx}
                ref={(el) => (rightRefs.current[opt] = el)}
                className={`tile r ${own ? "ok" : ""} ${bad?.idx === idx ? "bad" : ""}`}
                onClick={() => tapRight(idx)}
              >
                <span className="badge">{String.fromCharCode(65 + idx)}</span>
                <Visual v={opt} base={36} size={44} />
                {own && (
                  <>
                    <span className="tick">✅</span>
                    <span className="plus">+1 ⭐</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}