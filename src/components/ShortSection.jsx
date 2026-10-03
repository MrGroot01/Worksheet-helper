import Speak from "./Speak";
import { clean } from "../utils/text";

export default function ShortSection({ section, answers, setAnswer }) {
  return (
    <>
      {section.questions.map((q, n) => (
        <div className="short-q" key={q.id}>
          <div className="short-head">
            <span className="qn">{n + 1}</span>
            <b>{clean(q.text)}</b>
            <Speak text={clean(q.text)} />
          </div>
          <textarea
            rows={2}
            placeholder="✏️ Write your answer here..."
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        </div>
      ))}
    </>
  );
}