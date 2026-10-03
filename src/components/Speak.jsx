export default function Speak({ text }) {
  const say = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };
  return (
    <button type="button" className="speak" onClick={say} aria-label="Read aloud">
      🔊
    </button>
  );
}