import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clean } from "../utils/text";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const curve = (x1, y1, x2, y2) => `M${x1},${y1} C${x1 + 50},${y1} ${x2 - 50},${y2} ${x2},${y2}`;

export default function MatchSection({ section, answers, setAnswer }) {
  const boxRef = useRef(null);
  const leftRefs = useRef({});
  const rightRefs = useRef({});
  const [lines, setLines] = useState([]);
  const [active, setActive] = useState(null);
  const [drag, setDrag] = useState(null);

  const qs = section.questions;
  const options = section.options || [];
  const colorOf = (id) => COLORS[qs.findIndex((q) => q.id === id) % COLORS.length];
  const emoji = (t) => section.emojis?.[t] || section.emojis?.[clean(t)] || "";

  const owner = {};
  qs.forEach((q) => {
    if (answers[q.id]) owner[answers[q.id]] = q.id;
  });

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

  const connect = (qid, idx) => {
    const opt = options[idx];
    if (opt === undefined) return;
    qs.forEach((q) => {
      if (q.id !== qid && answers[q.id] === opt) setAnswer(q.id, "");
    });
    setAnswer(qid, opt);
  };

  const onDown = (e, q) => {
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
        if (el) connect(q.id, Number(el.getAttribute("data-idx")));
      } else {
        setActive((cur) => (cur === q.id ? null : q.id));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const tapRight = (idx) => {
    const opt = options[idx];
    if (active) {
      connect(active, idx);
      setActive(null);
    } else if (owner[opt]) {
      setAnswer(owner[opt], "");
    }
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
      <p className="hint">👆 Tap a picture, then tap its match. Or drag a line!</p>
      <div className="match" ref={boxRef}>
        <svg className="match-svg">
          {lines.map((l) => (
            <path
              key={l.id + answers[l.id]}
              className="pencil"
              d={curve(l.x1, l.y1, l.x2, l.y2)}
              stroke={colorOf(l.id)}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          ))}
          {dragPath}
        </svg>

        <div className="col">
          {qs.map((q) => (
            <div
              key={q.id}
              ref={(el) => (leftRefs.current[q.id] = el)}
              className={`mcard left ${answers[q.id] ? "on" : ""} ${active === q.id ? "sel" : ""}`}
              style={{ "--c": colorOf(q.id) }}
              onPointerDown={(e) => onDown(e, q)}
            >
              <span className="em">{emoji(q.text)}</span>
              <span>{clean(q.text)}</span>
            </div>
          ))}
        </div>

        <div className="col">
          {options.map((opt, idx) => (
            <div
              key={opt}
              data-idx={idx}
              ref={(el) => (rightRefs.current[opt] = el)}
              className={`mcard right ${owner[opt] ? "on" : ""}`}
              style={{ "--c": owner[opt] ? colorOf(owner[opt]) : "#a78bfa" }}
              onClick={() => tapRight(idx)}
            >
              <span className="em">{emoji(opt)}</span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}