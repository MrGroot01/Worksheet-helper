import { useState } from "react";
import { API_KEY, scanWorksheet, gradeAnswers } from "./services/ai";
import { fileToBase64 } from "./utils/image";
import { gradeOf } from "./utils/grade";
import Loading from "./components/Loading";
import InfoScreen from "./components/InfoScreen";
import QuizScreen from "./components/QuizScreen";
import ResultScreen from "./components/ResultScreen";

// "a|b" -> "a, b"
const tidy = (v = "") => v.split("|").filter(Boolean).join(", ");

export default function App() {
  const [step, setStep] = useState("info");
const [info, setInfo] = useState({ name: "", cls: "1", book: "", story: "" });
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!API_KEY) {
      setError("API key missing. Add VITE_API_KEY in .env and restart.");
      return;
    }
    setError("");
    setMsg("Reading your worksheet... 🔍");
    setStep("loading");
    try {
      const b64 = await fileToBase64(file);
      const data = await scanWorksheet(b64, info);
      setPaper(data);
      setAnswers({});
      setStep("quiz");
    } catch (err) {
      setError(err.message);
      setStep("info");
    }
  }

  async function handleSubmit() {
    setError("");
    setMsg("Checking your answers... ✏️");
    setStep("loading");
    try {
      const items = paper.sections.flatMap((s) =>
        s.questions
          .filter((q) => q.answer)
          .map((q) => ({
            id: q.id,
            question: q.text,
            correct: q.answer,
            student: tidy(answers[q.id]),
          }))
      );
      const graded = await gradeAnswers(items);
      const map = Object.fromEntries(graded.results.map((r) => [r.id, r.correct]));
      const score = items.filter((i) => map[i.id]).length;
      const percent = items.length ? Math.round((score / items.length) * 100) : 0;
      setResult({ map, score, total: items.length, percent, grade: gradeOf(percent) });
      setStep("result");
    } catch (err) {
      setError(err.message);
      setStep("quiz");
    }
  }

  function handleReset() {
    setStep("info");
    setPaper(null);
    setResult(null);
    setAnswers({});
  }

  if (step === "loading") return <Loading message={msg} />;

  if (step === "info")
    return <InfoScreen info={info} setInfo={setInfo} error={error} onUpload={handleUpload} />;

  if (step === "quiz")
    return (
      <QuizScreen
        paper={paper}
        info={info}
        answers={answers}
        setAnswers={setAnswers}
        error={error}
        onSubmit={handleSubmit}
      />
    );

  const shownAnswers = Object.fromEntries(
    Object.entries(answers).map(([k, v]) => [k, tidy(v)])
  );

  return (
    <ResultScreen
      paper={paper}
      info={info}
      answers={shownAnswers}
      result={result}
      onReset={handleReset}
    />
  );
}