import Games from "./Games";

export default function Loading({ message }) {
  return (
    <div className="app">
      <div className="card center">
        <div className="spin small">🌀</div>
        <h2>{message}</h2>
        <p className="hint">🎮 Play a game while you wait!</p>
      </div>
      <div className="card">
        <Games />
      </div>
    </div>
  );
}