import { useState } from "react";
import { API_KEY, scanWorksheet, gradeAnswers } from "./services/ai";
import { fileToBase64, pdfToBase64List } from "./utils/image";
import { gradeOf } from "./utils/grade";
import Loading from "./components/Loading";
import InfoScreen from "./components/InfoScreen";
import QuizScreen from "./components/QuizScreen";
import ResultScreen from "./components/ResultScreen";

const MAX_PAGES = 6;
const isPdf = (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const tidy = (v = "") => v.split("|").filter(Boolean).join(", ");

export default function App() {
  const [step, setStep] = useState("info");
  const [info, setInfo] = useState({ name: "", cls: "1", book: "", story: "" });
  const [pages, setPages] = useState([]);
  const [bookPages, setBookPages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function handleAdd(e, kind = "work") {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const current = kind === "book" ? bookPages : pages;
    const setter = kind === "book" ? setBookPages : setPages;
    setError("");
    setBusy(true);
    try {
      const added = [];
      for (const f of files) {
        if (isPdf(f)) {
          const list = await pdfToBase64List(f, MAX_PAGES);
          list.forEach((b64, i) =>
            added.push({ id: `${Date.now()}-${Math.random()}`, name: `${f.name} p${i + 1}`, b64 })
          );
        } else {
          added.push({ id: `${Date.now()}-${Math.random()}`, name: f.name, b64: await fileToBase64(f) });
        }
      }
      const all = [...current, ...added];
      if (all.length > MAX_PAGES) setError(`Only the first ${MAX_PAGES} pages are used.`);
      setter(all.slice(0, MAX_PAGES));
    } catch (err) {
      setError(err.message || "Could not read this file.");
    }
    setBusy(false);
  }

  const handleRemove = (id, kind = "work") =>
    (kind === "book" ? setBookPages : setPages)((prev) => prev.filter((p) => p.id !== id));

  async function handleStart() {
    if (!API_KEY) {
      setError("API key missing. Add VITE_API_KEY in .env and restart.");
      return;
    }
    if (!pages.length) return;
    setError("");
    setMsg("Reading your worksheet... 🔍");
    setStep("loading");
    try {
      const data = await scanWorksheet(
        pages.map((p) => p.b64),
        info,
        setMsg,
        bookPages.map((p) => p.b64)
      );
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
    setPages([]);
    setBookPages([]);
    setPaper(null);
    setResult(null);
    setAnswers({});
  }

  if (step === "loading") return <Loading message={msg} />;

  if (step === "info")
    return (
      <InfoScreen
        info={info}
        setInfo={setInfo}
        pages={pages}
        bookPages={bookPages}
        busy={busy}
        error={error}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onStart={handleStart}
      />
    );

  if (step === "quiz")
    return (
      <QuizScreen
        paper={paper}
        info={info}
        pages={pages}
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