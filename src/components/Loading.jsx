export default function Loading({ message }) {
  return (
    <div className="app">
      <div className="card center">
        <div className="spin">🌀</div>
        <h2>{message}</h2>
      </div>
    </div>
  );
}
