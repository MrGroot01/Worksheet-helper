import Speak from "./Speak";
import { clean } from "../utils/text";

export default function ShortSection({ section, answers, setAnswer }) {
  return (
    <>
      {section.questions.map((q, n) => {
        const many = q.count > 1;
        return (
          <div className="short-q" key={q.id}>
            <div className="short-head">
              <span className="qn">{n + 1}</span>
              <b>{clean(q.text)}</b>
              <Speak text={clean(q.text)} />
            </div>
            <textarea
              rows={many ? 4 : 2}
              placeholder={many ? `✏️ Write all ${q.count} here, with commas` : "✏️ Write your answer here..."}
              value={answers[q.id] || ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
            />
            {many && <p className="hint">Example: one, two, three</p>}
          </div>
        );
      })}
    </>
  );
}