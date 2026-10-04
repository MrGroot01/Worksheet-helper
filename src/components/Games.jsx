import { useState } from "react";
import TypingGame from "./games/TypingGame";
import BalloonGame from "./games/BalloonGame";

export default function Games() {
  const [tab, setTab] = useState("type");
  return (
    <div>
      <div className="tabs">
        <button type="button" className={`tab ${tab === "type" ? "on" : ""}`} onClick={() => setTab("type")}>
          ⌨️ Typing
        </button>
        <button type="button" className={`tab ${tab === "pop" ? "on" : ""}`} onClick={() => setTab("pop")}>
          🎈 Pop
        </button>
      </div>
      {tab === "type" ? <TypingGame /> : <BalloonGame />}
    </div>
  );
}